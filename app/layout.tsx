import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { RegionProvider } from "@/components/region-provider";
import { LocalizedClerkProvider } from "@/components/localized-clerk-provider";
import { BrandingProvider } from "@/components/branding-provider";
import { Toaster } from "sonner";
import { ConfirmModal } from "@/components/modals/confirm-modal";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ReferralTracker } from "@/components/ReferralTracker";
import { toPublicCatalogue } from "@/lib/domain/pricing-catalogue";
import { getPricingCatalogue } from "@/lib/services/pricing-catalogue";
import { getPlatformBranding } from "@/lib/services/branding";
import { generateBrandingCss } from "@/lib/domain/branding";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatsFly — Omnichannel AI Customer Support Platform",
  description:
    "ChatsFly automates customer support across Facebook, WhatsApp, and Web with state-of-the-art AI.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const regionCookie = cookieStore.get("chatsfly_region")?.value;
  const initialRegion = (regionCookie === "global" ? "global" : "bd") as "bd" | "global";

  // দাম এবং প্ল্যাটফর্ম ব্র্যান্ডিং একযোগে লোড করা হয়
  const [catalogue, branding] = await Promise.all([
    getPricingCatalogue().then(toPublicCatalogue),
    getPlatformBranding(),
  ]);

  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <style
          id="dynamic-platform-branding-styles"
          dangerouslySetInnerHTML={{ __html: generateBrandingCss(branding) }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <BrandingProvider initialBranding={branding}>
              <RegionProvider initialRegion={initialRegion} initialCatalogue={catalogue}>
                <I18nProvider>
                  <LocalizedClerkProvider>
                  {children}
                  <Toaster position="top-right" richColors />
                  <ConfirmModal />
                  <Suspense fallback={null}>
                    <ReferralTracker />
                  </Suspense>
                  </LocalizedClerkProvider>
                </I18nProvider>
              </RegionProvider>
            </BrandingProvider>
          </ThemeProvider>
      </body>
    </html>
  );
}
