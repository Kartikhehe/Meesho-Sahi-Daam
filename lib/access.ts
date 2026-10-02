/**
 * Access control, in one module.
 *
 * Nothing in the app checks `role === "admin"` inline. Everything asks `can()`.
 * That is what makes the role boundaries auditable — and it is what makes the
 * Category Manager rule ("cost data only in aggregate; a drill-in to a single
 * seller is written to the audit log") enforceable in a single place rather
 * than hoped for across thirty components.
 *
 * There is no real auth here. This is a demo-safe role switcher, and the
 * boundaries it enforces are product boundaries, not security ones.
 */

export type Role = "seller" | "manager" | "admin";

export const ROLES: readonly Role[] = ["seller", "manager", "admin"] as const;

export const ROLE_LABEL: Record<Role, { en: string; hi: string; blurb: string }> = {
  seller: {
    en: "Seller",
    hi: "विक्रेता",
    blurb: "Your own catalogue only.",
  },
  manager: {
    en: "Category Manager",
    hi: "श्रेणी प्रबंधक",
    blurb: "One category vertical, all sellers within it.",
  },
  admin: {
    en: "Admin",
    hi: "एडमिन",
    blurb: "Everything, plus engine configuration and simulation.",
  },
};

export type Capability =
  // seller scope
  | "seller.catalogue"
  | "seller.editPrice"
  | "seller.newListing"
  | "seller.alerts"
  | "seller.settlements"
  | "seller.unlockSimulator"
  | "seller.learn"
  | "seller.costOverride"
  | "seller.autoPilot"
  // manager scope
  | "manager.cohort"
  | "manager.sellerList"
  | "manager.clusterHealth"
  | "manager.experiment"
  | "manager.interventionQueue"
  | "manager.drillIntoSeller"
  // admin scope
  | "admin.engineConfig"
  | "admin.triggerThresholds"
  | "admin.guardrails"
  | "admin.rollout"
  | "admin.simulation"
  | "admin.provenance"
  | "admin.auditLog"
  | "admin.modelSettings";

const MATRIX: Record<Role, readonly Capability[]> = {
  seller: [
    "seller.catalogue",
    "seller.editPrice",
    "seller.newListing",
    "seller.alerts",
    "seller.settlements",
    "seller.unlockSimulator",
    "seller.learn",
    "seller.costOverride",
    "seller.autoPilot",
  ],
  manager: [
    "manager.cohort",
    "manager.sellerList",
    "manager.clusterHealth",
    "manager.experiment",
    "manager.interventionQueue",
    "manager.drillIntoSeller",
  ],
  admin: [
    "seller.catalogue",
    "seller.editPrice",
    "seller.newListing",
    "seller.alerts",
    "seller.settlements",
    "seller.unlockSimulator",
    "seller.learn",
    "manager.cohort",
    "manager.sellerList",
    "manager.clusterHealth",
    "manager.experiment",
    "manager.interventionQueue",
    "manager.drillIntoSeller",
    "admin.engineConfig",
    "admin.triggerThresholds",
    "admin.guardrails",
    "admin.rollout",
    "admin.simulation",
    "admin.provenance",
    "admin.auditLog",
    "admin.modelSettings",
    "seller.costOverride",
    "seller.autoPilot",
  ],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role].includes(capability);
}

/**
 * Capabilities whose use must be written to the audit log when exercised.
 * A manager opening one seller's cost detail is a support action with a real
 * privacy cost, so it leaves a record. This is a product requirement, not
 * decoration: changing a cost model changes what sellers are told.
 */
const AUDITED: ReadonlySet<Capability> = new Set<Capability>([
  "manager.drillIntoSeller",
  "admin.engineConfig",
  "admin.triggerThresholds",
  "admin.guardrails",
  "admin.rollout",
  "admin.simulation",
  "admin.modelSettings",
  // A seller changing her own cost inputs changes what she is told — audited.
  "seller.costOverride",
  "seller.autoPilot",
]);

export function isAudited(capability: Capability): boolean {
  return AUDITED.has(capability);
}

/**
 * A seller must never be able to infer a rival's cost or floor. Cost-level
 * fields are readable only for your own listings — or by a manager/admin
 * acting deliberately, which is audited above.
 */
export function canSeeCostFor(role: Role, isOwnListing: boolean): boolean {
  if (role === "seller") return isOwnListing;
  return role === "manager" || role === "admin";
}

export const DEFAULT_ROUTE: Record<Role, string> = {
  seller: "/home",
  manager: "/cohort",
  admin: "/simulation",
};
