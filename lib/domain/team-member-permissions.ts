/**
 * Granular Role-Based Access Control (RBAC) definitions for Workspace Team Members.
 */

export const PERMISSION_MODULES = [
  "inbox",
  "crm",
  "store",
  "ai_agent",
  "integrations",
  "settings",
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export interface ModuleActionDef {
  action: string;
  labelKey: string;
  label: string;
  descriptionKey?: string;
  description?: string;
}

export interface ModuleDef {
  id: PermissionModule;
  labelKey: string;
  label: string;
  descriptionKey: string;
  description: string;
  actions: ModuleActionDef[];
}

export const MODULE_DEFINITIONS: ModuleDef[] = [
  {
    id: "inbox",
    labelKey: "team.modules.inbox.title",
    label: "Live Inbox & Chats",
    descriptionKey: "team.modules.inbox.description",
    description: "Customer conversations across WhatsApp, Facebook, Instagram & Web",
    actions: [
      { action: "view", labelKey: "team.actions.view", label: "View" },
      { action: "reply", labelKey: "team.actions.reply", label: "Reply & Assign" },
      { action: "delete", labelKey: "team.actions.delete", label: "Delete Chat" },
    ],
  },
  {
    id: "crm",
    labelKey: "team.modules.crm.title",
    label: "CRM & Contacts",
    descriptionKey: "team.modules.crm.description",
    description: "Customer database, lifecycle stages, notes & tags",
    actions: [
      { action: "view", labelKey: "team.actions.view", label: "View" },
      { action: "edit", labelKey: "team.actions.edit", label: "Add & Edit" },
      { action: "delete", labelKey: "team.actions.delete", label: "Delete" },
      { action: "export", labelKey: "team.actions.export", label: "Export" },
    ],
  },
  {
    id: "store",
    labelKey: "team.modules.store.title",
    label: "Store (Products & Orders)",
    descriptionKey: "team.modules.store.description",
    description: "Product catalog, inventory and customer order processing",
    actions: [
      { action: "view", labelKey: "team.actions.view", label: "View" },
      { action: "edit", labelKey: "team.actions.edit", label: "Add & Edit Orders/Products" },
      { action: "delete", labelKey: "team.actions.delete", label: "Delete" },
    ],
  },
  {
    id: "ai_agent",
    labelKey: "team.modules.aiAgent.title",
    label: "AI Agent & Brain",
    descriptionKey: "team.modules.aiAgent.description",
    description: "AI bot personas, knowledge base training, prompts & instructions",
    actions: [
      { action: "view", labelKey: "team.actions.view", label: "View" },
      { action: "train", labelKey: "team.actions.train", label: "Train & Upload Sources" },
      { action: "delete", labelKey: "team.actions.delete", label: "Delete Bot/Data" },
    ],
  },
  {
    id: "integrations",
    labelKey: "team.modules.integrations.title",
    label: "Channels & Integrations",
    descriptionKey: "team.modules.integrations.description",
    description: "Facebook, Instagram, WhatsApp Cloud API, and web widgets",
    actions: [
      { action: "view", labelKey: "team.actions.view", label: "View" },
      { action: "manage", labelKey: "team.actions.manage", label: "Connect & Disconnect" },
    ],
  },
  {
    id: "settings",
    labelKey: "team.modules.settings.title",
    label: "Workspace & Billing",
    descriptionKey: "team.modules.settings.description",
    description: "Business profile, team members, usage credits and subscription plan",
    actions: [
      { action: "view", labelKey: "team.actions.view", label: "View" },
      { action: "manage", labelKey: "team.actions.manage", label: "Manage Settings" },
    ],
  },
];

export type MemberPermissions = {
  [K in PermissionModule]?: string[];
};

export const MEMBER_ROLES = [
  "admin",
  "manager",
  "agent",
  "viewer",
  "custom",
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number] | "owner";

export interface RolePresetDef {
  id: (typeof MEMBER_ROLES)[number];
  labelKey: string;
  label: string;
  descKey: string;
  description: string;
}

export const ROLE_PRESET_DEFINITIONS: RolePresetDef[] = [
  {
    id: "admin",
    labelKey: "team.roles.admin",
    label: "Admin",
    descKey: "team.roleDescriptions.admin",
    description: "Full access across all workspace tools & data",
  },
  {
    id: "manager",
    labelKey: "team.roles.manager",
    label: "Manager",
    descKey: "team.roleDescriptions.manager",
    description: "Manage products, orders, CRM & inbox conversations",
  },
  {
    id: "agent",
    labelKey: "team.roles.agent",
    label: "Agent",
    descKey: "team.roleDescriptions.agent",
    description: "Support customers via Live Inbox & manage CRM contacts",
  },
  {
    id: "viewer",
    labelKey: "team.roles.viewer",
    label: "Viewer",
    descKey: "team.roleDescriptions.viewer",
    description: "Read-only access to view chats, store data & reports",
  },
  {
    id: "custom",
    labelKey: "team.roles.custom",
    label: "Custom",
    descKey: "team.roleDescriptions.custom",
    description: "Tailor custom permissions for each feature individually",
  },
];

/**
 * Default preset permissions mapped to roles.
 */
export const ROLE_PRESET_PERMISSIONS: Record<
  Exclude<MemberRole, "custom">,
  MemberPermissions
> = {
  owner: {
    inbox: ["view", "reply", "delete"],
    crm: ["view", "edit", "delete", "export"],
    store: ["view", "edit", "delete"],
    ai_agent: ["view", "train", "delete"],
    integrations: ["view", "manage"],
    settings: ["view", "manage"],
  },
  admin: {
    inbox: ["view", "reply", "delete"],
    crm: ["view", "edit", "delete", "export"],
    store: ["view", "edit", "delete"],
    ai_agent: ["view", "train", "delete"],
    integrations: ["view", "manage"],
    settings: ["view"],
  },
  manager: {
    inbox: ["view", "reply"],
    crm: ["view", "edit", "export"],
    store: ["view", "edit", "delete"],
    ai_agent: ["view"],
    integrations: ["view"],
    settings: ["view"],
  },
  agent: {
    inbox: ["view", "reply"],
    crm: ["view", "edit"],
    store: ["view"],
    ai_agent: ["view"],
    integrations: [],
    settings: [],
  },
  viewer: {
    inbox: ["view"],
    crm: ["view"],
    store: ["view"],
    ai_agent: ["view"],
    integrations: ["view"],
    settings: [],
  },
};

/**
 * Returns default permissions for any role (fallback to Agent if unknown).
 */
export function getDefaultPermissions(role: string): MemberPermissions {
  const normalized = role?.toLowerCase() as Exclude<MemberRole, "custom">;
  if (normalized in ROLE_PRESET_PERMISSIONS) {
    return JSON.parse(JSON.stringify(ROLE_PRESET_PERMISSIONS[normalized]));
  }
  return JSON.parse(JSON.stringify(ROLE_PRESET_PERMISSIONS.agent));
}

/**
 * Check if a member has a specific permission.
 * Owner always returns true.
 */
export function hasPermission(
  permissions: MemberPermissions | null | undefined,
  role: string,
  module: PermissionModule,
  action: string
): boolean {
  if (role === "owner" || role === "admin") return true;
  if (!permissions) {
    const defaults = getDefaultPermissions(role);
    return defaults[module]?.includes(action) ?? false;
  }
  return permissions[module]?.includes(action) ?? false;
}
