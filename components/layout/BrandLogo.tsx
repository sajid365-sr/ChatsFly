"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useBranding } from "@/components/branding-provider";

interface BrandLogoProps {
  className?: string;
  variant?: "header" | "footer";
  alt?: string;
}

export function BrandLogo({
  className = "h-9 w-auto",
  variant = "header",
  alt,
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const { branding } = useBranding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const logoConfig = variant === "footer" ? branding.footerLogo : branding.headerLogo;

  // Use light or dark mode logo based on theme
  const isDark = mounted && resolvedTheme === "dark";
  const logoSrc = isDark ? logoConfig.dark : logoConfig.light;
  const isDataUrl = logoSrc.startsWith("data:") || logoSrc.startsWith("blob:");

  return (
    <div className="inline-flex items-center">
      <Image
        src={logoSrc || (isDark ? "/header-logo-white.png" : "/header-logo-black.png")}
        alt={alt || branding.siteName || "ChatsFly"}
        height={36}
        width={120}
        className={`${className} object-contain transition-opacity duration-200`}
        priority
        unoptimized={isDataUrl}
      />
    </div>
  );
}

// Backward compatibility export
export const REMOVEDIcon = "/header-logo-black.png";
export default BrandLogo;
