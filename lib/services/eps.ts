/**
 * EPS (Easy Payment System) — Service Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Bangladesh Bank-licensed PSO (Payment System Operator)।
 * Supports: Visa, MasterCard, Amex, bKash, Nagad, Rocket, Internet Banking।
 *
 * দুটি integration mode:
 *   1. Hosted Checkout (Redirect) — আমরা এটি ব্যবহার করি (simplest, PCI-DSS safe)
 *   2. Direct API — custom UI, আমাদের দরকার নেই
 *
 * IPN (Instant Payment Notification):
 *   - EPS AES-256-CBC-তে payload encrypt করে POST করে
 *   - আমরা decrypt করে transaction finalize করি
 *
 * Docs: https://www.eps.com.bd/eps-gateway
 * SDK: https://github.com/EPS-PG/EPS_Nodejs
 */

import "server-only";
import crypto from "crypto";
import { Prisma } from "@prisma/client";

// ─── Environment helpers ──────────────────────────────────────────────────────

export function getEpsConfig() {
  const storeId = process.env.EPS_STORE_ID;
  const storePassword = process.env.EPS_STORE_PASSWORD;
  const apiBase =
    process.env.EPS_API_BASE || "https://sandbox.eps.com.bd/api/v1";
  const ipnKey = process.env.EPS_IPN_KEY || storePassword || "";

  return { storeId, storePassword, apiBase, ipnKey };
}

export function isEpsConfigured(): boolean {
  const { storeId, storePassword } = getEpsConfig();
  return Boolean(storeId && storePassword);
}

// ─── Checkout Initiation ──────────────────────────────────────────────────────

export interface EpsCheckoutParams {
  tranId: string;
  amount: number;
  currency?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  successUrl: string;
  failUrl: string;
  cancelUrl: string;
  ipnUrl: string;
  productName?: string;
  productCategory?: string;
  /** আমাদের custom metadata — EPS-এ cus_add1 field-এ পাঠানো হয় */
  metadata?: Record<string, string>;
}

export interface EpsCheckoutResponse {
  /** EPS-এর redirect URL — merchant এখানে যাবে */
  gatewayUrl: string;
  /** EPS-এর নিজের transaction reference */
  sessionKey?: string;
}

/**
 * EPS checkout session শুরু করে এবং gateway URL দেয়।
 *
 * ⚠️ EPS Hosted Checkout flow:
 *   1. আমরা POST করি EPS API-তে (init endpoint)
 *   2. EPS একটি redirect URL দেয়
 *   3. Merchant সেই URL-এ redirect হয়
 *   4. Payment শেষে EPS আমাদের successUrl/failUrl-এ redirect করে
 *   5. EPS আমাদের ipnUrl-এ encrypted IPN পাঠায়
 */
