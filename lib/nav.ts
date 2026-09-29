/**
 * The navigation model. Single source of truth for the sidebar, the mobile tab
 * bar, and the "every route exists" guarantee — each entry here has a matching
 * page from Phase 1 onward, so the app can never 404 from its own navigation.
 */

import type { Capability, Role } from "./access";

export type NavItem = {
  /** Screen code from the brief (S1, M3, A6) — shown in the UI so a demo viewer can follow along. */
  code: string;
  href: string;
  label: string;
  labelHi?: string;
  icon: string;
  capability: Capability;
  /** One line describing what lives here. Used by ComingSoon placeholders. */
  blurb: string;
};

export type NavSection = {
  role: Role;
  title: string;
  items: NavItem[];
};

export const SELLER_NAV: NavItem[] = [
  {
    code: "S1",
    href: "/home",
    label: "Home",
    labelHi: "आज का हिसाब",
    icon: "Home",
    capability: "seller.catalogue",
    blurb: "Money at risk right now, the three things worth doing today, and your business pulse.",
  },
  {
    code: "S2",
    href: "/catalogue",
    label: "My Catalogue",
    labelHi: "मेरा सामान",
    icon: "Package",
    capability: "seller.catalogue",
    blurb: "Every SKU with its Daam Score, floor, ceiling and band position.",
  },
  {
    code: "S4",
    href: "/new-listing",
    label: "New Listing",
    labelHi: "नया सामान",
    icon: "PlusCircle",
    capability: "seller.newListing",
    blurb: "Four steps from a category to a verdict: list, differentiate, or don't list yet.",
  },
  {
    code: "S5",
    href: "/unlock",
    label: "Cost Unlock",
    labelHi: "लागत कम करें",
    icon: "Sliders",
    capability: "seller.unlockSimulator",
    blurb: "Move cost, returns, COD share and ads — watch your floor and band change live.",
  },
  {
    code: "S6",
    href: "/alerts",
    label: "Alerts",
    labelHi: "सूचनाएँ",
    icon: "Bell",
    capability: "seller.alerts",
    blurb: "What changed, what it costs you, and one tap to fix it. Two a week, never more.",
  },
  {
    code: "S7",
    href: "/settlements",
    label: "Settlements",
    labelHi: "पैसा मिला",
    icon: "ReceiptText",
    capability: "seller.settlements",
    blurb: "Order by order: what you shipped, what paid, and where the rest went.",
  },
  {
    code: "S8",
    href: "/learn",
    label: "Learn",
    labelHi: "सीखें",
    icon: "BookOpen",
    capability: "seller.learn",
    blurb: "RTO, reverse freight, contribution — each in one plain sentence, with your own numbers.",
  },
];

export const MANAGER_NAV: NavItem[] = [
  {
    code: "M1",
    href: "/cohort",
    label: "Cohort Health",
    icon: "Activity",
    capability: "manager.cohort",
    blurb: "Sellers covered, listings below floor, NMV at risk, and the 90-day survival curve.",
  },
  {
    code: "M2",
    href: "/sellers",
    label: "Sellers",
    icon: "Users",
    capability: "manager.sellerList",
    blurb: "Ranked by risk, with archetype, bleed rate and days-to-churn. Drill-ins are audited.",
  },
  {
    code: "M3",
    href: "/clusters",
    label: "Cluster Health",
    icon: "LayoutGrid",
    capability: "manager.clusterHealth",
    blurb: "Where the median seller has no viable band — a cost-structure problem, not a pricing one.",
  },
  {
    code: "M4",
    href: "/experiment",
    label: "Experiment",
    icon: "FlaskConical",
    capability: "manager.experiment",
    blurb: "Treated versus control on survival, floor breaches, GMV and Buyer Price Index.",
  },
  {
    code: "M5",
    href: "/queue",
    label: "Intervention Queue",
    icon: "PhoneCall",
    capability: "manager.interventionQueue",
    blurb: "Sellers the tool alone cannot help, with reason codes. A human should call.",
  },
];

export const ADMIN_NAV: NavItem[] = [
  {
    code: "A1",
    href: "/engine-config",
    label: "Engine Config",
    icon: "SlidersHorizontal",
    capability: "admin.engineConfig",
    blurb: "The cost-model inputs and their sources. Changes show blast radius and are audited.",
  },
  {
    code: "A2",
    href: "/triggers",
    label: "Triggers",
    icon: "Zap",
    capability: "admin.triggerThresholds",
    blurb: "Six triggers, their thresholds, fire rates, and the alerts-per-seller-per-week cap.",
  },
  {
    code: "A3",
    href: "/guardrails",
    label: "Guardrails",
    icon: "ShieldCheck",
    capability: "admin.guardrails",
    blurb: "Buyer Price Index gate, alert cap, Auto-Pilot bounds, and the global kill switch.",
  },
  {
    code: "A4",
    href: "/rollout",
    label: "Rollout",
    icon: "Map",
    capability: "admin.rollout",
    blurb: "Feature flags by category, city and cohort percentage across the pilot cities.",
  },
  {
    code: "A5",
    href: "/simulation",
    label: "Simulation",
    icon: "Clock",
    capability: "admin.simulation",
    blurb: "Seed, simulated date, advance the clock, reset, regenerate, export the world.",
  },
  {
    code: "A6",
    href: "/provenance",
    label: "Data Provenance",
    icon: "FileSearch",
    capability: "admin.provenance",
    blurb: "Every parameter, its value, its source, and whether it is a benchmark or an assumption.",
  },
  {
    code: "A7",
    href: "/audit",
    label: "Audit Log",
    icon: "ScrollText",
    capability: "admin.auditLog",
    blurb: "Every config change and every manager drill-in, with actor, before, after and blast radius.",
  },
];

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  seller: SELLER_NAV,
  manager: MANAGER_NAV,
  admin: ADMIN_NAV,
};

/** Seller screens that matter most on a 360px phone get a bottom tab. */
export const MOBILE_TABS: NavItem[] = SELLER_NAV.filter((i) =>
  ["/home", "/catalogue", "/alerts", "/settlements"].includes(i.href),
);

export function findNavItem(href: string): NavItem | undefined {
  return [...SELLER_NAV, ...MANAGER_NAV, ...ADMIN_NAV].find((i) => i.href === href);
}
