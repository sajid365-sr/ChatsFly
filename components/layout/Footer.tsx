"use client";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { PaymentGatewayBanner } from "@/components/pricing/PaymentGatewayBanner";
import { useBranding } from "@/components/branding-provider";

export default function Footer() {
  const { branding } = useBranding();
  const siteName = branding.siteName || "ChatsFly";

  return (
    <footer className="border-t border-border mt-24 py-12 text-center text-sm text-muted-foreground bg-background/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 space-y-6 flex flex-col items-center">
        <div className="flex items-center justify-center">
          <BrandLogo variant="footer" className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity" />
        </div>
        <div>
          © {new Date().getFullYear()} {siteName.toUpperCase()}. All rights reserved.
        </div>
        <div className="max-w-5xl mx-auto w-full pt-2">
          <PaymentGatewayBanner />
        </div>
      </div>
    </footer>
  );
}
