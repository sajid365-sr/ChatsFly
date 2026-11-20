import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/core/admin-auth";
import {
  getPlatformBranding,
  savePlatformBranding,
} from "@/lib/services/branding";

export async function GET() {
  try {
    const authResult = await requireAdminApi();
    if (authResult instanceof NextResponse) return authResult;

    const branding = await getPlatformBranding();
    return NextResponse.json({ success: true, branding });
  } catch (error) {
    console.error("[ADMIN_BRANDING_GET]", error);
    return NextResponse.json(
      { error: "Failed to load branding settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const authResult = await requireAdminApi();
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const branding = await savePlatformBranding(body);

    return NextResponse.json({ success: true, branding });
  } catch (error) {
    console.error("[ADMIN_BRANDING_POST]", error);
    return NextResponse.json(
      { error: "Failed to save branding settings" },
      { status: 500 }
    );
  }
}
