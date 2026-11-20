import { describe, it, expect } from "vitest";
import {
  getDefaultPermissions,
  hasPermission,
  PERMISSION_MODULES,
} from "./team-member-permissions";

describe("team-member-permissions domain logic", () => {
  it("returns full permissions for admin and owner presets", () => {
    const ownerPerms = getDefaultPermissions("owner");
    expect(ownerPerms.inbox).toContain("delete");
    expect(ownerPerms.settings).toContain("manage");

    const adminPerms = getDefaultPermissions("admin");
    expect(adminPerms.inbox).toContain("reply");
    expect(adminPerms.crm).toContain("export");
  });

  it("restricts agent permissions from settings and integrations", () => {
    const agentPerms = getDefaultPermissions("agent");
    expect(agentPerms.inbox).toEqual(["view", "reply"]);
    expect(agentPerms.settings).toEqual([]);
    expect(agentPerms.integrations).toEqual([]);
    expect(agentPerms.crm).not.toContain("delete");
  });

  it("manager has store edit and delete, but no settings manage", () => {
    const managerPerms = getDefaultPermissions("manager");
    expect(managerPerms.store).toContain("delete");
    expect(managerPerms.settings).not.toContain("manage");
  });

  it("hasPermission correctly evaluates owner and fallback permissions", () => {
    // Owner always has all permissions
    expect(hasPermission({}, "owner", "settings", "manage")).toBe(true);

    // Agent has inbox reply but not delete
    expect(hasPermission(null, "agent", "inbox", "reply")).toBe(true);
    expect(hasPermission(null, "agent", "inbox", "delete")).toBe(false);

    // Custom permissions override
    const custom = { inbox: ["view", "reply", "delete"] };
    expect(hasPermission(custom, "custom", "inbox", "delete")).toBe(true);
    expect(hasPermission(custom, "custom", "crm", "edit")).toBe(false);
  });

  it("all modules have valid structure", () => {
    expect(PERMISSION_MODULES.length).toBe(6);
  });
});
