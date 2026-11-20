import "server-only";

import { db } from "@/lib/core/db";
import {
  DEFAULT_BRANDING,
  normalizeBranding,
  type PlatformBranding,
} from "@/lib/domain/branding";

/** Key in `PlatformSetting` table */
export const PLATFORM_BRANDING_KEY = "platform_branding";

/**
 * Public/Root Layout reader — NEVER throws.
 * Returns default branding if database query fails.
 */
export async function getPlatformBranding(): Promise<PlatformBranding> {
  try {
    const row = await db.platformSetting.findUnique({
      where: { key: PLATFORM_BRANDING_KEY },
      select: { value: true },
    });

    if (!row?.value) {
      return DEFAULT_BRANDING;
    }

    return normalizeBranding(row.value);
  } catch (error) {
    console.error("[PLATFORM_BRANDING_READ_ERROR]", error);
    return DEFAULT_BRANDING;
  }
}

/**
 * Admin saver — saves new branding config and returns normalized object.
 */
export async function savePlatformBranding(
  input: unknown
): Promise<PlatformBranding> {
  const normalized = normalizeBranding(input);

  await db.platformSetting.upsert({
    where: { key: PLATFORM_BRANDING_KEY },
    update: {
      value: normalized as unknown as object,
    },
    create: {
      key: PLATFORM_BRANDING_KEY,
      value: normalized as unknown as object,
    },
  });

  return normalized;
}
