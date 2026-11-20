"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { ShieldCheck, Smartphone, Laptop, ExternalLink, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export function ActiveSessionsCard() {
  const { openUserProfile } = useClerk();
  const { user } = useUser();
  const { t } = useTranslation("settings");

  const lastSignIn = user?.lastSignInAt
    ? format(new Date(user.lastSignInAt), "MMMM d, yyyy 'at' h:mm a")
    : t("security.authCard.notAvailable", "Active now");

  const is2FAEnabled = Boolean(user?.twoFactorEnabled);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">
              {t("security.sessionsCard.title", "Login Security & Active Devices")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("security.sessionsCard.subtitle", "Track connected devices and protect account credentials")}
            </p>
          </div>
        </div>

        <div className="space-y-3.5 mt-5">
          {/* Current Device Box */}
          <div className="p-4 rounded-xl bg-muted/20 border border-border/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {t("security.sessionsCard.currentDevice", "Current Active Session")}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("security.sessionsCard.activeNow", "Active Now")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("security.sessionsCard.lastSeen", "Last signed in:")} {lastSignIn}
                </p>
              </div>
            </div>
          </div>

          {/* Security Status Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/70 flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-background text-primary border border-border">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {t("security.authCard.password", "Password")}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {t("security.sessionsCard.pwdActive", "Configured & Protected")}
                </p>
              </div>
            </div>

            {/* 2FA */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/70 flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg border ${is2FAEnabled ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"}`}>
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {t("security.authCard.twoFactor", "Two-Factor Auth")}
                </p>
                <p className={`text-[11px] font-medium truncate ${is2FAEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {is2FAEnabled
                    ? t("security.sessionsCard.twoFactorOn", "Enabled")
                    : t("security.sessionsCard.twoFactorOff", "Not Enabled")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-5 mt-5 border-t border-border/60 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {t("security.sessionsCard.remoteHint", "Log out suspicious sessions anytime")}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl gap-1.5 cursor-pointer"
          onClick={() => openUserProfile()}
        >
          <span>{t("security.sessionsCard.manageBtn", "Devices & Remote Logout")}</span>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>
    </motion.div>
  );
}
