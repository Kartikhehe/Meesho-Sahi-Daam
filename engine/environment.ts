/**
 * Cost conditions that change over time, so a price set once goes stale.
 *
 *  - FREIGHT RE-CARD: the logistics partner re-prices its weight slabs. A
 *    world records these as dated events; from that day every forward and
 *    return leg costs more.
 *  - MONSOON RETURNS: from July to September parcels get damp, colours run,
 *    buyers send more back. Return rates rise by a fixed share each year.
 *
 * Both feed the clock (orders, settlements) and the floor, so a set-and-forget
 * seller's prices drift below a floor that moved without her — and the
 * COST_DRIFT trigger has something real to find.
 */

import { MONSOON } from "./constants";
import type { World } from "./types";

/** Freight multiplier for a parcel weight, and the return-rate multiplier, on one day. */
export type CostEnv = { freight: (grams: number) => number; returns: number };

/** A re-card hits one weight slab, as real re-cards do: only parcels in [minGrams, maxGrams]. */
export function freightMultiplierAt(world: Pick<World, "events">, day: number, grams: number): number {
  let m = 1;
  for (const e of world.events ?? []) {
    if (e.kind === "FREIGHT_RECARD" && e.day <= day && grams >= e.minGrams && grams <= e.maxGrams) m *= e.multiplier;
  }
  return m;
}

export function returnMultiplierAt(day: number): number {
  const doy = ((day % 365) + 365) % 365;
  return doy >= MONSOON.start && doy <= MONSOON.end ? MONSOON.returnMultiplier : 1;
}

export function envAt(world: Pick<World, "events">, day: number): CostEnv {
  return { freight: (grams) => freightMultiplierAt(world, day, grams), returns: returnMultiplierAt(day) };
}
