/**
 * Cohort-level analysis, for the Category Manager screens.
 *
 * One rule shapes this whole module: a manager sees aggregates, and sees an
 * individual seller's cost detail only by deliberately drilling in — which is
 * audited. So everything here returns counts, rates and distributions, and the
 * per-seller rows carry health indicators rather than her cost model.
 */

import { analyseSeller, summariseSeller, type ListingAnalysis } from "./selectors";
import type { Archetype, Seller, World } from "@/engine/types";

export type SellerHealth = {
  seller: Seller;
  listingCount: number;
  belowFloorCount: number;
  noBandCount: number;
  /** Share of her listings priced under their own floor. */
  belowFloorShare: number;
  monthlyBleed: number;
  monthlyContribution: number;
  ordersLast30: number;
  averageScore: number;
  /** Derived from behaviour, never assigned. */
  archetype: Archetype;
  /** Rough weeks until accumulated losses exhaust a typical working capital. */
  weeksToChurn: number | null;
  /** Has she acted on anything the tool suggested? */
  adoption: "active" | "aware" | "untouched";
  lastActiveDay: number;
};

/**
 * Classify a seller from what she DOES, not from a label attached to her.
 *
 * This is the independent derivation promised in the personas file: the
 * generator sets behavioural parameters, and this reads the resulting
 * behaviour back. The two should agree — and when they do, that is evidence
 * the simulation is coherent rather than staged.
 */
export function deriveArchetype(analyses: ListingAnalysis[]): Archetype {
  if (analyses.length === 0) return "cold-start";

  const n = analyses.length;
  const aboveGate = analyses.filter((a) => a.band.value.verdict === "ABOVE_GATE").length / n;
  const belowFloor = analyses.filter((a) => a.band.value.verdict === "BELOW_FLOOR").length / n;
  const healthy =
    analyses.filter(
      (a) => a.band.value.verdict === "HEALTHY" || a.band.value.verdict === "THIN",
    ).length / n;

  // Priced above the ceiling across the catalogue: the offline shopkeeper who
  // ported her counter prices and now sells almost nothing.
  if (aboveGate > 0.4) return "shopkeeper";

  // Priced under her own floor across the catalogue: the matcher who undercuts
  // every rival without checking what it costs her.
  if (belowFloor > 0.45) return "matcher";

  // Mostly healthy: this is what good looks like.
  if (healthy > 0.45) return "healthy";

  // A significant below-floor tail without the matcher's uniformity — usually
  // prices set once and never revisited while costs drifted underneath.
  if (belowFloor > 0.2) return "set-and-forgetter";

  return "mixed";
}

export function sellerHealth(world: World, seller: Seller): SellerHealth {
  const analyses = analyseSeller(world, seller.id);
  const summary = summariseSeller(analyses);

  const lastActiveDay = Math.max(
    seller.joinedDay,
    ...analyses.map((a) => a.listing.listedDay),
    ...world.orders.filter((o) => analyses.some((a) => a.listing.id === o.listingId)).map((o) => o.day),
  );

  /**
   * Weeks to churn: how long accumulated losses take to consume a typical
   * month of working capital for a seller this size. Deliberately crude, and
   * labelled as an estimate in the UI — its job is to rank who to call first,
   * not to predict a date.
   */
  const monthlyLoss = -summary.monthlyContribution;
  const workingCapital = Math.max(summary.listingCount * 2500, 25000);
  const weeksToChurn =
    monthlyLoss > 0 ? Math.max(1, Math.round((workingCapital / monthlyLoss) * 4.3)) : null;

  const acted = world.alerts.filter((a) => a.sellerId === seller.id && a.acknowledged).length;
  const received = world.alerts.filter((a) => a.sellerId === seller.id && !a.muted).length;
  const adoption: SellerHealth["adoption"] =
    acted > 0 ? "active" : received > 0 ? "aware" : "untouched";

  return {
    seller,
    listingCount: summary.listingCount,
    belowFloorCount: summary.belowFloorCount,
    noBandCount: summary.noBandCount,
    belowFloorShare:
      summary.listingCount > 0
        ? (summary.belowFloorCount + summary.noBandCount) / summary.listingCount
        : 0,
    monthlyBleed: summary.monthlyBleed,
    monthlyContribution: summary.monthlyContribution,
    ordersLast30: summary.ordersLast30,
    averageScore: summary.averageScore,
    archetype: deriveArchetype(analyses),
    weeksToChurn,
    adoption,
    lastActiveDay,
  };
}

