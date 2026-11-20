"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface ApplyImmediatelyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isApplying: boolean;
}

export function ApplyImmediatelyModal({
  isOpen,
  onClose,
  onConfirm,
  isApplying,
}: ApplyImmediatelyModalProps) {
  const { t, i18n } = useTranslation("payment");
  const isBn = i18n.language === "bn";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md p-6 rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
        >
          <button
            onClick={onClose}
            disabled={isApplying}
            className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">
                {isBn ? "ডাউনগ্রেড এখনই কার্যকর করবেন?" : "Apply Downgrade Immediately?"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isBn ? "সতর্কবার্তা" : "Immediate Action Warning"}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {t(
              "scheduledDowngrade.applyConfirm",
              isBn
                ? "আপনি কি নিশ্চিত যে ডাউনগ্রেড এখনই কার্যকর করতে চান? বাড়তি চ্যাটবট এবং ইন্টিগ্রেশনগুলো অবিলম্বে সাময়িক বন্ধ হয়ে যাবে।"
                : "Are you sure you want to apply this downgrade immediately? Excess AI Agents and integrations will be paused right away."
            )}
          </p>

          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isApplying}
              className="rounded-xl"
            >
              {isBn ? "না, ফিরে যান" : "Cancel"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirm}
              disabled={isApplying}
              className="rounded-xl shadow-md"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {isBn ? "কার্যকর হচ্ছে..." : "Applying..."}
                </>
              ) : isBn ? (
                "হ্যাঁ, কার্যকর করুন"
              ) : (
                "Yes, Apply Now"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
