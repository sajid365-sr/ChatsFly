"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface PaymentGatewayBannerProps {
  className?: string;
}

export function PaymentGatewayBanner({
  className = "",
}: PaymentGatewayBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`w-full max-w-2xl mx-auto rounded-2xl border border-border bg-white dark:bg-card/90 backdrop-blur-md p-2 sm:p-2.5 shadow-sm overflow-hidden ${className}`}
    >
      <div className="relative w-full aspect-[1200/180] flex items-center justify-center">
        <Image
          src="/images/eps-verified-banner.png"
          alt="Pay with EPS Easy Payment System - bKash, Nagad, Rocket, Visa, Mastercard, Amex, Internet Banking"
          fill
          sizes="(max-width: 768px) 100vw, 640px"
          className="object-contain"
          priority
        />
      </div>
    </motion.div>
  );
}
