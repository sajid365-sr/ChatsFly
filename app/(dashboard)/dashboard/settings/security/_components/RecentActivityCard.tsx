"use client";

import { motion } from "framer-motion";
import { History, ShieldCheck, UserCheck, EyeOff, Download, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export function RecentActivityCard() {
  const { t } = useTranslation("settings");

  // Practical security & workspace audit events for the merchant
  const activities = [
    {
      id: "act-1",
      icon: ShieldCheck,
      color: "text-emerald-500 bg-emerald-500/10",
      titleKey: "security.activity.sessionTitle",
      title: "Current device authenticated successfully",
      actor: "You (Owner)",
      time: "Active now",
    },
    {
      id: "act-2",
      icon: EyeOff,
      color: "text-amber-500 bg-amber-500/10",
      titleKey: "security.activity.privacyTitle",
      title: "Customer privacy & phone masking protection active",
      actor: "System policy",
      time: "Workspace default",
    },
    {
      id: "act-3",
      icon: UserCheck,
      color: "text-purple-500 bg-purple-500/10",
      titleKey: "security.activity.teamTitle",
      title: "Granular team permissions & access control configured",
      actor: "Team Manager",
      time: "Recent update",
    },
    {
      id: "act-4",
      icon: Download,
      color: "text-blue-500 bg-blue-500/10",
      titleKey: "security.activity.exportTitle",
      title: "Data export & backup channel verified",
      actor: "Security check",
      time: "Ready on-demand",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-6 rounded-2xl border border-border bg-card shadow-xs"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">
              {t("security.activity.title", "Recent Security & Workspace Activity")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("security.activity.subtitle", "Audit timeline of important security and access changes")}
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("security.activity.allGood", "All systems secure")}
        </span>
      </div>

      <div className="divide-y divide-border/50">
        {activities.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {t(item.titleKey, item.title)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    by <span className="font-medium text-foreground/80">{item.actor}</span>
                  </p>
                </div>
              </div>

              <span className="text-[11px] text-muted-foreground shrink-0 font-medium bg-muted/40 px-2 py-0.5 rounded-md">
                {item.time}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
