"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Image from "next/image";
import {
  Palette,
  Upload,
  Trash2,
  RefreshCw,
  Save,
  Sparkles,
  Eye,
  Check,
  Sun,
  Moon,
  Type,
  ImageIcon,
} from "lucide-react";
import {
  DEFAULT_BRANDING,
  PALETTE_PRESETS,
  type PalettePreset,
  type PlatformBranding,
  hexToHsl,
} from "@/lib/domain/branding";
import { readBrandLogoFile } from "@/lib/core/brand-logo-upload";
import { useBranding } from "@/components/branding-provider";

export default function BrandingAdminPage() {
  const { branding: globalBranding, updateBranding } = useBranding();
  const [form, setForm] = useState<PlatformBranding>(globalBranding || DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load from API on mount
  useEffect(() => {
    async function loadBranding() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/branding");
        if (res.ok) {
          const data = await res.json();
          if (data.branding) {
            setForm(data.branding);
          }
        }
      } catch (err) {
        console.error("Failed to load branding", err);
        toast.error("Failed to load branding settings");
      } finally {
        setLoading(false);
      }
    }
    loadBranding();
  }, []);

  const handlePresetSelect = (preset: Exclude<PalettePreset, "custom">) => {
    const paletteConfig = PALETTE_PRESETS[preset];
    setForm((prev) => ({
      ...prev,
      palette: paletteConfig,
    }));
  };

  const handleCustomColorChange = (key: "primary" | "start" | "end", hex: string) => {
    const hsl = hexToHsl(hex);
    setForm((prev) => {
      const current = prev.palette;
      return {
        ...prev,
        palette: {
          preset: "custom",
          primaryLight: key === "primary" ? hsl : current.primaryLight,
          primaryDark: key === "primary" ? hsl : current.primaryDark,
          gradientStart: key === "start" ? hex : current.gradientStart,
          gradientEnd: key === "end" ? hex : current.gradientEnd,
          customHex: key === "primary" ? hex : current.customHex,
        },
      };
    });
  };

  const handleLogoUpload = (
    section: "headerLogo" | "footerLogo",
    mode: "light" | "dark",
    file?: File
  ) => {
    if (!file) return;
    readBrandLogoFile(
      file,
      (dataUrl) => {
        setForm((prev) => ({
          ...prev,
          [section]: {
            ...prev[section],
            [mode]: dataUrl,
          },
        }));
        toast.success(`${section === "headerLogo" ? "Header" : "Footer"} ${mode} logo updated`);
      },
      (errorMsg) => {
        toast.error(errorMsg);
      }
    );
  };

  const handleResetLogo = (section: "headerLogo" | "footerLogo", mode: "light" | "dark") => {
    setForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [mode]: DEFAULT_BRANDING[section][mode],
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Failed to save branding");
      }

      const data = await res.json();
      if (data.branding) {
        setForm(data.branding);
        updateBranding(data.branding);
        toast.success("Platform branding & appearance saved successfully!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save branding settings");
    } finally {
      setSaving(false);
    }
  };

  const handleResetAll = () => {
    if (confirm("Are you sure you want to reset all branding settings to defaults?")) {
      setForm(DEFAULT_BRANDING);
      toast.info("Reset to default ChatsFly branding. Click 'Save Changes' to apply.");
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Branding & Appearance
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Customize platform identity, light/dark logos, and dynamic color palettes across the entire website.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetAll}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Form Settings (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Site Identity */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-5"
          >
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Type className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Site Identity</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={form.siteName}
                  onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                  placeholder="ChatsFly"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  placeholder="Omnichannel AI Customer Support Platform"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </motion.div>

          {/* 2. Header & Footer Logos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <ImageIcon className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Brand Logos</h2>
                <p className="text-xs text-muted-foreground">
                  Separate logos for light and dark modes (PNG or SVG with transparent background recommended)
                </p>
              </div>
            </div>

            {/* Header Logos */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Header Navigation Logo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Header Logo */}
                <LogoUploadCard
                  title="Header Logo (Light Mode)"
                  subtitle="Displayed on light header backgrounds"
                  previewBg="bg-zinc-100"
                  icon={<Sun className="h-4 w-4 text-amber-500" />}
                  logoUrl={form.headerLogo.light}
                  siteName={form.siteName}
                  onUpload={(file) => handleLogoUpload("headerLogo", "light", file)}
                  onReset={() => handleResetLogo("headerLogo", "light")}
                />

                {/* Dark Mode Header Logo */}
                <LogoUploadCard
                  title="Header Logo (Dark Mode)"
                  subtitle="Displayed on dark header backgrounds"
                  previewBg="bg-zinc-900"
                  icon={<Moon className="h-4 w-4 text-indigo-400" />}
                  logoUrl={form.headerLogo.dark}
                  siteName={form.siteName}
                  onUpload={(file) => handleLogoUpload("headerLogo", "dark", file)}
                  onReset={() => handleResetLogo("headerLogo", "dark")}
                />
              </div>
            </div>

            {/* Footer Logos */}
            <div className="pt-2 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Footer Logo</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Footer Logo */}
                <LogoUploadCard
                  title="Footer Logo (Light Mode)"
                  subtitle="Displayed on light footer"
                  previewBg="bg-zinc-100"
                  icon={<Sun className="h-4 w-4 text-amber-500" />}
                  logoUrl={form.footerLogo.light}
                  siteName={form.siteName}
                  onUpload={(file) => handleLogoUpload("footerLogo", "light", file)}
                  onReset={() => handleResetLogo("footerLogo", "light")}
                />

                {/* Dark Mode Footer Logo */}
                <LogoUploadCard
                  title="Footer Logo (Dark Mode)"
                  subtitle="Displayed on dark footer"
                  previewBg="bg-zinc-900"
                  icon={<Moon className="h-4 w-4 text-indigo-400" />}
                  logoUrl={form.footerLogo.dark}
                  siteName={form.siteName}
                  onUpload={(file) => handleLogoUpload("footerLogo", "dark", file)}
                  onReset={() => handleResetLogo("footerLogo", "dark")}
                />
              </div>
            </div>
          </motion.div>

          {/* 3. Color Palette */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <h2 className="text-base font-semibold text-foreground">Color Palette</h2>
                <p className="text-xs text-muted-foreground">
                  Select a theme palette or configure custom colors to dynamically style buttons, badges and gradients.
                </p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(
                [
                  { key: "violet", label: "Violet & Blue", start: "#7c3aed", end: "#2563eb" },
                  { key: "indigo", label: "Indigo & Cyan", start: "#4f46e5", end: "#06b6d4" },
                  { key: "emerald", label: "Emerald & Teal", start: "#059669", end: "#0d9488" },
                  { key: "rose", label: "Sunset Rose", start: "#e11d48", end: "#9333ea" },
                  { key: "blue", label: "Royal Blue", start: "#2563eb", end: "#0284c7" },
                ] as const
              ).map((preset) => {
                const isSelected = form.palette.preset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetSelect(preset.key)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-border hover:border-border/80 bg-background"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <span className="text-xs font-semibold text-foreground">
                        {preset.label}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </div>
                    <div
                      className="h-5 w-full rounded-lg shadow-inner"
                      style={{
                        background: `linear-gradient(to right, ${preset.start}, ${preset.end})`,
                      }}
                    />
                  </button>
                );
              })}

              {/* Custom Preset Button */}
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    palette: { ...prev.palette, preset: "custom" },
                  }))
                }
                className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                  form.palette.preset === "custom"
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                    : "border-border hover:border-border/80 bg-background"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <span className="text-xs font-semibold text-foreground">Custom Palette</span>
                  {form.palette.preset === "custom" && (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  )}
                </div>
                <div
                  className="h-5 w-full rounded-lg shadow-inner flex items-center justify-center text-[10px] text-muted-foreground bg-muted"
                >
                  Custom Pickers
                </div>
              </button>
            </div>

            {/* Custom Palette Controls */}
            {form.palette.preset === "custom" && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                <span className="text-xs font-semibold text-foreground">
                  Custom Color Controls
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Primary Theme Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.palette.customHex || "#7c3aed"}
                        onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer border border-border bg-transparent"
                      />
                      <input
                        type="text"
                        value={form.palette.customHex || "#7c3aed"}
                        onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                        className="w-full text-xs font-mono rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Gradient Start Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.palette.gradientStart || "#7c3aed"}
                        onChange={(e) => handleCustomColorChange("start", e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer border border-border bg-transparent"
                      />
                      <input
                        type="text"
                        value={form.palette.gradientStart || "#7c3aed"}
                        onChange={(e) => handleCustomColorChange("start", e.target.value)}
                        className="w-full text-xs font-mono rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Gradient End Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.palette.gradientEnd || "#2563eb"}
                        onChange={(e) => handleCustomColorChange("end", e.target.value)}
                        className="h-9 w-12 rounded cursor-pointer border border-border bg-transparent"
                      />
                      <input
                        type="text"
                        value={form.palette.gradientEnd || "#2563eb"}
                        onChange={(e) => handleCustomColorChange("end", e.target.value)}
                        className="w-full text-xs font-mono rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column: Live Interactive Preview (1 col) */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="sticky top-6 rounded-2xl border border-border bg-card p-6 shadow-xs space-y-6"
          >
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-foreground">Live Theme Preview</h2>
            </div>

            {/* Gradient Header Banner */}
            <div
              className="rounded-xl p-4 text-white text-center shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${form.palette.gradientStart}, ${form.palette.gradientEnd})`,
              }}
            >
              <div className="text-xs uppercase tracking-widest font-semibold opacity-90">
                {form.siteName}
              </div>
              <div className="text-sm font-medium mt-1 opacity-95">
                {form.tagline}
              </div>
            </div>

            {/* Preview Components */}
            <div className="space-y-4 pt-2">
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground block mb-2">
                  Button & Gradient Styling
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    style={{
                      background: `linear-gradient(to right, ${form.palette.gradientStart}, ${form.palette.gradientEnd})`,
                    }}
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
                  >
                    Get Started Free
                  </button>
                  <button
                    type="button"
                    style={{
                      borderColor: form.palette.gradientStart,
                      color: form.palette.gradientStart,
                    }}
                    className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-primary/5"
                  >
                    Live Demo
                  </button>
                </div>
              </div>

              {/* Sample Badge */}
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground block mb-2">
                  Active Badge
                </span>
                <span
                  style={{
                    backgroundColor: `${form.palette.gradientStart}15`,
                    color: form.palette.gradientStart,
                    borderColor: `${form.palette.gradientStart}30`,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                >
                  <Sparkles className="h-3 w-3" />
                  AI Agent Powered
                </span>
              </div>

              {/* Header Logo Live Preview Box */}
              <div>
                <span className="text-xs font-semibold uppercase text-muted-foreground block mb-2">
                  Logo in Light & Dark Mode
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] text-zinc-500 mb-1">Light Mode</span>
                    <Image
                      src={form.headerLogo.light}
                      alt={form.siteName}
                      width={100}
                      height={28}
                      className="h-7 w-auto object-contain"
                      unoptimized={form.headerLogo.light.startsWith("data:")}
                    />
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] text-zinc-400 mb-1">Dark Mode</span>
                    <Image
                      src={form.headerLogo.dark}
                      alt={form.siteName}
                      width={100}
                      height={28}
                      className="h-7 w-auto object-contain"
                      unoptimized={form.headerLogo.dark.startsWith("data:")}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

interface LogoUploadCardProps {
  title: string;
  subtitle: string;
  previewBg: string;
  icon: React.ReactNode;
  logoUrl: string;
  siteName: string;
  onUpload: (file?: File) => void;
  onReset: () => void;
}

function LogoUploadCard({
  title,
  subtitle,
  previewBg,
  icon,
  logoUrl,
  siteName,
  onUpload,
  onReset,
}: LogoUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDataUrl = logoUrl.startsWith("data:") || logoUrl.startsWith("blob:");

  return (
    <div className="rounded-xl border border-border bg-background p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {icon}
          {title}
        </div>
        <button
          type="button"
          onClick={onReset}
          title="Reset to default logo"
          className="text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className={`h-20 w-full rounded-lg ${previewBg} flex items-center justify-center p-3 border border-border/50`}
      >
        <Image
          src={logoUrl}
          alt={siteName}
          width={120}
          height={32}
          className="max-h-12 w-auto object-contain"
          unoptimized={isDataUrl}
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/jpeg"
        className="hidden"
        onChange={(e) => onUpload(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Upload className="h-3.5 w-3.5" />
        Upload New Logo
      </button>
      <p className="text-[10px] text-muted-foreground text-center">{subtitle}</p>
    </div>
  );
}
