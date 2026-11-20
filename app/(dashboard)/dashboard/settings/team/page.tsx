"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { TeamMemberList, type TeamMemberItem } from "./_components/TeamMemberList";
import { InviteMemberModal } from "./_components/InviteMemberModal";
import { EditMemberModal } from "./_components/EditMemberModal";
import type { MemberPermissions } from "@/lib/domain/team-member-permissions";

export default function TeamSettingsPage() {
  const { t } = useTranslation("settings");
  const confirm = useConfirm((state) => state.confirm);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [canManage, setCanManage] = useState<boolean>(true);
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [editingMember, setEditingMember] = useState<TeamMemberItem | null>(null);

  // Load workspace and members on mount
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const wsRes = await fetch("/api/workspaces");
        const wsData = await wsRes.json();
        const id = wsData.activeWorkspaceId || wsData.workspaces?.[0]?.workspaceId;
        if (!id || ignore) return;
        setWorkspaceId(id);

        const membersRes = await fetch(`/api/workspaces/${id}/members`);
        const membersData = await membersRes.json();
        if (ignore) return;
        setMembers(membersData.members ?? []);
        setOwnerId(membersData.ownerId ?? "");
        setCurrentUserId(membersData.currentUserId ?? "");
        setCanManage(Boolean(membersData.isOwner || membersData.currentUserRole === "admin"));
      } catch (err) {
        console.error("[LOAD_WS_ERR]", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const refreshMembers = useCallback(async (targetWorkspaceId?: string | null) => {
    const wsId = targetWorkspaceId || workspaceId;
    if (!wsId) return;
    try {
      const res = await fetch(`/api/workspaces/${wsId}/members`);
      const data = await res.json();
      setMembers(data.members ?? []);
      setOwnerId(data.ownerId ?? "");
      setCurrentUserId(data.currentUserId ?? "");
      setCanManage(Boolean(data.isOwner || data.currentUserRole === "admin"));
    } catch (err) {
      console.error("[REFRESH_MEMBERS_ERR]", err);
    }
  }, [workspaceId]);

  const handleInvite = async (data: {
    name: string;
    email: string;
    role: string;
    permissions?: MemberPermissions;
  }): Promise<boolean> => {
    if (!workspaceId) return false;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(t("team.inviteModal.successToast"));
        refreshMembers();
        return true;
      }
      const err = await res.json();
      toast.error(
        err.code === "INVITE_EMAIL_FAILED"
          ? t("team.inviteModal.emailErrorToast")
          : err.error || t("team.inviteModal.errorToast")
      );
      return false;
    } catch {
      toast.error(t("team.inviteModal.errorToast"));
      return false;
    }
  };

  const handleUpdateMember = async (data: {
    memberId: string;
    name: string;
    role: string;
    permissions: MemberPermissions;
  }): Promise<boolean> => {
    if (!workspaceId) return false;
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        toast.success(t("team.editModal.successToast", "Member permissions updated successfully"));
        refreshMembers();
        return true;
      }
      const err = await res.json();
      toast.error(err.error || t("team.editModal.errorToast", "Failed to update member permissions"));
      return false;
    } catch {
      toast.error(t("team.editModal.errorToast", "Failed to update member permissions"));
      return false;
    }
  };

  const handleRemove = (member: TeamMemberItem) => {
    confirm(
      t("team.removeModal.confirm"),
      t("team.removeModal.confirmDesc", { name: member.name }),
      async () => {
        if (!workspaceId) return;
        const res = await fetch(
          `/api/workspaces/${workspaceId}/members?memberId=${member.id}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          toast.success(t("team.removeModal.successToast"));
          setMembers((prev) => prev.filter((m) => m.id !== member.id));
        } else {
          toast.error(t("team.removeModal.errorToast"));
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("team.title")}
            </h1>
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">
            {t("team.description")}
          </p>
        </div>

        {canManage && (
          <Button
            onClick={() => setShowInviteModal(true)}
            className="gap-2 rounded-full self-start sm:self-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {t("team.inviteBtn")}
          </Button>
        )}
      </div>

      {/* Unlimited Members Value Banner */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[12px] font-semibold">
        <Sparkles className="w-4 h-4 shrink-0 text-primary" />
        <span>{t("team.unlimitedBanner")}</span>
      </div>

      {/* Team Member List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-[13px] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Loading team members...</span>
        </div>
      ) : (
        <TeamMemberList
          members={members}
          ownerId={ownerId}
          currentUserId={currentUserId}
          canManage={canManage}
          onEdit={(member) => setEditingMember(member)}
          onRemove={handleRemove}
        />
      )}

      {/* Invite Member Modal */}
      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />

      {/* Edit Member & Permissions Modal */}
      {editingMember && (
        <EditMemberModal
          key={editingMember.id}
          isOpen={Boolean(editingMember)}
          member={editingMember}
          onClose={() => setEditingMember(null)}
          onUpdate={handleUpdateMember}
        />
      )}
    </div>
  );
}
