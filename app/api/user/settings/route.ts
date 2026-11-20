import { NextResponse } from "next/server";
import { db } from "@/lib/core/db";
import { getAndSyncUser } from "@/lib/core/auth";
import type { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const user = await getAndSyncUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await db.user.findUnique({
      where: { userId: user.userId },
      select: {
        dataRetention: true,
        lastDataExportAt: true,
        supportCostPerHour: true,
        securitySettings: true,
      },
    });

    return NextResponse.json(userData);
  } catch (error) {
    console.error("[USER_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAndSyncUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dataRetention, supportCostPerHour, securitySettings } = body;

    const dataToUpdate: {
      dataRetention?: string;
      supportCostPerHour?: number;
      securitySettings?: Prisma.InputJsonValue;
    } = {};

    if (dataRetention) {
      dataToUpdate.dataRetention = String(dataRetention);
    }
    if (supportCostPerHour !== undefined) {
      dataToUpdate.supportCostPerHour = parseFloat(supportCostPerHour);
    }
    if (securitySettings !== undefined) {
      dataToUpdate.securitySettings = securitySettings as Prisma.InputJsonValue;
    }

    const updatedUser = await db.user.update({
      where: { userId: user.userId },
      data: dataToUpdate,
      select: {
        dataRetention: true,
        securitySettings: true,
        supportCostPerHour: true,
      },
    });

    return NextResponse.json({
      success: true,
      settings: updatedUser,
    });
  } catch (error) {
    console.error("[USER_SETTINGS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
