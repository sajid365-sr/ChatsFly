import { NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { finalizePayment, recordPaymentFailure } from "@/lib/services/payments";
import {
  decryptEpsIpn,
  getEpsConfig,
  normalizeEpsStatus,
  buildEpsMetadata,
} from "@/lib/services/eps";

/**
 * EPS IPN (Instant Payment Notification) Handler
 * ─────────────────────────────────────────────────────────────────────────────
 * EPS payment শেষ হলে এই endpoint-এ POST করে।
 *
 * Security:
 *   - Payload AES-256-CBC-তে encrypted (store_passwd দিয়ে key/IV)
 *   - Decrypt ব্যর্থ হলে 400 → EPS retry করে
 *
 * IPN body format:
 *   { "payload": "<base64-encoded ciphertext>" }
 *
 * Decrypted payload-এ থাকে:
 *   - tran_id: আমাদের পাঠানো tranId (sessionId)
 *   - val_id: EPS-এর validation ID
 *   - status: VALID / FAILED / CANCELLED
 *   - amount, currency, card_type, bank_tran_id, ...
 *
 * Response:
 *   EPS expects: { "status": "OK", "message": "IPN received..." }
 *   ব্যর্থ হলে EPS পরে retry করবে।
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;

    console.log("[EPS_IPN] Received IPN request");

    const { ipnKey } = getEpsConfig();

    if (!ipnKey) {
      console.error("[EPS_IPN] EPS_IPN_KEY / EPS_STORE_PASSWORD not set");
      return NextResponse.json({ error: "Gateway not configured" }, { status: 503 });
    }

    // ── Decrypt ───────────────────────────────────────────────────────────────
    // EPS দুটি format-এ IPN পাঠাতে পারে:
    //   1. Encrypted: { payload: "<base64>" }
    //   2. Plain JSON (sandbox/testing): সরাসরি tran_id, status ইত্যাদি
    let data: Record<string, unknown>;

    if (typeof body.payload === "string") {
      try {
        data = decryptEpsIpn(body.payload, ipnKey);
      } catch (decryptErr) {
        console.error("[EPS_IPN] Decryption failed:", decryptErr);
        return NextResponse.json(
          { error: "IPN decryption failed" },
          { status: 400 }
        );
      }
    } else if (typeof body.tran_id === "string") {
      // Sandbox / plain JSON mode
      console.log("[EPS_IPN] Plain JSON IPN (sandbox/test mode)");
      data = body;
    } else {
      console.warn("[EPS_IPN] Unknown IPN format:", body);
      return NextResponse.json({ status: "OK", message: "IPN format unrecognized — ignored" });
    }

    console.log("[EPS_IPN] Decrypted data:", {
      tran_id: data.tran_id,
      status: data.status,
      amount: data.amount,
    });

    const tranId = typeof data.tran_id === "string" ? data.tran_id.trim() : null;
    if (!tranId) {
      console.warn("[EPS_IPN] No tran_id in IPN payload");
      return NextResponse.json({ status: "OK", message: "No tran_id — ignored" });
    }

    const normalizedStatus = normalizeEpsStatus(data);
    const metadata = buildEpsMetadata(data);

    // ── Transaction resolve ──────────────────────────────────────────────────
    const tx = await db.paymentTransaction.findUnique({
      where: { sessionId: tranId },
      select: { id: true, sessionId: true, paymentStatus: true, grantedAt: true },
    });

    if (!tx) {
      console.warn("[EPS_IPN] Transaction not found for tran_id:", tranId);
      // EPS-কে OK বলি নইলে retry storm হতে পারে
      return NextResponse.json({ status: "OK", message: "Transaction not found — ignored" });
    }

    // ── Success ──────────────────────────────────────────────────────────────
    if (normalizedStatus === "complete") {
      await finalizePayment({
        sessionId: tranId,
        status: "complete",
        paymentStatus: "paid",
        amount: typeof data.amount === "number" ? data.amount : undefined,
        gateway: "eps",
        metadata,
      });

      console.log("[EPS_IPN] Payment finalized:", tranId);
      return NextResponse.json({
        status: "OK",
        message: "IPN received and saved successfully",
      });
    }

    // ── Failure / Cancel ─────────────────────────────────────────────────────
    if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
      await recordPaymentFailure({
        sessionId: tranId,
        reason:
          normalizedStatus === "cancelled"
            ? "Payment was cancelled by the user"
            : String(data.error ?? data.failedreason ?? "Payment failed at EPS"),
        code: typeof data.status === "string" ? data.status : undefined,
        gateway: "eps",
      });

      console.log("[EPS_IPN] Payment failure recorded:", tranId, normalizedStatus);
      return NextResponse.json({
        status: "OK",
        message: "IPN received and saved successfully",
      });
    }

    // Pending — শুধু acknowledge করি
    console.log("[EPS_IPN] Pending status, no action:", tranId);
    return NextResponse.json({ status: "OK", message: "IPN received" });
  } catch (error) {
    console.error("[EPS_IPN_ERROR]", error);
    // EPS-কে error দিলে retry করবে — intentional
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
