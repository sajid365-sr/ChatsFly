import { NextResponse } from "next/server";
import { getPlatformBranding } from "@/lib/services/branding";

export async function GET() {
  const branding = await getPlatformBranding();
  return NextResponse.json(branding, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
