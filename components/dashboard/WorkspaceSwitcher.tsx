"use client";

import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronsUpDown,
  ImagePlus,
  Plus,
  X,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WORKSPACE_BUSINESS_CATEGORIES } from "@/lib/domain/workspace-business-categories";
import { readLogoFile } from "@/lib/core/workspace-logo";

/**
 * Square avatar for a business: renders the uploaded logo when present,
 * otherwise a colored badge with the first letter of the business name.
 */
export function WorkspaceAvatar({
  name,
  logoUrl,
  className = "h-6 w-6 text-[11px]",
}: {
  name: string;
  logoUrl?: string | null;
  className?: string;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className={`${className} shrink-0 rounded-lg object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-purple-600 font-semibold text-white`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Multi-Business / Multi-Workspace switcher for the Top Navbar.
 * Shows the active business and lets the user switch or add a new one.
 */
export function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    switchWorkspace,
    addWorkspace,
    loading,
  } = useWorkspace();

  // Add Business modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("ecommerce");
  const [customBusinessTitle, setCustomBusinessTitle] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    readLogoFile(
      file,
      (dataUrl) => setLogoUrl(dataUrl),
      () => setError(t("workspace.logoError", "Could not read that image. Try another file."))
    );
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setError(null);
    setCreating(true);
    try {
      const workspace = await addWorkspace(trimmed, logoUrl || undefined, category, customBusinessTitle);
      if (workspace) {
        setName("");
        setLogoUrl(null);
        setCategory("ecommerce");
        setCustomBusinessTitle("");
        setCreateOpen(false);
        switchWorkspace(workspace.workspaceId);
      } else {
        setError(t("workspace.createError", "Failed to create business. Please try again."));
      }
    } catch (err) {
      console.error("[WorkspaceSwitcher] create failed", err);
      setError(t("workspace.createError", "Failed to create business. Please try again."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-2.5 py-1.5 text-sm font-medium hover:bg-muted/60 hover:border-border transition-colors outline-none data-open:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer"
          data-testid="workspace-switcher"
        >
          {activeWorkspace ? (
            <WorkspaceAvatar
              name={activeWorkspace.name}
              logoUrl={activeWorkspace.logoUrl}
            />
          ) : (
            <span className="h-6 w-6 shrink-0 rounded-lg bg-primary/10" />
          )}
          <span className="hidden max-w-[140px] truncate text-left sm:inline">
            {loading
              ? t("workspace.loading", "Loading…")
              : activeWorkspace?.name || t("workspace.select", "Select business")}
          </span>
          <ChevronsUpDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:block" />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="w-60 shadow-2xl border border-border"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              {t("workspace.label", "Businesses")}
            </DropdownMenuLabel>
            {workspaces.length === 0 && !loading && (
              <div className="px-2.5 py-2 text-xs text-muted-foreground">
                {t("workspace.empty", "No businesses yet")}
              </div>
            )}
            {workspaces.map((workspace) => {
              const isActive = workspace.workspaceId === activeWorkspaceId;
              return (
                <DropdownMenuItem
                  key={workspace.workspaceId}
                  onClick={() => switchWorkspace(workspace.workspaceId)}
                  className="flex items-center gap-2 py-1.5 cursor-pointer"
                  data-active={isActive}
                >
                  <WorkspaceAvatar
                    name={workspace.name}
                    logoUrl={workspace.logoUrl}
                  />
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {isActive && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setTimeout(() => setCreateOpen(true), 10)}
            className="flex items-center gap-2 py-1.5 text-primary cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            {t("workspace.addBusiness", "Add New Business")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Add New Business Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("workspace.createTitle", "Add New Business")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "workspace.createSubtitle",
                "Create a separate space for another store, brand, or project. Each business has its own AI Agent and data."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Brand Logo — file picker + Base64 preview */}
            <div className="space-y-2">
              <Label>{t("workspace.logoLabel", "Brand logo")}</Label>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt={t("workspace.logoPreview", "Logo preview")}
                      className="h-14 w-14 rounded-xl object-cover border border-border"
                    />
                    <button
                      type="button"
                      aria-label={t("workspace.logoRemove", "Remove logo")}
                      onClick={() => {
                        setLogoUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                )}
                <div className="text-xs text-muted-foreground">
                  {t(
                    "workspace.logoHint",
                    "Optional. PNG or JPG, square looks best."
                  )}
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

            {/* Business Category Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">{t("workspace.categoryLabel", "Business Category")}</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 border border-border rounded-xl">
                {WORKSPACE_BUSINESS_CATEGORIES.map((cat) => {
                  const selected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2 text-left rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        selected
                          ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                          : "border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="truncate">{t(cat.labelKey, cat.label)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-custom-title">{t("workspace.businessZoneTitle", "Business Zone title (optional)")}</Label>
              <Input id="workspace-custom-title" value={customBusinessTitle} onChange={(event) => setCustomBusinessTitle(event.target.value)} maxLength={60} placeholder={t("workspace.businessZonePlaceholder", "e.g. Doctor Appointments")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-name">
                {t("workspace.nameLabel", "Business name")}
              </Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("workspace.namePlaceholder", "e.g. My Online Store")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleCreate();
                }}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateOpen(false);
                setLogoUrl(null);
              }}
              disabled={creating}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="bg-brand-gradient hover:opacity-90 text-white border-none cursor-pointer"
            >
              {creating
                ? t("workspace.creating", "Creating…")
                : t("workspace.create", "Create Business")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
