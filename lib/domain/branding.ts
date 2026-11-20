/**
 * Platform Branding & Appearance Domain Model
 * ─────────────────────────────────────────────────────────────────────────────
 * Central definition of platform identity: site name, header & footer logos
 * (separate for light and dark modes), and color palette.
 */

export type PalettePreset =
  | "violet"
  | "indigo"
  | "emerald"
  | "rose"
  | "blue"
  | "custom";

export interface PaletteConfig {
  preset: PalettePreset;
  /** HSL string without hsl(), e.g. "262 83% 58%" */
  primaryLight: string;
  /** HSL string for dark mode, e.g. "262 83% 65%" */
  primaryDark: string;
  /** Gradient start color in Hex or HSL */
  gradientStart: string;
  /** Gradient end color in Hex or HSL */
  gradientEnd: string;
  /** Optional hex for custom color picker */
  customHex?: string;
}

export interface LogoConfig {
  /** Logo for light background */
  light: string;
  /** Logo for dark background */
  dark: string;
}

export interface PlatformBranding {
  siteName: string;
  tagline: string;
  headerLogo: LogoConfig;
  footerLogo: LogoConfig;
  faviconUrl?: string;
  palette: PaletteConfig;
}

export const PALETTE_PRESETS: Record<Exclude<PalettePreset, "custom">, PaletteConfig> = {
  violet: {
    preset: "violet",
    primaryLight: "262 83% 58%",
    primaryDark: "262 83% 65%",
    gradientStart: "#7c3aed",
    gradientEnd: "#2563eb",
  },
  indigo: {
    preset: "indigo",
    primaryLight: "234 89% 64%",
    primaryDark: "234 89% 72%",
    gradientStart: "#4f46e5",
    gradientEnd: "#06b6d4",
  },
  emerald: {
    preset: "emerald",
    primaryLight: "158 64% 42%",
    primaryDark: "158 64% 52%",
    gradientStart: "#059669",
    gradientEnd: "#0d9488",
  },
  rose: {
    preset: "rose",
    primaryLight: "346 84% 53%",
    primaryDark: "346 84% 63%",
    gradientStart: "#e11d48",
    gradientEnd: "#9333ea",
  },
  blue: {
    preset: "blue",
    primaryLight: "221 83% 53%",
    primaryDark: "221 83% 63%",
    gradientStart: "#2563eb",
    gradientEnd: "#0284c7",
  },
};

export const DEFAULT_BRANDING: PlatformBranding = {
  siteName: "ChatsFly",
  tagline: "Omnichannel AI Customer Support Platform",
  headerLogo: {
    light: "/header-logo-black.png",
    dark: "/header-logo-white.png",
  },
  footerLogo: {
    light: "/header-logo-black.png",
    dark: "/header-logo-white.png",
  },
  palette: PALETTE_PRESETS.violet,
};

/**
 * Converts Hex string (#RRGGBB) to HSL components "H S% L%"
 */
export function hexToHsl(hex: string): string {
  let cleaned = hex.replace("#", "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  if (cleaned.length !== 6) return "262 83% 58%";

  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Normalizes any unknown input into a valid PlatformBranding object.
 */
export function normalizeBranding(raw: unknown): PlatformBranding {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_BRANDING;
  }

  const record = raw as Record<string, unknown>;

  const siteName =
    typeof record.siteName === "string" && record.siteName.trim()
      ? record.siteName.trim()
      : DEFAULT_BRANDING.siteName;

  const tagline =
    typeof record.tagline === "string"
      ? record.tagline.trim()
      : DEFAULT_BRANDING.tagline;

  const rawHeader = record.headerLogo as Record<string, unknown> | undefined;
  const headerLogo: LogoConfig = {
    light:
      typeof rawHeader?.light === "string" && rawHeader.light.trim()
        ? rawHeader.light.trim()
        : DEFAULT_BRANDING.headerLogo.light,
    dark:
      typeof rawHeader?.dark === "string" && rawHeader.dark.trim()
        ? rawHeader.dark.trim()
        : DEFAULT_BRANDING.headerLogo.dark,
  };

  const rawFooter = record.footerLogo as Record<string, unknown> | undefined;
  const footerLogo: LogoConfig = {
    light:
      typeof rawFooter?.light === "string" && rawFooter.light.trim()
        ? rawFooter.light.trim()
        : DEFAULT_BRANDING.footerLogo.light,
    dark:
      typeof rawFooter?.dark === "string" && rawFooter.dark.trim()
        ? rawFooter.dark.trim()
        : DEFAULT_BRANDING.footerLogo.dark,
  };

  const rawPalette = record.palette as Record<string, unknown> | undefined;
  let palette: PaletteConfig = DEFAULT_BRANDING.palette;

  if (rawPalette && typeof rawPalette.preset === "string") {
    const preset = rawPalette.preset as PalettePreset;
    if (preset in PALETTE_PRESETS) {
      palette = PALETTE_PRESETS[preset as Exclude<PalettePreset, "custom">];
    } else if (preset === "custom") {
      const primaryLight =
        typeof rawPalette.primaryLight === "string" && rawPalette.primaryLight.trim()
          ? rawPalette.primaryLight.trim()
          : DEFAULT_BRANDING.palette.primaryLight;
      const primaryDark =
        typeof rawPalette.primaryDark === "string" && rawPalette.primaryDark.trim()
          ? rawPalette.primaryDark.trim()
          : primaryLight;
      const gradientStart =
        typeof rawPalette.gradientStart === "string" && rawPalette.gradientStart.trim()
          ? rawPalette.gradientStart.trim()
          : DEFAULT_BRANDING.palette.gradientStart;
      const gradientEnd =
        typeof rawPalette.gradientEnd === "string" && rawPalette.gradientEnd.trim()
          ? rawPalette.gradientEnd.trim()
          : DEFAULT_BRANDING.palette.gradientEnd;

      palette = {
        preset: "custom",
        primaryLight,
        primaryDark,
        gradientStart,
        gradientEnd,
        customHex: typeof rawPalette.customHex === "string" ? rawPalette.customHex : undefined,
      };
    }
  }

  return {
    siteName,
    tagline,
    headerLogo,
    footerLogo,
    faviconUrl:
      typeof record.faviconUrl === "string" ? record.faviconUrl.trim() : undefined,
    palette,
  };
}

/**
 * Generates dynamic CSS variables to override theme variables across the site.
 */
export function generateBrandingCss(branding: PlatformBranding): string {
  const { palette } = branding;
  return `
    :root {
      --primary: ${palette.primaryLight};
      --ring: ${palette.primaryLight};
      --gradient-start: ${palette.primaryLight};
    }
    .dark {
      --primary: ${palette.primaryDark};
      --ring: ${palette.primaryDark};
      --gradient-start: ${palette.primaryDark};
    }
  `.replace(/\s+/g, " ").trim();
}
