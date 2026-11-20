"use client";

import { ActiveSessionsCard } from "./_components/ActiveSessionsCard";
import { CustomerPrivacyCard } from "./_components/CustomerPrivacyCard";
import { DataExportCard } from "./_components/DataExportCard";
import { DataRetentionCard } from "./_components/DataRetentionCard";
import { RecentActivityCard } from "./_components/RecentActivityCard";
import { ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function SecurityPage() {
  const { t } = useTranslation("settings");

  return (
    <div className="space-y-6 w-full pb-10">
      {/* Page Header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          {t("security.title", "Security & Data Management")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            "security.subtitle",
            "Manage account logins, protect customer phone numbers, and configure data retention."
          )}
        </p>
      </div>

      {/* Security Health Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">
              {t("security.healthTitle", "Workspace Security Status: Protected")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                "security.healthDesc",
                "Your business credentials, customer numbers, and chat records are safely guarded."
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary shrink-0 bg-background/80 px-3 py-1.5 rounded-xl border border-primary/25 shadow-2xs self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t("security.healthActive", "All Protections Active")}</span>
        </div>
      </div>

      {/* Main Grid: Row 1 - Logins & Customer Privacy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActiveSessionsCard />
        <CustomerPrivacyCard />
      </div>

      {/* Main Grid: Row 2 - Data Export & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataExportCard />
        <DataRetentionCard />
      </div>

      {/* Main Grid: Row 3 - Recent Security Activity */}
      <RecentActivityCard />

      {/* Privacy Guarantee Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="p-4 rounded-2xl border border-border bg-muted/20 flex gap-3.5 items-center"
      >
        <div className="w-9 h-9 rounded-xl bg-background flex items-center justify-center shrink-0 shadow-xs border border-border">
          <ShieldAlert className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs font-bold text-foreground">
            {t("security.privacyTitle", "Your Privacy & Data Ownership")}
          </p>
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            {t(
              "security.privacyDesc",
              "We encrypt all your data at rest and in transit. Your business data belongs exclusively to you. DRIPLARE AI never sells or shares your customer records."
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
