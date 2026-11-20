"use client";

import { useTranslation } from "react-i18next";
import { Check, ShieldCheck, MessageSquare, Users, ShoppingBag, Bot, Plug, Settings } from "lucide-react";
import {
  MODULE_DEFINITIONS,
  type MemberPermissions,
  type PermissionModule,
} from "@/lib/domain/team-member-permissions";

interface PermissionsMatrixProps {
  permissions: MemberPermissions;
  onChange: (updated: MemberPermissions) => void;
  disabled?: boolean;
  className?: string;
}

const MODULE_ICONS: Record<PermissionModule, React.ElementType> = {
  inbox: MessageSquare,
  crm: Users,
  store: ShoppingBag,
  ai_agent: Bot,
  integrations: Plug,
  settings: Settings,
};

export const PermissionsMatrix = ({
  permissions,
  onChange,
  disabled = false,
  className = "",
}: PermissionsMatrixProps) => {
  const { t } = useTranslation("settings");

  const toggleAction = (module: PermissionModule, action: string) => {
    if (disabled) return;
    const currentActions = permissions[module] || [];
    const exists = currentActions.includes(action);
    const updatedActions = exists
      ? currentActions.filter((a) => a !== action)
      : [...currentActions, action];

    onChange({
      ...permissions,
      [module]: updatedActions,
    });
  };

  const toggleAllInModule = (module: PermissionModule, allActions: string[]) => {
    if (disabled) return;
    const currentActions = permissions[module] || [];
    const isAllSelected = allActions.every((a) => currentActions.includes(a));
    onChange({
      ...permissions,
      [module]: isAllSelected ? [] : [...allActions],
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>{t("team.permissions.title", "Feature Access & Permissions")}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {t("team.permissions.hint", "Select which actions this team member can perform")}
        </span>
      </div>

      <div className="space-y-2.5">
        {MODULE_DEFINITIONS.map((mod) => {
          const Icon = MODULE_ICONS[mod.id] || ShieldCheck;
          const currentActions = permissions[mod.id] || [];
          const allActionKeys = mod.actions.map((a) => a.action);
          const isAllSelected =
            allActionKeys.length > 0 &&
            allActionKeys.every((a) => currentActions.includes(a));

          return (
            <div
              key={mod.id}
              className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/20 transition-colors shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      {t(mod.labelKey, mod.label)}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {t(mod.descriptionKey, mod.description)}
                    </p>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => toggleAllInModule(mod.id, allActionKeys)}
                    className="text-[10px] text-primary hover:underline font-semibold shrink-0 pt-0.5 cursor-pointer"
                  >
                    {isAllSelected
                      ? t("team.permissions.deselectAll", "Deselect All")
                      : t("team.permissions.selectAll", "Select All")}
                  </button>
                )}
              </div>

              {/* Action checkboxes */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {mod.actions.map((act) => {
                  const isChecked = currentActions.includes(act.action);
                  return (
                    <button
                      key={act.action}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleAction(mod.id, act.action)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-primary/10 border-primary/40 text-primary font-semibold shadow-xs"
                          : "bg-muted/30 border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
                      } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] border transition-colors ${
                          isChecked
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border bg-background"
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span>{t(act.labelKey, act.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
