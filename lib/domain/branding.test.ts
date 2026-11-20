import { describe, it, expect } from "vitest";
import {
  DEFAULT_BRANDING,
  normalizeBranding,
  hexToHsl,
  generateBrandingCss,
  PALETTE_PRESETS,
} from "./branding";

describe("Platform Branding Domain", () => {
  it("returns DEFAULT_BRANDING when input is null or undefined", () => {
    expect(normalizeBranding(null)).toEqual(DEFAULT_BRANDING);
    expect(normalizeBranding(undefined)).toEqual(DEFAULT_BRANDING);
    expect(normalizeBranding("invalid")).toEqual(DEFAULT_BRANDING);
  });

  it("normalizes partial branding config preserving defaults", () => {
    const normalized = normalizeBranding({
      siteName: "ChatsFly Pro",
    });

    expect(normalized.siteName).toBe("ChatsFly Pro");
    expect(normalized.headerLogo).toEqual(DEFAULT_BRANDING.headerLogo);
    expect(normalized.footerLogo).toEqual(DEFAULT_BRANDING.footerLogo);
    expect(normalized.palette.preset).toBe("violet");
  });

  it("handles preset palette selection", () => {
    const normalized = normalizeBranding({
      palette: {
        preset: "emerald",
      },
    });

    expect(normalized.palette).toEqual(PALETTE_PRESETS.emerald);
  });

  it("handles custom palette configuration", () => {
    const normalized = normalizeBranding({
      palette: {
        preset: "custom",
        primaryLight: "200 80% 50%",
        primaryDark: "200 80% 60%",
        gradientStart: "#00aaff",
        gradientEnd: "#0044ff",
        customHex: "#00aaff",
      },
    });

    expect(normalized.palette.preset).toBe("custom");
    expect(normalized.palette.primaryLight).toBe("200 80% 50%");
    expect(normalized.palette.primaryDark).toBe("200 80% 60%");
    expect(normalized.palette.customHex).toBe("#00aaff");
  });

  it("converts hex to hsl correctly", () => {
    expect(hexToHsl("#000000")).toBe("0 0% 0%");
    expect(hexToHsl("#ffffff")).toBe("0 0% 100%");
    // Violet #7c3aed
    const violet = hexToHsl("#7c3aed");
    expect(violet).toMatch(/26\d \d+% \d+%/);
  });

  it("generates valid CSS variables string", () => {
    const css = generateBrandingCss(DEFAULT_BRANDING);
    expect(css).toContain(":root");
    expect(css).toContain("--primary: 262 83% 58%");
    expect(css).toContain(".dark");
    expect(css).toContain("--primary: 262 83% 65%");
  });
});
