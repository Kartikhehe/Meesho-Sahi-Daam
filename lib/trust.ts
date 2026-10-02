/**
 * The trust ladder: Guided → Assisted → Auto-Pilot.
 *
 *   Guided      we suggest, she changes prices herself (everyone starts here)
 *   Assisted    suggestions queue up and she approves each with one tap
 *               — unlocked after 10 accepted recommendations (our assumption)
 *   Auto-Pilot  we move prices for her inside hard bounds
 *               — unlocked after 40 accepted recommendations (the deck)
 *
 * Auto-Pilot is opt-in, never prices below her own floor × (1 + m), never
 * above the visibility ceiling, never raises a price while the Buyer Price
 * Index guardrail holds upward advice, and every move is undoable in one tap
 * with a plain "why did this change?".
 */

import type { ListingAnalysis } from "./selectors";
import type { TrustMode } from "./store/world-store";
import { inr } from "./format";

export const ASSISTED_AT = 10;
export const AUTOPILOT_AT = 40;

export function unlocked(accepted: number): Record<TrustMode, boolean> {
  return { guided: true, assisted: accepted >= ASSISTED_AT, autopilot: accepted >= AUTOPILOT_AT };
}

export type ProposedMove = { listingId: string; name: string; from: number; to: number; why: string };

/** The moves Auto-Pilot (or the Assisted queue) would make right now. */
export function proposedMoves(analyses: ListingAnalysis[]): ProposedMove[] {
  const out: ProposedMove[] = [];
  for (const a of analyses) {
    const b = a.band.value;
    const to = b.recommended;
    if (!(to > 0) || to === a.listing.price || a.upwardHeld) continue;
    // Hard bounds: never under her own floor plus margin, never over the ceiling.
    if (to < b.bandLow || to > b.ceiling) continue;
    const from = a.listing.price;
    const why =
      from < b.floor
        ? `${inr(from)} was below your survival price of ${inr(b.floor)} — every parcel lost money. ${inr(to)} is the price that earns most inside your band.`
        : from > b.ceiling
          ? `${inr(from)} was above the ${inr(b.ceiling)} visibility ceiling, so buyers were not finding it. ${inr(to)} earns most inside the band.`
          : `${inr(to)} earns more per month than ${inr(from)} under this design's demand, and stays inside your band.`;
    out.push({ listingId: a.listing.id, name: a.listing.name, from, to, why });
  }
  return out;
}
