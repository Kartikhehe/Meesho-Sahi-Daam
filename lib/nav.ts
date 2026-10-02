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
  /** Which sidebar section the item belongs to. */
  group: string;
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
    group: "today",
    label: "Home",
    labelHi: "आज का हिसाब",
    icon: "Home",
    capability: "seller.catalogue",
    blurb: "Money at risk right now, the three things worth doing today, and your business pulse.",
  },
  {
    code: "S2",
    href: "/catalogue",
    group: "pricing",
    label: "My Catalogue",
    labelHi: "मेरा सामान",
    icon: "Package",
    capability: "seller.catalogue",
    blurb: "Every SKU with its Daam Score, floor, ceiling and band position.",
  },
  {
    code: "S4",
    href: "/new-listing",
    group: "pricing",
    label: "New Listing",
    labelHi: "नया सामान",
    icon: "PlusCircle",
    capability: "seller.newListing",
    blurb: "Four steps from a category to a verdict: list, differentiate, or don't list yet.",
  },
  {
    code: "S9",
    href: "/autopilot",
    group: "pricing",
    label: "Auto-Pilot",
    labelHi: "ऑटो-पायलट",
    icon: "Gauge",
    capability: "seller.autoPilot",
    blurb: "Guided, then Assisted, then Auto-Pilot — earned by accepting suggestions, bounded by your own floor, undoable in one tap.",
  },
  {
    code: "S5",
    href: "/unlock",
    group: "pricing",
    label: "Cost Unlock",
    labelHi: "लागत कम करें",
    icon: "Sliders",
    capability: "seller.unlockSimulator",
    blurb: "Move cost, returns, COD share and ads — watch your floor and band change live.",
  },
  {
    code: "S6",
    href: "/alerts",
    group: "today",
    label: "Alerts",
    labelHi: "सूचनाएँ",
    icon: "Bell",
    capability: "seller.alerts",
    blurb: "What changed, what it costs you, and one tap to fix it. Two a week, never more.",
  },
  {
    code: "S7",
    href: "/settlements",
    group: "money",
    label: "Settlements",
    labelHi: "पैसा मिला",
    icon: "ReceiptText",
    capability: "seller.settlements",
    blurb: "Order by order: what you shipped, what paid, and where the rest went.",
  },
  {
    code: "S8",
    href: "/learn",
    group: "help",
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
    group: "cohort",
    label: "Cohort Health",
    icon: "Activity",
    capability: "manager.cohort",
    blurb: "Sellers covered, listings below floor, NMV at risk, and the 90-day survival curve.",
  },
  {
    code: "M2",
    href: "/sellers",
    group: "cohort",
    label: "Sellers",
    icon: "Users",
    capability: "manager.sellerList",
    blurb: "Ranked by risk, with archetype, bleed rate and days-to-churn. Drill-ins are audited.",
  },
  {
    code: "M3",
    href: "/clusters",
    group: "market",
    label: "Cluster Health",
    icon: "LayoutGrid",
    capability: "manager.clusterHealth",
    blurb: "Where the median seller has no viable band — a cost-structure problem, not a pricing one.",
  },
  {
    code: "M4",
    href: "/experiment",
    group: "evidence",
    label: "Experiment",
    icon: "FlaskConical",
    capability: "manager.experiment",
    blurb: "Treated versus control on survival, floor breaches, GMV and Buyer Price Index.",
  },
  {
    code: "M5",
    href: "/queue",
    group: "cohort",
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
    group: "engine",
    label: "Engine Config",
    icon: "SlidersHorizontal",
    capability: "admin.engineConfig",
    blurb: "The cost-model inputs and their sources. Changes show blast radius and are audited.",
  },
  {
    code: "A8",
    href: "/model",
    group: "engine",
    label: "Model Settings",
    icon: "Settings2",
    capability: "admin.modelSettings",
    blurb: "Band margin, credibility constant, floor-range confidence and regime thresholds — each change audited with its blast radius.",
  },
  {
    code: "A2",
    href: "/triggers",
    group: "engine",
    label: "Triggers",
    icon: "Zap",
    capability: "admin.triggerThresholds",
    blurb: "Six triggers, their thresholds, fire rates, and the alerts-per-seller-per-week cap.",
  },
  {
    code: "A3",
    href: "/guardrails",
    group: "engine",
    label: "Guardrails",
    icon: "ShieldCheck",
    capability: "admin.guardrails",
    blurb: "Buyer Price Index gate, alert cap, Auto-Pilot bounds, and the global kill switch.",
  },
  {
    code: "A4",
    href: "/rollout",
    group: "reach",
    label: "Rollout",
    icon: "Map",
    capability: "admin.rollout",
    blurb: "Feature flags by category, city and cohort percentage across the pilot cities.",
  },
  {
    code: "A5",
    href: "/simulation",
    group: "data",
    label: "Simulation",
    icon: "Clock",
    capability: "admin.simulation",
    blurb: "Seed, simulated date, advance the clock, reset, regenerate, export the world.",
  },
  {
    code: "A6",
    href: "/provenance",
    group: "data",
    label: "Data Provenance",
    icon: "FileSearch",
    capability: "admin.provenance",
    blurb: "Every parameter, its value, its source, and whether it is a benchmark or an assumption.",
  },
  {
    code: "A7",
    href: "/audit",
    group: "data",
    label: "Audit Log",
    icon: "ScrollText",
    capability: "admin.auditLog",
    blurb: "Every config change and every manager drill-in, with actor, before, after and blast radius.",
  },
];

/**
 * Sidebar sections, in display order. Seller sections lead in Hindi, because
 * the seller screens do; manager and admin sections are English.
 */
export const NAV_GROUPS: Record<Role, { key: string; label: string; labelHi?: string }[]> = {
  seller: [
    { key: "today", label: "Today", labelHi: "आज" },
    { key: "pricing", label: "Pricing", labelHi: "दाम" },
    { key: "money", label: "Money", labelHi: "पैसा" },
    { key: "help", label: "Help", labelHi: "मदद" },
  ],
  manager: [
    { key: "cohort", label: "Sellers" },
    { key: "market", label: "Market" },
    { key: "evidence", label: "Evidence" },
  ],
  admin: [
    { key: "engine", label: "Engine" },
    { key: "reach", label: "Reach" },
    { key: "data", label: "Data" },
  ],
};

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  seller: SELLER_NAV,
  manager: MANAGER_NAV,
  admin: ADMIN_NAV,
};

/**
 * Seller screens that matter most on a 360px phone get a bottom tab. Everything
 * else is one tap away under "More", so no screen is unreachable on a phone.
 */
export const MOBILE_TABS: NavItem[] = ["/home", "/catalogue", "/alerts", "/settlements"]
  .map((href) => SELLER_NAV.find((i) => i.href === href))
  .filter((i): i is NavItem => !!i);

export function findNavItem(href: string): NavItem | undefined {
  return [...SELLER_NAV, ...MANAGER_NAV, ...ADMIN_NAV].find((i) => i.href === href);
}