export function cohortHealth(world: World): SellerHealth[] {
  return world.sellers
    .map((s) => sellerHealth(world, s))
    .sort((a, b) => a.monthlyContribution - b.monthlyContribution);
}

export type CohortSummary = {
  sellers: number;
  listings: number;
  listingsBelowFloor: number;
  belowFloorShare: number;
  nmvAtRisk: number;
  sellersAtRisk: number;
  treatedCount: number;
  controlCount: number;
};

export function summariseCohort(health: SellerHealth[]): CohortSummary {
  const listings = health.reduce((a, h) => a + h.listingCount, 0);
  const below = health.reduce((a, h) => a + h.belowFloorCount + h.noBandCount, 0);

  return {
    sellers: health.length,
    listings,
    listingsBelowFloor: below,
    belowFloorShare: listings > 0 ? below / listings : 0,
    nmvAtRisk: health.reduce((a, h) => a + Math.abs(h.monthlyBleed), 0),
    sellersAtRisk: health.filter((h) => h.monthlyContribution < 0).length,
    treatedCount: health.filter((h) => h.seller.treatment === "treated").length,
    controlCount: health.filter((h) => h.seller.treatment === "control").length,
  };
}

/** Band-position distribution across the whole cohort, for the histogram. */
export function bandDistribution(world: World): { verdict: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const seller of world.sellers) {
    for (const a of analyseSeller(world, seller.id)) {
      const v = a.band.value.verdict;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
  }
  const LABELS: Record<string, string> = {
    BELOW_FLOOR: "Below floor",
    NO_BAND: "No viable price",
    THIN: "Thin band",
    HEALTHY: "Healthy",
    ABOVE_GATE: "Above the gate",
  };
  return ["BELOW_FLOOR", "NO_BAND", "THIN", "HEALTHY", "ABOVE_GATE"].map((v) => ({
    verdict: v,
    label: LABELS[v] ?? v,
    count: counts.get(v) ?? 0,
  }));
}

/**
 * Per-cluster health — the supply-side insight.
 *
 * Where the MEDIAN seller has no viable band, the problem is not that sellers
 * price badly. It is that the cost to serve that category exceeds what buyers
 * will pay to find it, which is a marketplace problem, not a seller problem.
 */
export type ClusterHealth = {
  clusterId: string;
  name: string;
  category: string;
  listings: number;
  ceiling: number;
  medianFloor: number;
  /** Negative when the median seller cannot make the category work at all. */
  medianBandWidth: number;
  noBandShare: number;
  structurallyBroken: boolean;
};

export function clusterHealth(world: World): ClusterHealth[] {
  const byCluster = new Map<string, ListingAnalysis[]>();
  for (const seller of world.sellers) {
    for (const a of analyseSeller(world, seller.id)) {
      const list = byCluster.get(a.listing.clusterId);
      if (list) list.push(a);
      else byCluster.set(a.listing.clusterId, [a]);
    }
  }

  const out: ClusterHealth[] = [];
  for (const [clusterId, analyses] of byCluster) {
    const cluster = world.clusters.find((c) => c.id === clusterId);
    if (!cluster || analyses.length === 0) continue;

    const floors = analyses.map((a) => a.floor.value).sort((x, y) => x - y);
    const medianFloor = floors[Math.floor(floors.length / 2)] ?? 0;
    const ceiling = analyses[0]?.ceiling.value ?? 0;
    const noBand = analyses.filter((a) => a.band.value.verdict === "NO_BAND").length;

    out.push({
      clusterId,
      name: cluster.name,
      category: cluster.category,
      listings: analyses.length,
      ceiling,
      medianFloor,
      medianBandWidth: ceiling - medianFloor,
      noBandShare: noBand / analyses.length,
      structurallyBroken: ceiling - medianFloor <= 0,
    });
  }

  return out.sort((a, b) => a.medianBandWidth - b.medianBandWidth);
}
