/**
 * The Buyer Price Index guardrail, computed from the prices actually listed.
 *
 * BPI = average listed price of treated sellers ÷ that of control sellers × 100.
 * Above the gate the tool is making shopping dearer, and every suggestion that
 * would raise a price is held back until it falls again.
 */

import { BUYER_PRICE_INDEX_GATE } from "@/engine/constants";
import type { World } from "@/engine/types";

export function buyerPriceIndex(world: World): number {
  const treated = new Set(world.sellers.filter((s) => s.treatment === "treated").map((s) => s.id));
  let t = 0, tn = 0, c = 0, cn = 0;
  for (const l of world.listings) {
    if (treated.has(l.sellerId)) { t += l.price; tn += 1; } else { c += l.price; cn += 1; }
  }
  if (!tn || !cn) return 100;
  return (t / tn / (c / cn)) * 100;
}

export function upwardPaused(world: World): boolean {
  return buyerPriceIndex(world) > BUYER_PRICE_INDEX_GATE;
}

/**
 * The admin's demo lever, applied for real: every treated seller's listed price
 * raised by `bump`. Every screen then sees those prices, and the BPI moves with
 * them. Setting it back to 0 restores the originals.
 */
export function applyPriceBump(world: World, bump: number): World {
  if (!bump) return world;
  const treated = new Set(world.sellers.filter((s) => s.treatment === "treated").map((s) => s.id));
  return {
    ...world,
    listings: world.listings.map((l) => (treated.has(l.sellerId) ? { ...l, price: Math.round(l.price * (1 + bump)) } : l)),
  };
}
