import { NextResponse, type NextRequest } from "next/server";
import { getAndSyncUser } from "@/lib/core/auth";
import { db } from "@/lib/core/db";

/**
 * Unified Payment Verification Route
 * ─────────────────────────────────────────────────────────────────────────────
 * Success page থেকে ডাকা হয়।
 * Transaction ID (sessionId / invoice_id / tran_id) দিয়ে DB থেকে gateway শনাক্ত
 * করে সংশ্লিষ্ট gateway-এর verify handler চালায়।
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAndSyncUser();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const referenceId =
      typeof body.id === "string" && body.id
        ? body.id
        : typeof body.tran_id === "string" && body.tran_id
        ? body.tran_id
        : typeof body.invoice_id === "string" && body.invoice_id
        ? body.invoice_id
        : null;

    let gateway = typeof body.gateway === "string" ? body.gateway.toLowerCase() : null;

    if (referenceId) {
      const tx = await db.paymentTransaction.findFirst({
        where: {
          sessionId: referenceId,
          ...(user ? { userId: user.userId } : {}),
        },
        select: { gateway: true },
      });
      if (tx?.gateway) {
        gateway = tx.gateway;
      }
    }

    // Reference ID prefix heuristics if not yet resolved
    if (!gateway && referenceId) {
      if (referenceId.startsWith("eps_") || referenceId.startsWith("dev_eps_")) {
        gateway = "eps";
      } else if (referenceId.startsWith("udd_") || referenceId.startsWith("inv_")) {
        gateway = "uddoktapay";
      }
    }

    // Default to EPS if still unresolved (or fallback to uddoktapay)
    if (gateway === "eps") {
      const epsVerify = await import("@/app/api/payments/eps/verify/route");
      const forwardReq = new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify({ tran_id: referenceId, ...body }),
      });
      return epsVerify.POST(forwardReq);
    }

    // UddoktaPay verify handler
    const uddoktaVerify = await import("@/app/api/payments/uddoktapay/verify/route");
    const forwardReq = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify({ invoice_id: referenceId, ...body }),
    });
    return uddoktaVerify.POST(forwardReq);
  } catch (error) {
    console.error("[PAYMENTS_VERIFY_ROUTER_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
