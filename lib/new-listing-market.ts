/**
 * Everything the New Listing wizard needs to judge a product that has never
 * sold: where its market is, what its band is, and how sure we can be.
 *
 * Two routes to a market:
 *  - TWINS: real cosine-similarity look-alikes exist. The ceiling is read from
 *    the design cluster they concentrate in.
 *  - CATEGORY PRIOR: no credible twins (a zari dupatta has none in this
 *    world). The ceiling is borrowed from related categories at a similar
 *    parcel weight, widened to a ±10% range, and the listing is tagged
 *    NEW / THIN so nobody mistakes the guess for a measurement.
 *
 * Pure: no React. The wizard wraps it in a memo; verify.ts can call it.
 */

import { classifyBand } from "@/engine/band";
import { estimateCeiling } from "@/engine/ceiling";
import { CATEGORY_FAMILY, REVERSE_FREIGHT_MULTIPLIER, RETURN_RATE_BY_CATEGORY } from "@/engine/constants";
import { survivalPrice, type CostInputs } from "@/engine/cost";
import { bestPriceInBand } from "@/engine/launch";
import { freightFor } from "@/engine/money";
import { findTwins, type Twin } from "@/engine/twins";
import { floorBand, probFloorAbove, rtoForCodShare, type FloorBand } from "@/engine/uncertainty";
import type { Traced } from "@/engine/trace";
import type { BandAnalysis, Category, CompetitorListing, DesignCluster, Listing, Seller, World } from "@/engine/types";

/** Fewer credible twins than this, or a best match weaker than this, and we fall back. */
const MIN_TWINS = 5;
const MIN_SIMILARITY = 0.6;
/** The no-twins ceiling is a guess; show it as a ±10% range and widen the ladder to match. */
export const NO_TWIN_SPREAD = 0.1;

export type MarketRoute = "TWINS" | "CATEGORY_PRIOR";

export type NewListingMarket = {
  route: MarketRoute;
  twins: Traced<Twin[]>;
  cluster: DesignCluster | null;
  rivals: CompetitorListing[];
  ceiling: Traced<number>;
  /** Present on the category-prior route only. */
  ceilingRange: { low: number; high: number } | null;
  inputs: CostInputs;
  floor: Traced<number>;
  /** Day zero: the floor as an 80% range, since every rate is borrowed. */
  range: Traced<FloorBand>;
  /** Chance no viable price exists, given that uncertainty. */
  pNoBand: number;
  band: Traced<BandAnalysis>;
  launch: Traced<number> | null;
  /** Typical cost of goods for this kind of product, as an aggregate only. */
  cogsBand: { low: number; median: number; high: number } | null;
};

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))] ?? 0;
}

export function inputsForNewListing(
  seller: Seller,
  category: Category,
  cogs: number,
  grams: number,
  overrides: Partial<CostInputs> = {},
): CostInputs {
  const forward = freightFor(grams || 500);
  return {
    cogs,
    rtoRate: overrides.rtoRate ?? rtoForCodShare(seller.codShare),
    returnRate: overrides.returnRate ?? RETURN_RATE_BY_CATEGORY[category] ?? 0.12,
    adSpendRate: overrides.adSpendRate ?? seller.adSpendRate,
    forwardFreight: overrides.forwardFreight ?? forward,
    reverseFreight: overrides.reverseFreight ?? forward * REVERSE_FREIGHT_MULTIPLIER,
    packaging: overrides.packaging ?? seller.packagingCost,
  };
}

