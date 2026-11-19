import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getAndSyncUser } from "@/lib/core/auth";
import { db } from "@/lib/core/db";
import { finalizePayment } from "@/lib/services/payments";
import {
  verifyEpsTransaction,
  buildEpsMetadata,
  isEpsConfigured,
} from "@/lib/services/eps";

/**
 * EPS Payment Verify — Success page polling
 * ─────────────────────────────────────────────────────────────────────────────
 * Success page-এ redirect হওয়ার পরে এই endpoint poll করা হয়।
 *
 * Primary verification: IPN (eps/ipn) এর মাধ্যমে হওয়া উচিত।
 * এটি fallback: IPN দেরিতে এলে বা dev environment-এ।
 *
 * Query / body params:
 *   - tran_id: আমাদের transaction ID (sessionId)
 */
export async function POST(req: Request) {
  try {
    const user = await getAndSyncUser();
    const body = await req.json().catch(() => ({}));
    const { tran_id } = body as { tran_id?: string };

    let tx = null;

    if (tran_id) {
      tx = await db.paymentTransaction.findFirst({
        where: {
          sessionId: tran_id,
          ...(user ? { userId: user.userId } : {}),
        },
      });
    } else if (user) {
      // Fallback: সর্বশেষ pending EPS transaction
      tx = await db.paymentTransaction.findFirst({
        where: { userId: user.userId, gateway: "eps", status: "pending" },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!tx) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const txMetadata: Prisma.InputJsonObject = isJsonObject(tx.metadata)
      ? (tx.metadata as Prisma.InputJsonObject)
      : {};
    const planName = typeof txMetadata.plan === "string" ? txMetadata.plan : "";

    // ইতিমধ্যে paid হয়ে গেলে সরাসরি return করো
    if (tx.paymentStatus === "paid") {
      return NextResponse.json({ payment_status: "paid", plan: planName });
    }

    // Terminal failure/cancel
    if (tx.paymentStatus === "failed" || tx.paymentStatus === "cancelled") {
      return NextResponse.json({
        payment_status: tx.paymentStatus,
        plan: planName,
      });
    }

    // ── Development bypass (sandbox / mock) ──────────────────────────────────
    const apiBase = process.env.EPS_API_BASE || "";
    const isDevMock =
      (typeof txMetadata.dev_mock === "boolean" && txMetadata.dev_mock) ||
      (typeof tx.sessionId === "string" && tx.sessionId.startsWith("dev_eps_"));

    if (
      process.env.NODE_ENV === "development" &&
      (apiBase.includes("sandbox") || isDevMock)
    ) {
      console.log("[EPS_VERIFY] Dev mock bypass — marking as paid:", tx.sessionId);
      const result = await finalizePayment({
        sessionId: tx.sessionId,
        status: "complete",
        paymentStatus: "paid",
        gateway: "eps",
      });
      return NextResponse.json({
        payment_status: "paid",
        plan: result.plan ?? planName,
      });
    }

    // ── Remote verify ─────────────────────────────────────────────────────────
    if (!isEpsConfigured()) {
      return NextResponse.json({
        payment_status: tx.paymentStatus ?? "pending",
        plan: planName,
      });
    }

    try {
      // EPS verify-এ val_id পাঠাতে হয় (tran_id নয়)
      // val_id আসে IPN-এ; না থাকলে tran_id দিয়ে চেষ্টা করা হয়
      const valId =
        typeof txMetadata.eps_val_id === "string"
          ? txMetadata.eps_val_id
          : tx.sessionId;

      const { status: remoteStatus, raw } = await verifyEpsTransaction(valId);
      const remoteMeta = buildEpsMetadata(raw);

      if (remoteStatus === "complete") {
        const result = await finalizePayment({
          sessionId: tx.sessionId,
          status: "complete",
          paymentStatus: "paid",
          gateway: "eps",
          metadata: remoteMeta,
        });
        return NextResponse.json({
          payment_status: "paid",
          plan: result.plan ?? planName,
        });
      }

      if (remoteStatus === "failed" || remoteStatus === "cancelled") {
        await db.paymentTransaction.update({
          where: { id: tx.id },
          data: {
            status: remoteStatus,
            paymentStatus: remoteStatus,
            metadata: { ...txMetadata, ...remoteMeta },
          },
        });
        return NextResponse.json({
          payment_status: remoteStatus,
          plan: planName,
        });
      }
    } catch (verifyErr) {
      console.error("[EPS_VERIFY_REMOTE_ERROR]", verifyErr);
    }

    return NextResponse.json({
      payment_status: tx.paymentStatus ?? "pending",
      plan: planName,
    });
  } catch (error) {
    console.error("[EPS_VERIFY_ERROR]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

function isJsonObject(
  value: Prisma.JsonValue | null | undefined,
): value is Prisma.JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
