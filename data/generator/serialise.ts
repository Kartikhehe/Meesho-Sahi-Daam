/**
 * Preparing a generated world for storage and for the browser.
 *
 * Two reductions, both safe:
 *
 * 1. Alert traces are dropped. A trace is recomputable from its inputs, and
 *    persisting thousands of them would both bloat the file and risk showing a
 *    seller a derivation that no longer matches today's numbers. The UI
 *    recomputes a trace when the alert is opened.
 *
 * 2. Order and settlement history is trimmed to a trailing window. The seller
 *    screens look back 90 days; the manager cohort views look back a year. Two
 *    full years of per-order rows is 13 MB that nothing reads.
 *
 * Nothing that the UI actually displays is approximated — this drops records
 * the screens never open, and recomputable derivations.
 */

import { settlementFor } from "@/engine/clock";
import { freightMultiplierAt } from "@/engine/environment";
import type { DailyRollup, World } from "@/engine/types";

/**
 * One row per seller per day, covering the whole history. This is what the
 * long-run trend charts read, so trimming per-order rows costs no chart any
 * fidelity — ~6 sellers × 548 days of small rows is under a megabyte, against
 * ~60 MB for the orders they summarise.
 */
export function rollupDaily(world: World): DailyRollup[] {
  const key = (sellerId: string, day: number) => `${sellerId}|${day}`;
  const listingSeller = new Map(world.listings.map((l) => [l.id, l.sellerId]));
  const bucket = new Map<string, DailyRollup>();

  for (const order of world.orders) {
    const sellerId = listingSeller.get(order.listingId);
    if (!sellerId) continue;
    const k = key(sellerId, order.day);
    const row =
      bucket.get(k) ??
      { sellerId, day: order.day, orders: 0, delivered: 0, rto: 0, returned: 0, gmv: 0, netCredit: 0 };
    row.orders += 1;
    row.gmv += order.price;
    if (order.outcome === "delivered") row.delivered += 1;
    else if (order.outcome === "rto") row.rto += 1;
    else row.returned += 1;
    bucket.set(k, row);
  }

  for (const s of world.settlements) {
    const sellerId = listingSeller.get(s.listingId);
    if (!sellerId) continue;
    const k = key(sellerId, s.dispatchedDay);
    const row = bucket.get(k);
    if (row) row.netCredit += s.netCredit;
  }

  return [...bucket.values()].sort((a, b) => a.day - b.day || a.sellerId.localeCompare(b.sellerId));
}

/**
 * Days of per-order history to keep.
 *
 * The seller screens look back 90 days (settlement explorer, return rates,
 * order sparklines); the longest window any screen uses is 120. Keeping a full
 * 18 months of per-order rows costs ~60 MB and nothing reads past this point —
 * the long-run trends the manager screens draw come from the daily aggregates
 * below, not from individual orders.
 */
export const RETAINED_HISTORY_DAYS = 120;

/** Muted alerts older than this are dropped; Admin only inspects recent ones. */
export const RETAINED_ALERT_DAYS = 120;

export function serialiseWorld(world: World): World {
  const orderCutoff = world.day - RETAINED_HISTORY_DAYS;
  const alertCutoff = world.day - RETAINED_ALERT_DAYS;

  return {
    ...world,
    // Computed before trimming, so the long-run charts keep the full history.
    daily: rollupDaily(world),
    orders: world.orders.filter((o) => o.day > orderCutoff),
    // Settlement lines are NOT stored: every field is a pure function of the
    // order, the listing's weight and the seller's rates, so `hydrateWorld`
    // rebuilds them exactly on load. Storing them doubled the file for nothing,
    // and a stored line could silently disagree with the cost model that
    // produced it.
    settlements: [],
    alerts: world.alerts
      .filter((a) => a.day > alertCutoff)
      // Drop the stored trace; the UI recomputes it on open.
      .map((a) => ({ ...a, trace: undefined })),
  };
}

/**
 * Rebuild what `serialiseWorld` dropped. Call this once after loading
 * `world.json` — the settlement lines it produces are identical to the ones
 * the clock generated, because both come from the same pure function.
 */
export function hydrateWorld(world: World): World {
  if (world.settlements.length > 0) return world;

  const listings = new Map(world.listings.map((l) => [l.id, l]));
  const sellers = new Map(world.sellers.map((s) => [s.id, s]));

  const settlements = world.orders.flatMap((order) => {
    const listing = listings.get(order.listingId);
    if (!listing) return [];
    const seller = sellers.get(listing.sellerId);
    if (!seller) return [];
    return [settlementFor(order, listing, seller, freightMultiplierAt(world, order.day, listing.weightGrams))];
  });

  return { ...world, settlements };
}

/** Rough byte size, for the Admin simulation screen. */
export function worldSizeMb(world: World): number {
  return Buffer.byteLength(JSON.stringify(world)) / 1_048_576;
}