export function resolveNewListingMarket(
  world: World,
  args: { seller: Seller; category: Category; cogs: number; grams: number; overrides?: Partial<CostInputs>; clusterId?: string },
): NewListingMarket {
  const { seller, category, cogs, grams } = args;
  const inputs = inputsForNewListing(seller, category, cogs, grams, args.overrides);

  // The seed is what the seller has told us: category, weight, a price band.
  const seed = {
    category,
    fabric: "unknown",
    weightBand: Math.round(grams / 100) * 100,
    mrpBand: Math.round((cogs * 2.4) / 100) * 100,
    colourFamily: "unknown",
    occasion: "unknown",
    sleeveType: "unknown",
  };
  const twins = findTwins(seed, world.listings, 40);
  const credible = twins.value.filter((t) => t.listing.category === category);
  const hasTwins = credible.length >= MIN_TWINS && (credible[0]?.similarity ?? 0) >= MIN_SIMILARITY;

  let cluster: DesignCluster | null = null;
  let rivals: CompetitorListing[] = [];
  let ceilingRange: NewListingMarket["ceilingRange"] = null;
  let route: MarketRoute = "TWINS";

  if (args.clusterId || hasTwins) {
    let clusterId = args.clusterId ?? "";
    if (!clusterId) {
      const weight = new Map<string, number>();
      for (const t of credible) weight.set(t.listing.clusterId, (weight.get(t.listing.clusterId) ?? 0) + t.similarity);
      clusterId = [...weight.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    }
    cluster = world.clusters.find((c) => c.id === clusterId) ?? null;
    rivals = world.competitors.filter((c) => c.clusterId === clusterId);
  } else {
    // Category × weight prior: related categories, parcels within ±200 g.
    route = "CATEGORY_PRIOR";
    const family = CATEGORY_FAMILY[category] ?? [];
    const near = world.clusters.filter(
      (c) => family.includes(c.category) && Math.abs(c.attributes.weightBand - grams) <= 200,
    );
    const pool = near.length ? near : world.clusters.filter((c) => family.includes(c.category));
    const ids = new Set(pool.map((c) => c.id));
    rivals = world.competitors.filter((c) => ids.has(c.clusterId));
    cluster = pool[0] ? { ...pool[0], id: "prior", name: `${category} (category prior)`, category } : null;
  }

  const ceiling = estimateCeiling(rivals);
  if (route === "CATEGORY_PRIOR") {
    ceilingRange = { low: ceiling.value * (1 - NO_TWIN_SPREAD), high: ceiling.value * (1 + NO_TWIN_SPREAD) };
  }

  const floor = survivalPrice(inputs);
  const range = floorBand(inputs, 0, seller.codShare);
  const band = classifyBand(floor.value, ceiling.value, ceiling.value);

  // Launch at the profit-maximising price inside the band, under this design's
  // demand model — a fresh listing, so no reviews yet.
  let launch: Traced<number> | null = null;
  if (cluster && band.value.widthRupees > 0) {
    const fresh: Listing = {
      id: "new-listing",
      sellerId: seller.id,
      clusterId: cluster.id,
      name: "New listing",
      category,
      price: band.value.bandLow,
      cogs,
      weightGrams: grams,
      mrp: cogs * 2.4,
      rating: 0,
      ratingCount: 0,
      inventory: 50,
      listedDay: world.day,
      stage: "S0_LIST",
      attributes: seed,
    };
    launch = bestPriceInBand(fresh, cluster, rivals, ceiling.value, world.day, inputs, band.value.bandLow, ceiling.value);
    band.value.recommended = launch.value;
  }

  // Aggregate cost of goods for comparable products — never another seller's
  // individual cost, only the spread, used for a gentle plausibility check.
  const comparable = (route === "TWINS" ? credible.map((t) => t.listing) : world.listings.filter((l) => (CATEGORY_FAMILY[category] ?? []).includes(l.category)))
    .map((l) => l.cogs)
    .sort((a, b) => a - b);
  const cogsBand = comparable.length >= 5
    ? { low: quantile(comparable, 0.1), median: quantile(comparable, 0.5), high: quantile(comparable, 0.9) }
    : null;

  return {
    route,
    twins,
    cluster,
    rivals,
    ceiling,
    ceilingRange,
    inputs,
    floor,
    range,
    pNoBand: probFloorAbove(range.value, ceiling.value),
    band,
    launch,
    cogsBand,
  };
}

/** "Is this cost plausible?" — a gentle nudge, never a block. */
export function cogsPlausibility(cogs: number, band: NewListingMarket["cogsBand"]): "low" | "high" | "ok" {
  if (!band || cogs <= 0) return "ok";
  if (cogs < band.low * 0.6) return "low";
  if (cogs > band.high * 1.5) return "high";
  return "ok";
}

/** The cost ladder for a seller who is not sure of her cost: floors at 5 levels. */
export function costLadder(market: NewListingMarket, levels = [0.8, 0.9, 1, 1.1, 1.2]) {
  const centre = market.cogsBand?.median ?? market.inputs.cogs ?? 0;
  return levels.map((f) => {
    const cogs = Math.max(10, Math.round((centre * f) / 5) * 5);
    const floor = survivalPrice({ ...market.inputs, cogs }).value;
    const band = classifyBand(floor, market.ceiling.value, market.ceiling.value);
    return { cogs, floor, verdict: band.value.launch };
  });
}
