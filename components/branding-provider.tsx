"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_BRANDING,
  generateBrandingCss,
  type PlatformBranding,
} from "@/lib/domain/branding";

interface BrandingContextType {
  branding: PlatformBranding;
  updateBranding: (newBranding: PlatformBranding) => void;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  updateBranding: () => {},
  refreshBranding: async () => {},
});

export function useBranding() {
  return useContext(BrandingContext);
}

interface BrandingProviderProps {
  children: React.ReactNode;
  initialBranding?: PlatformBranding;
}

export function BrandingProvider({
  children,
  initialBranding = DEFAULT_BRANDING,
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<PlatformBranding>(initialBranding);

  // Sync state if initialBranding changes
  useEffect(() => {
    if (initialBranding) {
      setBranding(initialBranding);
    }
  }, [initialBranding]);

  // Inject dynamic CSS variables into document head
  useEffect(() => {
    const styleId = "dynamic-platform-branding-styles";
    let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = generateBrandingCss(branding);
  }, [branding]);

  const updateBranding = (newBranding: PlatformBranding) => {
    setBranding(newBranding);
  };

  const refreshBranding = async () => {
    try {
      const res = await fetch("/api/platform/branding");
      if (res.ok) {
        const data = await res.json();
        setBranding(data);
      }
    } catch (err) {
      console.error("[BRANDING_REFRESH_ERROR]", err);
    }
  };

  return (
    <BrandingContext.Provider
      value={{
        branding,
        updateBranding,
        refreshBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}