export async function initiateEpsCheckout(
  params: EpsCheckoutParams
): Promise<EpsCheckoutResponse> {
  const { storeId, storePassword, apiBase } = getEpsConfig();

  if (!storeId || !storePassword) {
    throw new Error("EPS credentials not configured (EPS_STORE_ID, EPS_STORE_PASSWORD)");
  }

  const payload = {
    store_id: storeId,
    store_passwd: storePassword,
    tran_id: params.tranId,
    total_amount: params.amount,
    currency: params.currency ?? "BDT",
    success_url: params.successUrl,
    fail_url: params.failUrl,
    cancel_url: params.cancelUrl,
    ipn_url: params.ipnUrl,
    product_name: params.productName ?? "DRIPLARE AI Subscription",
    product_category: params.productCategory ?? "SaaS",
    product_profile: "general",
    cus_name: params.customerName,
    cus_email: params.customerEmail,
    cus_phone: params.customerPhone ?? "N/A",
    cus_add1: params.metadata ? JSON.stringify(params.metadata) : "",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "NO",
    ship_name: params.customerName,
    ship_add1: "N/A",
    ship_city: "Dhaka",
    ship_country: "Bangladesh",
    value_a: params.tranId, // আমাদের session reference echo
  };

  const initUrl = `${apiBase.replace(/\/$/, "")}/payment/init`;

  const response = await fetch(initUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(
      Object.entries(payload).reduce(
        (acc, [k, v]) => ({ ...acc, [k]: String(v ?? "") }),
        {} as Record<string, string>
      )
    ).toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "unknown");
    throw new Error(`EPS init failed (HTTP ${response.status}): ${text}`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  console.log("[EPS_CHECKOUT_INIT]", {
    tran_id: params.tranId,
    status: data.status,
  });

  if (
    typeof data.status !== "string" ||
    !["SUCCESS", "success"].includes(data.status)
  ) {
    throw new Error(
      `EPS checkout init failed: ${data.failedreason ?? data.status ?? "Unknown error"}`
    );
  }

  const gatewayUrl = String(data.GatewayPageURL ?? data.gateway_url ?? "");
  if (!gatewayUrl) {
    throw new Error("EPS did not return a gateway URL");
  }

  return {
    gatewayUrl,
    sessionKey: typeof data.sessionkey === "string" ? data.sessionkey : undefined,
  };
}

// ─── IPN Decryption ──────────────────────────────────────────────────────────

/**
 * EPS-এর AES-256-CBC encrypted IPN payload decrypt করে।
 *
 * EPS IPN format:
 *   POST body: { payload: "<base64-encoded AES-256-CBC ciphertext>" }
 *
 * Key derivation:
 *   - Key: SHA-256 hash of store_passwd (32 bytes)
 *   - IV: প্রথম 16 bytes of SHA-256 hash of store_passwd
 *
 * ⚠️ এই decryption scheme EPS-এর official Node.js SDK অনুসরণ করে।
 */
export function decryptEpsIpn(
  encryptedPayload: string,
  storePassword: string
): Record<string, unknown> {
  try {
    // Key = SHA256(store_passwd) → 32 bytes
    const keyHash = crypto
      .createHash("sha256")
      .update(storePassword)
      .digest();

    // IV = প্রথম 16 bytes of SHA256(store_passwd)
    const iv = keyHash.slice(0, 16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", keyHash, iv);

    const decrypted =
      decipher.update(encryptedPayload, "base64", "utf8") +
      decipher.final("utf8");

    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `EPS IPN decryption failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

// ─── Status Normalization ─────────────────────────────────────────────────────

export type EpsNormalizedStatus =
  | "complete"
  | "failed"
  | "cancelled"
  | "pending";

/**
 * EPS-এর বিভিন্ন status string → আমাদের normalized status।
 *
 * EPS status values:
 *   VALID / VALIDATED → complete
 *   FAILED / DECLINED → failed
 *   CANCELLED / CANCEL → cancelled
 *   PENDING / PROCESSING → pending
 */
export function normalizeEpsStatus(
  data: Record<string, unknown>
): EpsNormalizedStatus {
  const raw = String(
    data.status ?? data.payment_status ?? data.tran_status ?? ""
  ).toUpperCase();

  if (["VALID", "VALIDATED", "PAID", "SUCCESS"].includes(raw)) {
    return "complete";
  }

  if (["FAILED", "FAILURE", "DECLINED", "INVALID"].includes(raw)) {
    return "failed";
  }

  if (["CANCELLED", "CANCELED", "CANCEL"].includes(raw)) {
    return "cancelled";
  }

  return "pending";
}

// ─── Metadata builder ─────────────────────────────────────────────────────────

/**
 * EPS IPN/verify response থেকে DB-তে রাখার মতো metadata তৈরি।
 */
export function buildEpsMetadata(
  data: Record<string, unknown>
): Prisma.InputJsonObject {
  return {
    ...(data.tran_id ? { eps_tran_id: String(data.tran_id) } : {}),
    ...(data.val_id ? { eps_val_id: String(data.val_id) } : {}),
    ...(data.bank_tran_id
      ? { bank_tran_id: String(data.bank_tran_id) }
      : {}),
    ...(data.card_type
      ? { payment_method: String(data.card_type).toLowerCase() }
      : {}),
    ...(data.currency ? { currency: String(data.currency) } : {}),
    eps_status: String(data.status ?? ""),
    ipn_received: true,
    ipn_received_at: new Date().toISOString(),
  };
}

// ─── Payment Verification (optional fallback) ─────────────────────────────────

/**
 * EPS-এর transaction validation API দিয়ে payment verify করে।
 *
 * ⚠️ এটি IPN-এর backup — IPN পৌঁছালে এটি দরকার নেই।
 *   Success page-এ polling-এর জন্য ব্যবহার করা হয়।
 */
export async function verifyEpsTransaction(
  tranId: string
): Promise<{ status: EpsNormalizedStatus; raw: Record<string, unknown> }> {
  const { storeId, storePassword, apiBase } = getEpsConfig();

  if (!storeId || !storePassword) {
    throw new Error("EPS credentials not configured");
  }

  const verifyUrl = `${apiBase.replace(/\/$/, "")}/payment/verify`;

  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      store_id: storeId,
      store_passwd: storePassword,
      val_id: tranId,
      format: "json",
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`EPS verify request failed (HTTP ${response.status})`);
  }

  const data = (await response.json()) as Record<string, unknown>;
  return {
    status: normalizeEpsStatus(data),
    raw: data,
  };
}
