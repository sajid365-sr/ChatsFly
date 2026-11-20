import { NextResponse, type NextRequest } from "next/server";
import { getAndSyncUser } from "@/lib/core/auth";
import { getRegionConfig, normalizeRegion } from "@/lib/core/region";

/**
 * Unified Charge Route — Gateway Router
 * ─────────────────────────────────────────────────────────────────────────────
 * এই endpoint gateway-agnostic। Region config-এর `paymentGateway` দেখে
 * সঠিক gateway-এর charge route-এ internally forward করে।
 *
 * Client সবসময় POST /api/payments/charge করবে।
 * কোন gateway ব্যবহার হচ্ছে সেটি client-এর জানার দরকার নেই।
 *
 * ⚠️ User-এর region DB থেকে পড়া হয় (cookie জাল করা যায়)।
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAndSyncUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const region = normalizeRegion(user.region);
    const regionConfig = getRegionConfig(region);
    const gateway = regionConfig.paymentGateway;

    if (!gateway) {
      return NextResponse.json(
        { error: "Payment is not available in your region." },
        { status: 403 }
      );
    }

    // Body একবার পড়া হয়; internal route-এ পাঠানোর জন্য clone করি
    const body = await req.json();

    const targetPath =
      gateway === "eps"
        ? "/api/payments/eps/charge"
        : "/api/payments/uddoktapay/charge";

    // Internal forward — same process, no HTTP round-trip
    const internalUrl = new URL(targetPath, req.url);

    const internalReq = new Request(internalUrl.toString(), {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(body),
    });

    // Dynamically import the correct handler
    let handler: { POST: (req: Request) => Promise<Response> };

    if (gateway === "eps") {
      handler = await import("@/app/api/payments/eps/charge/route");
    } else {
      handler = await import("@/app/api/payments/uddoktapay/charge/route");
    }

    return handler.POST(internalReq);
  } catch (error) {
    console.error("[PAYMENTS_CHARGE_ROUTER]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
