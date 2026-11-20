"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, X, Mail, User, Shield, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ROLE_PRESET_DEFINITIONS,
  getDefaultPermissions,
  type MemberPermissions,
} from "@/lib/domain/team-member-permissions";
import { PermissionsMatrix } from "./PermissionsMatrix";
import type { TeamMemberItem } from "./TeamMemberList";

interface EditMemberModalProps {
  isOpen: boolean;
  member: TeamMemberItem | null;
  onClose: () => void;
  onUpdate: (data: {
    memberId: string;
    name: string;
    role: string;
    permissions: MemberPermissions;
  }) => Promise<boolean>;
}

export const EditMemberModal = ({
  isOpen,
  member,
  onClose,
  onUpdate,
}: EditMemberModalProps) => {
  const { t } = useTranslation("settings");
  const [name, setName] = useState(member?.name || "");
  const [role, setRole] = useState<string>(member?.role || "agent");
  const [permissions, setPermissions] = useState<MemberPermissions>(
    member?.permissions && Object.keys(member.permissions).length > 0
      ? member.permissions
      : getDefaultPermissions(member?.role || "agent")
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen || !member) return null;

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    if (newRole !== "custom") {
      setPermissions(getDefaultPermissions(newRole));
    }
  };

  const handlePermissionsChange = (newPerms: MemberPermissions) => {
    setPermissions(newPerms);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;

    try {
      setLoading(true);
      const ok = await onUpdate({
        memberId: member.id,
        name,
        role,
        permissions,
      });
      if (ok) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  // Count active permissions across all modules
  const activeCount = Object.values(permissions).reduce(
    (acc, actions) => acc + (actions?.length || 0),
    0
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-background/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="w-full max-w-4xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0 bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("team.editModal.title", "Edit Member & Permissions")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {member.name} • <span className="font-mono text-[11px]">{member.email}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form with 2-Column Grid — left col fixed, right col scrolls independently */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border/60">
              {/* Left Column: Member Info & Role Selection */}
              <div className="md:w-[42%] shrink-0 overflow-y-auto p-6 space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("team.inviteModal.nameLabel", "Full Name")}
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("team.inviteModal.namePlaceholder", "e.g. Tanvir Ahmed")}
                    className="bg-muted/30 text-sm rounded-xl"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("team.inviteModal.emailLabel", "Email Address")}
                  </Label>
                  <Input
                    value={member.email}
                    disabled
                    className="bg-muted/50 text-muted-foreground cursor-not-allowed font-mono text-xs rounded-xl"
                  />
                </div>

                {/* Role Presets Cards */}
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    {t("team.inviteModal.roleLabel", "Role Preset")}
                  </Label>
                  <div className="space-y-2">
                    {ROLE_PRESET_DEFINITIONS.map((r) => {
                      const isSelected = role === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleRoleChange(r.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                              : "border-border/70 bg-card hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background"
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`text-xs font-bold capitalize leading-tight ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}
                            >
                              {t(r.labelKey, r.label)}
                            </p>
                            <p className="text-[11px] text-muted-foreground leading-normal mt-0.5 line-clamp-2">
                              {t(r.descKey, r.description)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Feature Access & Permissions Matrix — independently scrollable */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                <PermissionsMatrix
                  permissions={permissions}
                  onChange={handlePermissionsChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Sticky Bottom Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-muted/30 shrink-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground self-start sm:self-auto">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>
                  {t("team.roles." + role, role)} • <strong className="text-foreground">{activeCount}</strong> permissions active
                </span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-xl cursor-pointer"
                >
                  {t("team.inviteModal.cancelBtn", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="gap-1.5 rounded-xl bg-primary hover:opacity-90 cursor-pointer shadow-xs"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  {t("team.editModal.saveBtn", "Save Changes")}
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
