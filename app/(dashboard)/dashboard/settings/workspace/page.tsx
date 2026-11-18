"use client";

import { useRef, useState, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ImagePlus,
  Save,
  Check,
  X,
  AlertTriangle,
  Trash2,
  Info,
  Calendar,
  Hash,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspace } from "@/components/workspace-provider";
import { WORKSPACE_BUSINESS_CATEGORIES } from "@/lib/domain/workspace-business-categories";
import { readLogoFile } from "@/lib/core/workspace-logo";
import { WorkspaceAvatar } from "@/components/dashboard/WorkspaceSwitcher";
import { format } from "date-fns";

// ─── Card wrapper ────────────────────────────────────────────────────────────
function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`rounded-2xl border border-border bg-card p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function WorkspaceSettingsPage() {
  const { t } = useTranslation("settings");
  const {
    activeWorkspace,
    workspaces,
    updateWorkspace,
    deleteWorkspace,
    switchWorkspace,
  } = useWorkspace();

  /* ── Edit form state — derived from activeWorkspace, overridable by user ── */
  const [name, setName] = useState(activeWorkspace?.name ?? "");
  const [category, setCategory] = useState(activeWorkspace?.category || "ecommerce");
  const [customBusinessTitle, setCustomBusinessTitle] = useState(activeWorkspace?.customBusinessTitle || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(activeWorkspace?.logoUrl ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-seed form fields when the user switches to a different business.
  // useLayoutEffect is allowed to call setState (it runs before paint).
  const prevWorkspaceId = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!activeWorkspace) return;
    if (activeWorkspace.workspaceId === prevWorkspaceId.current) return;
    prevWorkspaceId.current = activeWorkspace.workspaceId;
    setName(activeWorkspace.name);
    setCategory(activeWorkspace.category || "ecommerce");
    setCustomBusinessTitle(activeWorkspace.customBusinessTitle || "");
    setLogoUrl(activeWorkspace.logoUrl ?? null);
  }, [activeWorkspace]);

  /* ── Delete dialog state ── */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readLogoFile(
      file,
      (dataUrl) => setLogoUrl(dataUrl),
      () => toast.error(t("workspace.logoError", "Could not read that image. Try another file."))
    );
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !activeWorkspace) return;
    setSaving(true);
    try {
      const updated = await updateWorkspace(
        activeWorkspace.workspaceId,
        trimmed,
        logoUrl || undefined,
        category,
        customBusinessTitle
      );
      if (updated) {
        setSaved(true);
        toast.success(t("workspace.saved", "Saved successfully"));
        setTimeout(() => setSaved(false), 2500);
      } else {
        toast.error(t("workspace.updateError", "Failed to update business. Please try again."));
      }
    } catch {
      toast.error(t("workspace.updateError", "Failed to update business. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!activeWorkspace || confirmText.trim() !== activeWorkspace.name) return;
    setDeleting(true);
    try {
      const ok = await deleteWorkspace(activeWorkspace.workspaceId);
      if (ok) {
        toast.success(t("workspace.deleteSuccess", "Business deleted successfully"));
        setDeleteOpen(false);
      } else {
        toast.error(t("workspace.deleteError", "Failed to delete business. Please try again."));
      }
    } catch {
      toast.error(t("workspace.deleteError", "Failed to delete business. Please try again."));
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = workspaces.length > 1;
  const createdAt = activeWorkspace?.createdAt
    ? format(new Date(activeWorkspace.createdAt), "MMMM d, yyyy")
    : "—";

  if (!activeWorkspace) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-10">

      {/* Page header */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          {t("workspace.title", "Workspace Settings")}
        </h2>
        <p className="text-base text-muted-foreground">
          {t("workspace.subtitle", "Manage your business branding, category, and workspace preferences.")}
        </p>
      </div>

      {/* ── Business Info Card ── */}
      <Card delay={0.04}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">
              {t("workspace.cardTitle", "Business Information")}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("workspace.cardSubtitle", "Update your business details and branding.")}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label>{t("workspace.logoLabel", "Brand Logo")}</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt={t("workspace.logoPreview", "Logo preview")}
                    className="h-16 w-16 rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    aria-label={t("workspace.removeLogo", "Remove Logo")}
                    onClick={() => {
                      setLogoUrl(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/90 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[9px] font-medium leading-none">Upload</span>
                </button>
              )}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  {t("workspace.uploadLogo", "Change Logo")}
                </button>
                <p className="text-[11px] text-muted-foreground">
                  {t("workspace.logoHint", "Square PNG or JPG recommended. Auto-optimized to 256×256px.")}
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          {/* Business Category */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              {t("workspace.categoryLabel", "Business Category")}
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WORKSPACE_BUSINESS_CATEGORIES.map((cat) => {
                const selected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`p-2.5 text-left rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      selected
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                        : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(cat.labelKey, cat.label)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Business Zone Title */}
          <div className="space-y-2">
            <Label htmlFor="ws-zone-title">
              {t("workspace.businessZoneTitle", "Business Zone Title (optional)")}
            </Label>
            <Input
              id="ws-zone-title"
              value={customBusinessTitle}
              onChange={(e) => setCustomBusinessTitle(e.target.value)}
              maxLength={60}
              placeholder={t("workspace.businessZonePlaceholder", "e.g. Trendirect Store")}
            />
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              {t("workspace.businessZoneHint", "This custom label appears in your dashboard navigation zone.")}
            </p>
          </div>

          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="ws-name">
              {t("workspace.nameLabel", "Business Name")}
            </Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("workspace.namePlaceholder", "e.g. Trendirect")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleSave();
              }}
            />
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="rounded-xl px-6 bg-primary hover:opacity-90 transition-all gap-2 cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  {t("workspace.saved", "Saved successfully")}
                </>
              ) : (
                <>
                  {saving ? "..." : <Save className="w-4 h-4" />}
                  {saving ? t("workspace.saving", "Saving…") : t("workspace.save", "Save Changes")}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Workspace Details Card ── */}
      <Card delay={0.08}>
        <h3 className="font-bold text-base mb-4">Workspace Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="p-1.5 rounded-lg bg-background border border-border shrink-0">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Workspace ID</p>
              <p className="text-xs font-mono text-foreground mt-0.5 truncate">
                {activeWorkspace.workspaceId}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="p-1.5 rounded-lg bg-background border border-border shrink-0">
              <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Total Businesses</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{workspaces.length}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/50">
            <div className="p-1.5 rounded-lg bg-background border border-border shrink-0">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Created</p>
              <p className="text-xs font-medium text-foreground mt-0.5">{createdAt}</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── All Businesses Card ── */}
      {workspaces.length > 1 && (
        <Card delay={0.12}>
          <h3 className="font-bold text-base mb-4">
            {t("workspace.allBusinesses", "All Businesses")}
          </h3>
          <div className="space-y-2">
            {workspaces.map((ws) => {
              const isActive = ws.workspaceId === activeWorkspace.workspaceId;
              return (
                <div
                  key={ws.workspaceId}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:border-border hover:bg-muted/30 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isActive) switchWorkspace(ws.workspaceId);
                  }}
                >
                  <WorkspaceAvatar
                    name={ws.name}
                    logoUrl={ws.logoUrl}
                    className="h-8 w-8 text-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ws.name}</p>
                    {ws.customBusinessTitle && (
                      <p className="text-xs text-muted-foreground truncate">{ws.customBusinessTitle}</p>
                    )}
                  </div>
                  {isActive && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {t("workspace.activeBadge", "Active")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Danger Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="p-6 rounded-2xl border border-destructive/25 bg-destructive/5"
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h3 className="font-bold text-destructive">
            {t("workspace.dangerTitle", "Delete Business")}
          </h3>
          <span className="ml-auto text-xs text-destructive/60">Irreversible</span>
        </div>

        <div className="pt-4 border-t border-destructive/15 flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">{activeWorkspace.name}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
              {t("workspace.dangerDesc", "Permanently delete this business and all associated AI agents, contacts, orders, and chat history. This action cannot be undone.")}
            </p>
            {!canDelete && (
              <p className="text-xs text-destructive/70 font-medium mt-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                {t("workspace.cannotDeleteOnly", "You cannot delete your only business.")}
              </p>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl shrink-0 cursor-pointer"
            disabled={!canDelete}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            {t("workspace.deleteBtn", "Delete Business")}
          </Button>
        </div>
      </motion.div>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {deleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setDeleteOpen(false);
                setConfirmText("");
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {t("workspace.deleteConfirmTitle", "Delete Business")}
                </h2>
                <button
                  onClick={() => { setDeleteOpen(false); setConfirmText(""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                {/* Warning banner */}
                <div className="rounded-xl border border-destructive/25 bg-destructive/8 p-4">
                  <p className="text-xs text-destructive leading-relaxed">
                    {t(
                      "workspace.deleteConfirmWarning",
                      "This permanently deletes this business and ALL of its data — AI Agents, integrations, orders, conversations, and messages. This action cannot be undone."
                    )}
                  </p>
                </div>

                {/* Business name badge */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/60">
                  <WorkspaceAvatar
                    name={activeWorkspace.name}
                    logoUrl={activeWorkspace.logoUrl}
                    className="h-8 w-8 text-sm"
                  />
                  <p className="text-sm font-semibold">{activeWorkspace.name}</p>
                </div>

                {/* Type to confirm */}
                <div className="space-y-2">
                  <Label htmlFor="delete-confirm-input">
                    {t("workspace.deleteConfirmPrompt", "Type the business name to confirm:")}
                  </Label>
                  <Input
                    id="delete-confirm-input"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={activeWorkspace.name}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && confirmText.trim() === activeWorkspace.name) {
                        handleDelete();
                      }
                    }}
                  />
                  {confirmText && confirmText !== activeWorkspace.name && (
                    <p className="text-xs text-destructive">Business name does not match.</p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDeleteOpen(false); setConfirmText(""); }}
                  disabled={deleting}
                  className="rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={confirmText.trim() !== activeWorkspace.name || deleting}
                  className="rounded-xl cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  {deleting
                    ? t("workspace.deleting", "Deleting…")
                    : t("workspace.deleteBtn", "Delete Business")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
