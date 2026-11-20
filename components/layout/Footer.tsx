"use client";

import { PaymentGatewayBanner } from "@/components/pricing/PaymentGatewayBanner";

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24 py-10 text-center text-sm text-muted-foreground">
      <div className="max-w-7xl mx-auto px-6 space-y-6">
        <div>© {new Date().getFullYear()} DRIPLARE. All rights reserved.</div>
        <div className="max-w-5xl mx-auto">
          <PaymentGatewayBanner />
        </div>
      </div>
    </footer>
  );
}
