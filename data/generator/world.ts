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
import type { Seller, World } from "@/engine/types";
import { generateClusters, generateCompetitors } from "./clusters";
import { generateListings } from "./listings";
import { PERSONAS } from "./personas";

export type GenerateOptions = {
  seed?: number;
  /** Days of history to simulate. The brief asks for ~18 months. */
  historyDays?: number;
  onProgress?: (done: number, total: number, label: string) => void;
};

/** A world at day 0, before any history is simulated. */
export function buildEmptyWorld(seed: number = WORLD_SEED, startDay = 0): World {
  const clusters = generateClusters(seed);
  const competitors = generateCompetitors(seed, clusters);
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
  const listings = generateListings(seed, PERSONAS, clusters, competitors, startDay);

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
  };
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
  let world = buildEmptyWorld(seed, 0);
  world = { ...world, listings: seedListingsFor(world, seed, historyDays) };

  const chunk = 30;
  for (let elapsed = 0; elapsed < historyDays; elapsed += chunk) {
    const days = Math.min(chunk, historyDays - elapsed);
    world = advanceDays(world, days).world;
    onProgress?.(elapsed + days, historyDays, "Simulating orders and settlements");
  }

  return world;
}

/** Re-date listings against the full history window. */
function seedListingsFor(world: World, seed: number, historyDays: number) {
  return generateListings(seed, PERSONAS, world.clusters, world.competitors, historyDays);
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
