"use client";

import { motion } from "framer-motion";
import { Check, Minus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePricing } from "@/components/region-provider";
import { resolveLocalStr, type PlanConfig } from "@/lib/domain/plan-config";

export function FeatureMatrix() {
  const { i18n } = useTranslation(["pricing", "common"]);
  const { plans } = usePricing();
  const isBn = i18n.language === "bn";
  const lang = i18n.language;

  // Comparison categories & features
  const categories = [
    {
      title: isBn ? "কোর ক্ষমতা ও এআই চ্যাটবট" : "Core Limits & AI Chatbots",
      rows: [
        {
          label: isBn ? "সক্রিয় চ্যাটবট / এআই এজেন্ট" : "Active AI Chatbots",
          values: (plan: PlanConfig) =>
            plan.maxChatbots === Infinity
              ? isBn ? "সীমাহীন" : "Unlimited"
              : isBn ? `${plan.maxChatbots}টি` : `${plan.maxChatbots}`,
        },
        {
          label: isBn ? "চ্যাটবট প্রতি ইন্টিগ্রেশন" : "Integrations per Chatbot",
          values: (plan: PlanConfig) =>
            plan.maxIntegrationsPerChatbot === Infinity
              ? isBn ? "সীমাহীন" : "Unlimited"
              : isBn ? `${plan.maxIntegrationsPerChatbot}টি` : `${plan.maxIntegrationsPerChatbot}`,
        },
        {
          label: isBn ? "ফ্রি মাসিক এআই ক্রেডিট" : "Monthly Free AI Credits",
          values: (plan: PlanConfig) =>
            plan.includedCredits === Infinity
              ? isBn ? "সীমাহীন" : "Unlimited"
              : `${plan.includedCredits.toLocaleString()} ${isBn ? "ক্রেডিট" : "Credits"}`,
        },
        {
          label: isBn ? "কোটার পরে ক্রেডিট রেট" : "Per-credit Rate after Quota",
          values: (plan: PlanConfig) =>
            plan.contact
              ? isBn ? "কাস্টম" : "Custom"
              : resolveLocalStr(plan.perCreditLabel, lang),
        },
        {
          label: isBn ? "ফ্রি ট্রায়াল" : "Free Trial",
          values: (plan: PlanConfig) =>
            plan.trialDays
              ? isBn ? `${plan.trialDays} দিনের ফ্রি ট্রায়াল` : `${plan.trialDays}-day free trial`
              : false,
        },
      ],
    },
    {
      title: isBn ? "মেসেজিং চ্যানেল ও সাপোর্ট" : "Channels & Supported Platforms",
      rows: [
        {
          label: isBn ? "ফেসবুক মেসেঞ্জার (Facebook Messenger)" : "Facebook Messenger",
          values: () => true,
        },
        {
          label: isBn ? "ওয়েবসাইট চ্যাট উইজেট (Web Widget)" : "Website Chat Widget",
          values: () => true,
        },
        {
          label: isBn ? "হোয়াটসঅ্যাপ অটোমেশন (WhatsApp Business API)" : "WhatsApp Business Automation",
          values: (plan: PlanConfig) => plan.key !== "starter",
        },
        {
          label: isBn ? "ইনস্টাগ্রাম ডিএম (Instagram DM Automation)" : "Instagram DM Automation",
          values: (plan: PlanConfig) => plan.key !== "starter",
        },
      ],
    },
    {
      title: isBn ? "ই-কমার্স ও ডেলিভারি অটোমেশন" : "E-Commerce & Courier Automation",
      rows: [
        {
          label: isBn ? "স্বয়ংক্রিয় অর্ডার প্লেসমেন্ট" : "Automated Order Taking",
          values: (plan: PlanConfig) => plan.ecommerceEnabled,
        },
        {
          label: isBn ? "কুরিয়ার ইন্টিগ্রেশন (Steadfast, Pathao, RedX)" : "Courier Integrations (Steadfast, Pathao, RedX)",
          values: (plan: PlanConfig) => plan.ecommerceEnabled,
        },
        {
          label: isBn ? "কাস্টম ইআরপি / ওয়েবহুক সংযোগ" : "Custom ERP / Webhook Bridge",
          values: (plan: PlanConfig) => plan.key === "enterprise",
        },
      ],
    },
    {
      title: isBn ? "উন্নত এআই মডেল ও সুবিধা" : "Advanced AI Models & Control",
      rows: [
        {
          label: isBn ? "গাইডেড সিম্পল মোড" : "Guided Simple AI Mode",
          values: () => true,
        },
        {
          label: isBn ? "প্রো মোড ও অ্যাডভান্সড মডেল সিলেকশন" : "Pro Mode & Advanced Model Selection",
          values: (plan: PlanConfig) => plan.key !== "starter",
        },
        {
          label: isBn ? "অতিরিক্ত ক্রেডিট টপ-আপ সুবিধা" : "Credit Top-up Purchases",
          values: (plan: PlanConfig) => plan.key !== "starter",
        },
        {
          label: isBn ? "কাস্টমার সাপোর্ট" : "Customer Support",
          values: (plan: PlanConfig) =>
            plan.key === "enterprise"
              ? isBn ? "২৪/৭ ডেডিকেটেড ম্যানেজার + SLA" : "24/7 Dedicated Manager + SLA"
              : plan.key === "business"
              ? isBn ? "প্রায়োরিটি সাপোর্ট" : "Priority Support"
              : isBn ? "স্ট্যান্ডার্ড সাপোর্ট" : "Standard Support",
        },
      ],
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mt-24 max-w-5xl mx-auto"
    >
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3 border border-primary/20">
          <Sparkles className="w-3.5 h-3.5" />
          {isBn ? "বিস্তারিত ফিচার ম্যাট্রিক্স" : "Full Feature Comparison"}
        </div>
        <h2 className="text-3xl font-bold tracking-tight">
          {isBn ? "প্ল্যানগুলোর বিস্তারিত ফিচার তুলনা" : "Compare Plans & Features"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isBn
            ? "আপনার ব্যবসার জন্য কোন প্ল্যানটি সবচেয়ে মানানসই তা এক নজরে দেখে নিন।"
            : "Review complete entitlements and capabilities side-by-side."}
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-border bg-card/80 backdrop-blur-xl shadow-sm">
        <table className="w-full text-left border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="p-4 sm:p-5 font-semibold text-sm text-foreground w-2/5">
                {isBn ? "ফিচার" : "Features"}
              </th>
              {plans.map((p) => (
                <th
                  key={p.key}
                  className={`p-4 sm:p-5 font-bold text-center text-sm ${
                    p.featured ? "text-primary" : "text-foreground"
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{resolveLocalStr(p.name, lang)}</span>
                    {p.featured && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground uppercase">
                        {isBn ? "জনপ্রিয়" : "Popular"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, cIdx) => (
              <React.Fragment key={cIdx}>
                <tr className="border-b border-border/80 bg-muted/20">
                  <td
                    colSpan={plans.length + 1}
                    className="p-3 px-5 text-xs font-bold uppercase tracking-wider text-primary"
                  >
                    {cat.title}
                  </td>
                </tr>
                {cat.rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-border/50 hover:bg-muted/10 transition-colors"
                  >
                    <td className="p-3.5 sm:p-4 text-xs sm:text-sm text-foreground/90 font-medium pl-6">
                      {row.label}
                    </td>
                    {plans.map((p) => {
                      const val = row.values(p);
                      return (
                        <td
                          key={p.key}
                          className="p-3.5 sm:p-4 text-center text-xs sm:text-sm font-medium"
                        >
                          {typeof val === "boolean" ? (
                            val ? (
                              <Check className="w-4 h-4 text-primary mx-auto" />
                            ) : (
                              <Minus className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                            )
                          ) : (
                            <span className="text-foreground/80">{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
}

import React from "react";
