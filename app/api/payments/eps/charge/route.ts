import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getAndSyncUser } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { type Region } from "@/lib/core/region";
import { normalizeCycle } from "@/lib/domain/billing-cycle";
import { getPaymentPackage, isPackageAllowedForPlan } from "@/lib/domain/payment-packages";
import { getPlanIfDefined } from "@/lib/domain/plan-config";
import {
  MIN_CHECKOUT_AMOUNT,
  findCoupon,
  normalizeCatalogue,
  resolveCheckoutAmount,
  resolveListPrice,
  resolveTopUpPrice,
  validateCoupon,
  type PricingCatalogue,
} from "@/lib/domain/pricing-catalogue";
import { countCouponRedemptions, getPricingCatalogue } from "@/lib/services/pricing-catalogue";
import { initiateEpsCheckout, isEpsConfigured } from "@/lib/services/eps";

/**
 * EPS (Easy Payment System) Checkout — BD Region
 * ─────────────────────────────────────────────────────────────────────────────
 * UddoktaPay charge route-এর মতো একই নিরাপত্তা নীতি:
 *   - Client থেকে পাঠানো কোনো amount গ্রহণ করা হয় না।
 *   - দাম server-এ পুনরায় গণনা হয় (catalogue + cycle + coupon)।
 *   - MIN_CHECKOUT_AMOUNT floor থাকে।
 *
 * EPS flow:
 *   1. POST এই endpoint-এ → transaction DB-তে তৈরি হয়
 *   2. EPS API-তে init request → gateway URL পাওয়া যায়
 *   3. Merchant সেই URL-এ redirect হয়
 *   4. Payment-এর পর EPS → IPN (encrypted) → /api/payments/eps/ipn
 *   5. EPS → redirect → /dashboard/payment/success?gateway=eps&tran_id=...
 */

async function readCatalogue(): Promise<PricingCatalogue> {
  return normalizeCatalogue(await getPricingCatalogue());
}

