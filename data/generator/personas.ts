/**
 * The six sellers.
 *
 * Each persona is defined by BEHAVIOURAL PARAMETERS ONLY — how she sets prices
 * relative to her cluster, what her COD share is, what she spends on ads. The
 * archetype failures (Imran's monthly loss, Suresh's zero orders, Rekha's
 * drifted floors) are not written here and are not special-cased anywhere:
 * they emerge when the demand and cost models run on these parameters.
 *
 * `archetype` below is a label for the UI. `engine/archetype.ts` derives the
 * classification independently from observed behaviour, and the two are
 * expected to agree — if they ever disagree, the derivation is what is true.
 */

import type { Archetype, Seller } from "@/engine/types";

export type PersonaSpec = Seller & {
  /**
   * How she picks a price, relative to her cluster's competitors.
   *  - "offline_markup": cost × markup, ignoring the cluster entirely
   *  - "undercut": cheapest rival − a rupee or two
   *  - "stale": priced once at listing time and never revisited
   *  - "banded": inside the floor-to-ceiling band
   *  - "none": no listings yet
   *  - "mixed": a blend of banded and undercut
   */
  pricingRule: "offline_markup" | "undercut" | "stale" | "banded" | "none" | "mixed";
  /** Multiplier on COGS for the offline-markup rule. */
  offlineMarkup?: number;
  /** Rupees below the cheapest rival, for the undercut rule. */
  undercutBy?: number;
  listingCount: number;
  /** Which categories she stocks. */
  categories: string[];
  /** Narrative label, shown in the UI. Derived independently by the engine. */
  archetypeLabel: Archetype;
  tagline: string;
};

export const PERSONAS: PersonaSpec[] = [
  {
    id: "slr-suresh",
    name: "Suresh Agarwal",
    businessName: "Agarwal Textiles",
    city: "Tirupur",
    archetype: "shopkeeper",
    archetypeLabel: "shopkeeper",
    // Fifteen years of a physical shop: high COD, no ad spend, prices ported
    // straight from the counter. Cost-plus markup that ignores the grid.
    codShare: 0.88,
    adSpendRate: 0.02,
    packagingCost: 9,
    joinedDay: 120,
    treatment: "treated",
    pricingRule: "offline_markup",
    // A shop markup that works over a counter, where there is no freight, no
    // RTO and no ad spend. Online it lands above the visibility ceiling: the
    // price is not greedy, it is simply computed for a different business.
    offlineMarkup: 3.3,
    listingCount: 62,
    categories: ["kurti", "saree", "co-ord-set"],
    tagline: "Ported his shop prices online — ₹449 for a kurti the market sells at ₹329. Dies unseen.",
  },
  {
    id: "slr-imran",
    name: "Imran Sheikh",
    businessName: "Sheikh Trading Co",
    city: "Surat",
    archetype: "matcher",
    archetypeLabel: "matcher",
    // Undercuts everyone, spends hard on ads to hold the top slot, ships a lot
    // of COD into tier-3. Volume looks like success until settlement arrives.
    codShare: 0.8,
    adSpendRate: 0.05,
    packagingCost: 8,
    joinedDay: 60,
    treatment: "treated",
    pricingRule: "undercut",
    undercutBy: 6,
    listingCount: 78,
    categories: ["kurti", "co-ord-set", "saree", "jewellery-set"],
    tagline: "₹299 to undercut every rival: plenty of orders, ₹46 lost on each, about ₹47.5k a month.",
  },
  {
    id: "slr-rekha",
    name: "Rekha Devi",
    businessName: "Rekha Creations",
    city: "Kanpur",
    archetype: "set-and-forgetter",
    archetypeLabel: "set-and-forgetter",
    // Priced once, 11 months ago. Freight slabs and category return rates have
    // drifted underneath her since.
    codShare: 0.79,
    adSpendRate: 0.04,
    packagingCost: 10,
    joinedDay: 30,
    treatment: "treated",
    pricingRule: "stale",
    // Her COD share drifted up as she took orders from smaller towns, and the
    // freight slabs moved under her. She has not re-priced since.
    listingCount: 54,
    categories: ["kurti", "bedsheet", "kitchen-storage"],
    tagline: "Priced once, eleven months ago. A freight re-card and the monsoon return spike moved her floor; her prices did not.",
  },
  {
    id: "slr-anita",
    name: "Anita Rao",
    businessName: "Anita Home Needs",
    city: "Jaipur",
    archetype: "healthy",
    archetypeLabel: "healthy",
    // The control: lower COD share, modest ads, prices inside the band.
    // This is what "good" looks like.
    codShare: 0.61,
    adSpendRate: 0.045,
    packagingCost: 7,
    joinedDay: 15,
    treatment: "control",
    pricingRule: "banded",
    listingCount: 71,
    categories: ["bedsheet", "kitchen-storage", "phone-cover"],
    tagline: "Already prices inside her band. The aspiration state.",
  },
  {
    id: "slr-farida",
    name: "Farida Begum",
    businessName: "FB Ethnic",
    city: "Bareilly",
    archetype: "cold-start",
    archetypeLabel: "cold-start",
    // Day one. No listings, no history — exists to demo the catalog-twin path.
    codShare: 0.85,
    adSpendRate: 0.05,
    packagingCost: 8,
    joinedDay: 540,
    treatment: "treated",
    pricingRule: "none",
    listingCount: 0,
    categories: ["dupatta"],
    tagline: "Day one in Bareilly with zari dupattas — nothing like them is listed, so every number is borrowed.",
  },
  {
    id: "slr-vikram",
    name: "Vikram Joshi",
    businessName: "VJ Enterprises",
    city: "Jaipur",
    archetype: "mixed",
    archetypeLabel: "mixed",
    // The realistic messy case: some listings banded, some undercut.
    codShare: 0.74,
    adSpendRate: 0.055,
    packagingCost: 8,
    joinedDay: 90,
    treatment: "control",
    pricingRule: "mixed",
    undercutBy: 4,
    listingCount: 90,
    categories: ["kurti", "saree", "bedsheet", "phone-cover", "jewellery-set"],
    tagline: "Ninety listings. Some earning well, some quietly bleeding.",
  },
];

/** 62 + 78 + 54 + 71 + 0 + 90 = 355 seller listings; competitors fill the rest. */
export const TOTAL_PERSONA_LISTINGS = PERSONAS.reduce((acc, p) => acc + p.listingCount, 0);
