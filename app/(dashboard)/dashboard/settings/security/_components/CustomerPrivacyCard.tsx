"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EyeOff, Users, Check, Save, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function CustomerPrivacyCard() {
  const { t } = useTranslation("settings");
  const [phoneMasking, setPhoneMasking] = useState(false);
  const [enforceTeam2FA, setEnforceTeam2FA] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/user/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data?.securitySettings) {
          const s = data.securitySettings;
          setPhoneMasking(Boolean(s.phoneMasking));
          setEnforceTeam2FA(Boolean(s.enforceTeam2FA));
        }
      })
      .catch((err) => console.error("[LOAD_SECURITY_SETTINGS_ERR]", err))
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          securitySettings: {
            phoneMasking,
            enforceTeam2FA,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSaved(true);
      toast.success(t("security.privacyCard.saveSuccess", "Security preferences updated successfully!"));
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error(t("security.privacyCard.saveError", "Failed to update security preferences"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">
              {t("security.privacyCard.title", "Customer Privacy & Staff Policies")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("security.privacyCard.subtitle", "Protect customer phone numbers and control staff access rules")}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-xs gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>Loading preferences...</span>
          </div>
        ) : (
          <div className="space-y-4 mt-5">
            {/* Feature 1: Customer Phone Number Masking */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">
                      {t("security.privacyCard.maskingTitle", "Hide Customer Phone Numbers from Agents")}
                    </p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Popular ⭐
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(
                      "security.privacyCard.maskingDesc",
                      "Support agents will see masked phone numbers (e.g. 01712***678) in chat and CRM, preventing customer contact theft. Workspace Owner & Admins always see full numbers."
                    )}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={phoneMasking}
                    onChange={(e) => setPhoneMasking(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Live Preview Box */}
              <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-muted-foreground bg-background/80 p-2.5 rounded-lg border border-border/60">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>Preview for Agents:</span>
                <span className={`font-bold px-2 py-0.5 rounded-md ${phoneMasking ? "bg-amber-500/10 text-amber-600" : "bg-muted text-foreground"}`}>
                  {phoneMasking ? "01712***678" : "01712-345678"}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {phoneMasking ? "(Masked)" : "(Visible)"}
                </span>
              </div>
            </div>

            {/* Feature 2: Enforce 2FA for Team Members */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-foreground">
                      {t("security.privacyCard.enforce2FATitle", "Require 2FA for Team Members")}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(
                      "security.privacyCard.enforce2FADesc",
                      "Mandates that all team members enable Two-Factor Authentication on their account before accessing this workspace."
                    )}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={enforceTeam2FA}
                    onChange={(e) => setEnforceTeam2FA(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted-foreground/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-5 mt-5 border-t border-border/60 flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          {t("security.privacyCard.autoApply", "Changes apply immediately across workspace")}
        </p>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={loading || saving}
          className="rounded-xl px-5 gap-1.5 cursor-pointer shadow-xs"
        >
          {saved ? (
            <>
              <Check className="w-3.5 h-3.5" />
              {t("security.privacyCard.saved", "Saved")}
            </>
          ) : (
            <>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? t("security.privacyCard.saving", "Saving…") : t("security.privacyCard.saveBtn", "Save Settings")}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
