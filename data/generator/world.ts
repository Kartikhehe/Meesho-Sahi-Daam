/**
 * World assembly.
 *
 * Builds the whole world from a single seed, then runs the clock forward to
 * create history. Nothing is pre-baked: the 18 months of orders, settlements
 * and alerts are what the simulation actually produced, so the charts show
 * real output of the model rather than authored data.
 */

import { advanceDays } from "@/engine/clock";
import { WORLD_SEED } from "@/engine/constants";
import type { Listing, Seller, World } from "@/engine/types";
import { generateClusters, generateCompetitors, rebalance } from "./clusters";
import { REFERENCE_CLUSTER_ID, heroListings, referenceCluster, referenceCompetitors } from "./reference";
import { startLadder } from "@/engine/bandit";
import { FREIGHT_RECARD } from "@/engine/constants";
import { int, rngFor } from "@/engine/rng";
import { generateListings } from "./listings";
import { PERSONAS } from "./personas";

export type GenerateOptions = {
  seed?: number;
  /** Days of history to simulate. The brief asks for ~18 months. */
  historyDays?: number;
  onProgress?: (done: number, total: number, label: string) => void;
};

/** A world at day 0, before any history is simulated. */
export function buildEmptyWorld(seed: number = WORLD_SEED, startDay = 0, historyDays = startDay): World {
  const clusters = [...generateClusters(seed), referenceCluster()];
  const competitors = [...generateCompetitors(seed, clusters.filter((c) => c.id !== REFERENCE_CLUSTER_ID)), ...rebalance(referenceCompetitors(), clusters)];
  const sellers: Seller[] = PERSONAS.map((p) => ({
    id: p.id,
    name: p.name,
    businessName: p.businessName,
    city: p.city,
    archetype: p.archetype,
    codShare: p.codShare,
    adSpendRate: p.adSpendRate,
    packagingCost: p.packagingCost,
    joinedDay: p.joinedDay,
    treatment: p.treatment,
  }));
  const generated = generateListings(seed, PERSONAS, clusters.filter((c) => c.id !== REFERENCE_CLUSTER_ID), competitors, historyDays);
  const listings = [...withProductTypes(generated, seed, historyDays), ...heroListings(historyDays)];

  return {
    seed,
    day: startDay,
    sellers,
    clusters,
    listings,
    competitors,
    orders: [],
    settlements: [],
    alerts: [],
    experiments: [],
    auditLog: [],
    // A slab re-card three weeks before "today": parcels of 501–1000 g cost 12% more to ship.
    events: [
      {
        day: historyDays - FREIGHT_RECARD.daysBeforeEnd,
        kind: "FREIGHT_RECARD",
        multiplier: FREIGHT_RECARD.multiplier,
        minGrams: 501,
        maxGrams: 1000,
        note: "Valmo re-carded the 501–1000 g slab",
      },
    ],
  };
}

/**
 * How long each product lives. Co-ord sets are trend drops (6–10 weeks), so
 * they are listed recently; sarees, dupattas and jewellery listed in the
 * festive run-up are seasonal, with their exit pre-scheduled at season end
 * (day-of-year 330). Everything else is evergreen.
 */
function withProductTypes(listings: Listing[], seed: number, historyDays: number): Listing[] {
  return listings.map((l) => {
    if (l.category === "co-ord-set") {
      const rng = rngFor(seed, "trend", l.id);
      return { ...l, productType: "trend" as const, listedDay: Math.max(0, historyDays - int(rng, 10, 60)) };
    }
    const doy = ((l.listedDay % 365) + 365) % 365;
    if (["saree", "jewellery-set", "dupatta"].includes(l.category) && doy >= 230 && doy < 330) {
      return { ...l, productType: "seasonal" as const, exitScheduledDay: l.listedDay + (330 - doy) };
    }
    return { ...l, productType: "evergreen" as const };
  });
}

/**
 * Build the world and simulate its history.
 *
 * History runs in chunks so a caller can report progress — generating 18
 * months of orders across ~355 listings takes a moment, and a progress bar is
 * the difference between "working" and "frozen" in a demo.
 */
export function generateWorld(options: GenerateOptions = {}): World {
  const seed = options.seed ?? WORLD_SEED;
  const historyDays = options.historyDays ?? 548;
  const onProgress = options.onProgress;

  // Listings are dated relative to `historyDays` so that by the time history
  // has run, each one has a plausible age and lifecycle stage.
  let world = buildEmptyWorld(seed, 0, historyDays);

  // Anita's re-sourced kurti starts a price ladder 90 days before "today".
  const ladderDay = Math.max(0, historyDays - 90);
  const chunk = 30;
  let elapsed = 0;
  while (elapsed < historyDays) {
    const days = Math.min(chunk, historyDays - elapsed, elapsed < ladderDay ? ladderDay - elapsed : chunk);
    world = advanceDays(world, days).world;
    elapsed += days;
    if (elapsed === ladderDay) world = startHeroLadder(world, ladderDay);
    onProgress?.(elapsed, historyDays, "Simulating orders and settlements");
  }

  return world;
}

function startHeroLadder(world: World, day: number): World {
  const hero = world.listings.find((l) => l.id === "sku-anita-ref");
  if (!hero) return world;
  const exp = startLadder("exp-anita-ref", hero.id, hero.price, day);
  return {
    ...world,
    experiments: [...world.experiments, exp],
    listings: world.listings.map((l) => (l.id === hero.id ? { ...l, experimentId: exp.id } : l)),
  };
}

/** Summary counts, for the Admin simulation screen and the verify script. */
export function worldSummary(world: World) {
  const delivered = world.orders.filter((o) => o.outcome === "delivered").length;
  const rto = world.orders.filter((o) => o.outcome === "rto").length;
  const returned = world.orders.filter((o) => o.outcome === "returned").length;

  return {
    seed: world.seed,
    day: world.day,
    sellers: world.sellers.length,
    clusters: world.clusters.length,
    listings: world.listings.length,
    competitors: world.competitors.length,
    orders: world.orders.length,
    settlements: world.settlements.length,
    alerts: world.alerts.length,
    mutedAlerts: world.alerts.filter((a) => a.muted).length,
    delivered,
    rto,
    returned,
    rtoRate: world.orders.length ? rto / world.orders.length : 0,
    returnRate: world.orders.length ? returned / world.orders.length : 0,
  };
}
