import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/core/db";

/**
 * EPS Cancel / Fail redirect handler
 * ─────────────────────────────────────────────────────────────────────────────
 * EPS payment fail বা cancel হলে এই endpoint-এ redirect করে।
 *
 * Query params (EPS পাঠায়):
 *   - tran_id: আমাদের transaction ID (sessionId)
 *   - reason: "fail" | "cancel"
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tranId =
      searchParams.get("tran_id") ||
      searchParams.get("transaction_id") ||
      searchParams.get("invoice");
    const reason = searchParams.get("reason") || "cancel";
    const { userId } = await auth();

    if (!tranId && !userId) {
      return NextResponse.redirect(
        new URL("/dashboard/payment/history", req.url)
      );
    }

    // Transaction খোঁজো এবং cancel করো
    let tx = null;

    if (tranId) {
      tx = await db.paymentTransaction.findFirst({
        where: {
          sessionId: tranId,
          ...(userId ? { userId } : {}),
        },
      });
    }

    if (!tx && userId) {
      tx = await db.paymentTransaction.findFirst({
        where: {
          userId,
          gateway: "eps",
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (tx && (tx.status === "pending" || tx.paymentStatus === "initiated")) {
      const meta = isJsonObject(tx.metadata) ? tx.metadata : {};
      await db.paymentTransaction.update({
        where: { id: tx.id },
        data: {
          status: "cancelled",
          paymentStatus: "cancelled",
          metadata: {
            ...meta,
            eps_cancel_reason: reason,
            cancelled_at: new Date().toISOString(),
          },
        },
      });
      console.log("[EPS_CANCEL] Transaction cancelled:", tx.sessionId, reason);
    }

    return NextResponse.redirect(
      new URL("/dashboard/payment/history?cancelled=true", req.url)
    );
  } catch (error) {
    console.error("[EPS_CANCEL_ERROR]", error);
    return NextResponse.redirect(
      new URL("/dashboard/payment/history", req.url)
    );
  }
}

function isJsonObject(
  value: Prisma.JsonValue | null | undefined
): value is Prisma.JsonObject {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}
