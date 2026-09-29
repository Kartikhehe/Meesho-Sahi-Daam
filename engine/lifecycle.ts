/**
 * The Clock, part one: the listing lifecycle.
 *
 * S0 LIST → S1 DISCOVER (d1-21) → S2 CLIMB (d22-90) → S3 HARVEST (m4-9)
 *         → S4 DEFEND (m10+) → S5 EXIT
 *
 * Each stage has a real entry condition and its own price policy, because the
 * right price genuinely differs by stage: a listing with no reviews needs
 * volume more than margin, and a listing with 400 reviews can hold price
 * against a cheaper rival because buyers trust it.
 */

import type { BandAnalysis, LifecycleStage, Listing } from "./types";

export const STAGE_ORDER: LifecycleStage[] = [
  "S0_LIST",
  "S1_DISCOVER",
  "S2_CLIMB",
  "S3_HARVEST",
  "S4_DEFEND",
  "S5_EXIT",
];

export const STAGE_COPY: Record<
  LifecycleStage,
  { label: string; labelHi: string; window: string; policy: string }
> = {
  S0_LIST: {
    label: "Listing",
    labelHi: "सूची में डालना",
    window: "Day 0",
    policy: "Launch inside the band, low enough to be found.",
  },
  S1_DISCOVER: {
    label: "Discovery",
    labelHi: "खोज",
    window: "Days 1-21",
    policy: "Hold near the launch price. Buy reviews with volume, not margin.",
  },
  S2_CLIMB: {
    label: "Climb",
    labelHi: "चढ़ाई",
    window: "Days 22-90",
    policy: "Reviews are arriving. Test small rises while the band allows.",
  },
  S3_HARVEST: {
    label: "Harvest",
    labelHi: "कमाई",
    window: "Months 4-9",
    policy: "Rating is established. Price for contribution, not share.",
  },
  S4_DEFEND: {
    label: "Defend",
    labelHi: "बचाव",
    window: "Month 10+",
    policy: "Hold against undercutters. Your reviews are worth a premium.",
  },
  S5_EXIT: {
    label: "Exit",
    labelHi: "बंद",
    window: "—",
    policy: "Clear stock. This design has stopped earning.",
  },
};

/** Days since the listing went live. */
export function ageInDays(listing: Listing, day: number): number {
  return Math.max(0, day - listing.listedDay);
}

/**
 * The stage a listing should be in. Age drives the main progression, but two
 * conditions override it: a listing with no stock and no orders exits, and a
 * listing that is still invisible after its discovery window does not get to
 * "climb" simply because time passed.
 */
export function advanceStage(
  listing: Listing,
  day: number,
  opts: { ordersLast30: number; band?: BandAnalysis },
): LifecycleStage {
  const age = ageInDays(listing, day);

  // Exit: out of stock with nothing moving, or long-dead.
  if (listing.inventory <= 0 && opts.ordersLast30 === 0) return "S5_EXIT";
  if (age > 365 && opts.ordersLast30 === 0) return "S5_EXIT";

  if (age === 0) return "S0_LIST";
  if (age <= 21) return "S1_DISCOVER";

  // A listing nobody can see stays in discovery — it never earned its climb.
  if (opts.band?.verdict === "ABOVE_GATE" && opts.ordersLast30 < 3) return "S1_DISCOVER";

  if (age <= 90) return "S2_CLIMB";
  if (age <= 270) return "S3_HARVEST";
  return "S4_DEFEND";
}

/**
 * Where in the band this stage wants to sit, as a fraction from floor to
 * ceiling. Discovery prices low to be found; harvest and defend climb, because
 * an established rating buys tolerance for a higher price.
 */
export function stagePricePosition(stage: LifecycleStage): number {
  switch (stage) {
    case "S0_LIST":
      return 0.35;
    case "S1_DISCOVER":
      return 0.3;
    case "S2_CLIMB":
      return 0.45;
    case "S3_HARVEST":
      return 0.6;
    case "S4_DEFEND":
      return 0.55;
    case "S5_EXIT":
      return 0.15;
  }
}

/** The price this stage's policy suggests, given the band. */
export function stageTargetPrice(stage: LifecycleStage, band: BandAnalysis): number {
  if (band.widthRupees <= 0) return 0; // no viable price
  return Math.round(band.floor + band.widthRupees * stagePricePosition(stage));
}