export async function POST(req: Request) {
  try {
    const user = await getAndSyncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isEpsConfigured()) {
      // ── Dev / Sandbox bypass ─────────────────────────────────────────────
      // EPS credentials এখনো .env-এ সেট করা হয়নি।
      // Development mode-এ একটি mock checkout redirect তৈরি করা হয় যাতে
      // merchant UI flow test করতে পারেন।
      if (process.env.NODE_ENV === "development") {
        const body = await req.json();
        const { package_id, origin_url } = body;
        const cycle = normalizeCycle(body.cycle);
        const paymentPackage = getPaymentPackage(package_id);

        if (!paymentPackage || paymentPackage.currency !== "bdt") {
          return NextResponse.json({ error: "Invalid BDT package" }, { status: 400 });
        }

        const origin = String(origin_url || "").replace(/\/$/, "");
        if (!origin) {
          return NextResponse.json({ error: "origin_url is required" }, { status: 400 });
        }

        // Dev mock transaction ID
        const mockTranId = `dev_eps_${Date.now()}`;

        // DB-তে pending transaction তৈরি করা হয় (mock)
        await db.paymentTransaction.create({
          data: {
            sessionId: mockTranId,
            userId: user.userId,
            packageId: package_id,
            amount: paymentPackage.amount,
            currency: "bdt",
            gateway: "eps",
            paymentStatus: "initiated",
            status: "pending",
            metadata: {
              plan: paymentPackage.plan,
              cycle,
              dev_mock: true,
            },
          },
        });

        console.warn(
          "[EPS_CHARGE] ⚠️  DEV MOCK MODE — EPS credentials not configured.\n" +
          "  Set EPS_STORE_ID and EPS_STORE_PASSWORD in .env to use real gateway.\n" +
          "  Redirecting to mock success page for UI testing."
        );

        // Mock success URL — পেমেন্ট পেজে simulate করা হয়
        const mockUrl = `${origin}/dashboard/payment/success?gateway=eps&tran_id=${encodeURIComponent(mockTranId)}&dev_mock=1`;

        return NextResponse.json({
          url: mockUrl,
          tran_id: mockTranId,
          amount: paymentPackage.amount,
          discount: 0,
          _dev_mock: true,
        });
      }

      // Production-এ credentials না থাকলে স্পষ্ট error
      return NextResponse.json(
        { error: "Payment gateway is not configured. Please contact support." },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { package_id, origin_url, coupon_code } = body;

    // cycle — অজানা/typo মান মাসিক থাকে
    const cycle = normalizeCycle(body.cycle);

    const paymentPackage = getPaymentPackage(package_id);
    const region = (user.region || "bd") as Region;

    if (!paymentPackage || paymentPackage.currency !== "bdt") {
      return NextResponse.json({ error: "Invalid BDT package" }, { status: 400 });
    }

    // Entitlement gate — টাকা কাটার আগেই আটকানো হয়
    if (!isPackageAllowedForPlan(package_id, user.plan, region)) {
      return NextResponse.json(
        { error: "This package is not available on your current plan." },
        { status: 403 }
      );
    }

    const catalogue = await readCatalogue();
    const isTopUp = paymentPackage.isTopUp === true;
    const scope = isTopUp ? ("topup" as const) : ("plan" as const);

    // List price — catalogue override বা package default
    let listAmount = paymentPackage.amount;

    if (isTopUp) {
      listAmount = resolveTopUpPrice(package_id, paymentPackage.amount, catalogue);
    } else {
      const planConfig = getPlanIfDefined(region, String(paymentPackage.plan));
      if (planConfig) {
        const resolved = resolveListPrice(planConfig, region, cycle, catalogue, "en");
        if (resolved.isCustom) {
          return NextResponse.json(
            { error: "This plan is priced on request — please contact us." },
            { status: 403 }
          );
        }
        listAmount = resolved.amount;
      }
    }

    // Coupon validation
    const coupon =
      typeof coupon_code === "string" && coupon_code.trim()
        ? findCoupon(catalogue, coupon_code)
        : null;

    if (typeof coupon_code === "string" && coupon_code.trim()) {
      const verdict = validateCoupon(coupon, {
        scope,
        redemptions: await countCouponRedemptions(coupon_code),
        now: new Date(),
      });

      if (!verdict.ok) {
        return NextResponse.json(
          { error: couponErrorMessage(verdict.reason) },
          { status: 400 }
        );
      }
    }

    const priced = resolveCheckoutAmount({
      listAmount,
      region,
      scope,
      catalogue,
      coupon,
    });

    if (priced.finalAmount < MIN_CHECKOUT_AMOUNT) {
      return NextResponse.json(
        { error: "Checkout amount too low." },
        { status: 400 }
      );
    }

    const origin = String(origin_url || "").replace(/\/$/, "");
    if (!origin) {
      return NextResponse.json({ error: "origin_url is required" }, { status: 400 });
    }

    // Unique transaction ID — EPS-এ পাঠানো হয় এবং IPN-এ echo হয়ে ফেরে
    const tranId = `eps_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

    // EPS checkout init
    const eps = await initiateEpsCheckout({
      tranId,
      amount: priced.finalAmount,
      currency: "BDT",
      customerName: user.name || "User",
      customerEmail: user.email,
      successUrl: `${origin}/dashboard/payment/success?gateway=eps&tran_id=${encodeURIComponent(tranId)}`,
      failUrl: `${origin}/api/payments/eps/cancel?tran_id=${encodeURIComponent(tranId)}&reason=fail`,
      cancelUrl: `${origin}/api/payments/eps/cancel?tran_id=${encodeURIComponent(tranId)}&reason=cancel`,
      ipnUrl: `${origin}/api/payments/eps/ipn`,
      productName: paymentPackage.label,
      metadata: {
        user_id: user.userId,
        package_id,
        plan: paymentPackage.plan,
        cycle,
        ...(coupon ? { coupon: coupon.code } : {}),
      },
    });

    // DB-তে transaction তৈরি (gateway-পরবর্তী)
    await db.paymentTransaction.create({
      data: {
        sessionId: tranId,
        userId: user.userId,
        packageId: package_id,
        amount: priced.finalAmount,
        currency: paymentPackage.currency,
        gateway: "eps",
        paymentStatus: "initiated",
        status: "pending",
        metadata: {
          plan: paymentPackage.plan,
          cycle,
          listAmount: priced.listAmount,
          discountAmount: priced.discountAmount,
          ...(eps.sessionKey ? { eps_session_key: eps.sessionKey } : {}),
          ...(coupon
            ? { couponCode: coupon.code, discountPercent: coupon.percentOff ?? null }
            : {}),
        },
      },
    });

    console.log("[EPS_CHARGE] Transaction created:", tranId);

    return NextResponse.json({
      url: eps.gatewayUrl,
      tran_id: tranId,
      amount: priced.finalAmount,
      discount: priced.discountAmount,
    });
  } catch (error) {
    console.error("[EPS_CHARGE_ERROR]", error);
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function couponErrorMessage(reason: string | undefined): string {
  switch (reason) {
    case "not_found":
      return "That coupon code does not exist.";
    case "inactive":
      return "That coupon code is no longer active.";
    case "expired":
      return "That coupon code has expired.";
    case "limit_reached":
      return "That coupon code has reached its usage limit.";
    case "not_applicable":
      return "That coupon code cannot be used for this purchase.";
    default:
      return "That coupon code could not be applied.";
  }
}
