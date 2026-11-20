"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Shield,
  Share2,
  Bell,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useTranslation("settings");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NAV_LINKS = [
    { href: "/dashboard/settings", icon: User, label: t("tabs.profile", "My Profile") },
    { href: "/dashboard/settings/workspace", icon: Building2, label: t("tabs.workspace", "Workspace") },
    { href: "/dashboard/settings/security", icon: Shield, label: t("tabs.security", "Security and Data") },
    { href: "/dashboard/settings/team", icon: Users, label: t("tabs.team", "Team Members") },
    { href: "/dashboard/settings/referrals", icon: Share2, label: t("tabs.referrals", "Referrals") },
    { href: "/dashboard/settings/notifications", icon: Bell, label: t("tabs.notifications", "Notification") },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Section */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
          {t("title", "Settings")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("subtitle", "Manage your account preferences, security, and notification settings.")}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start w-full">
        {/* Left Vertical Sub-Sidebar (Collapsible) */}
        <aside
          className={`w-full ${
            isCollapsed ? "md:w-16" : "md:w-56"
          } shrink-0 sticky top-24 transition-[width] duration-300 ease-in-out`}
        >
          <nav className="flex flex-col gap-1 p-1.5 bg-muted/30 rounded-2xl border border-border/60 shadow-2xs">
            {/* Collapse / Expand Toggle Button Header */}
            <div
              className={`hidden md:flex items-center ${
                isCollapsed ? "justify-center" : "justify-between px-2"
              } py-1 mb-1 border-b border-border/40 pb-1.5`}
            >
              {!isCollapsed && (
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t("menu", "Menu")}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={isCollapsed ? t("expandMenu", "Expand menu") : t("collapseMenu", "Collapse menu")}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Navigation Links */}
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`flex items-center ${
                    isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3.5 py-2.5"
                  } text-sm font-medium rounded-xl transition-all ${
                    isActive
                      ? "bg-background text-primary shadow-xs border border-border/60"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "bg-muted/80 text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {!isCollapsed && <span className="truncate">{link.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Optional Helper Text (Only when expanded on desktop) */}
          {!isCollapsed && (
            <div className="hidden md:block mt-5 px-4 py-3.5 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/10">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("helpNote", "Need help with your account?")} <br />
                <Link
                  href="/support"
                  className="text-primary hover:underline font-semibold"
                >
                  {t("contactSupport", "Contact Support")}
                </Link>
              </p>
            </div>
          )}
        </aside>

        {/* Right Content Area */}
        <div className="flex-1 w-full min-w-0 animate-in fade-in slide-in-from-right-3 duration-300 ease-out">
          {children}
        </div>
      </div>
    </div>
  );
}
