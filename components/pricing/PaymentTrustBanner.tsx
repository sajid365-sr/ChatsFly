"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "react-i18next";
import { useRegion } from "@/components/region-provider";

export function PaymentTrustBanner() {
  const { i18n } = useTranslation("pricing");
  const { config } = useRegion();
  const isBn = i18n.language === "bn";

  if (config.paymentGateway === null) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="mt-12 rounded-3xl border border-border bg-card/60 backdrop-blur-md p-5 sm:p-6 max-w-3xl mx-auto shadow-sm"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        {/* Left security badge */}
        <div className="flex items-center gap-3 text-left">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs sm:text-sm text-foreground">
                {isBn
                  ? "১০০% নিরাপদ ও সুরক্ষিত পেমেন্ট"
                  : "100% Safe & Secure Payments"}
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Lock className="w-2 h-2" /> 256-bit SSL
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {config.paymentGateway === "eps"
                ? isBn
                  ? "EPS দ্বারা সুরক্ষিত — বাংলাদেশ ব্যাংক অনুমোদিত গেটওয়ে"
                  : "Secured by EPS — Bangladesh Bank Licensed Payment System Operator"
                : isBn
                  ? "UddoktaPay অটোমেটেড গেটওয়ে দ্বারা পরিচালিত"
                  : "Powered by UddoktaPay Automated Payment Engine"}
            </p>
          </div>
        </div>

        {/* Right compliance badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 border border-border text-[11px] font-medium text-muted-foreground self-start sm:self-center shrink-0">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          <span>
            {isBn ? "বাংলাদেশ ব্যাংক নিয়ন্ত্রিত" : "Regulated & Compliant"}
          </span>
        </div>
      </div>

      {/* Official EPS Payment Gateway Banner — Compact & Centered */}
      <div className="max-w-2xl mx-auto w-full rounded-2xl bg-white p-2 sm:p-3 shadow-sm border border-slate-200/80 dark:border-border/60">
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
      </div>
    </motion.div>
  );
}
