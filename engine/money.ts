/**
 * Money helpers: freight slabs and rupee rounding.
 *
 * Freight is charged by weight SLAB, not per gram. That is what makes
 * packaging weight a real lever rather than a rounding detail — a seller who
 * gets a parcel from 520g down to 490g saves ₹17 on every single order, which
 * is often the difference between a viable band and no band at all.
 */

import { FREIGHT_SLABS } from "./constants";

/** Forward freight for a parcel weight, by slab. */
export function freightFor(grams: number): number {
  for (const slab of FREIGHT_SLABS) {
    if (grams <= slab.maxGrams) return slab.forward;
  }
  return FREIGHT_SLABS[FREIGHT_SLABS.length - 1]?.forward ?? 65;
}

/** The slab a weight falls into, and how far it is from the next one down. */
export function slabFor(grams: number): {
  maxGrams: number;
  forward: number;
  gramsToNextSlabDown: number | null;
  savingIfDropped: number;
} {
  const index = FREIGHT_SLABS.findIndex((s) => grams <= s.maxGrams);
  const idx = index === -1 ? FREIGHT_SLABS.length - 1 : index;
  const slab = FREIGHT_SLABS[idx];
  const below = idx > 0 ? FREIGHT_SLABS[idx - 1] : undefined;

  return {
    maxGrams: slab?.maxGrams ?? 0,
    forward: slab?.forward ?? 65,
    gramsToNextSlabDown: below ? grams - below.maxGrams : null,
    savingIfDropped: below && slab ? slab.forward - below.forward : 0,
  };
}

/** Round to whole rupees, away from zero, so a floor never rounds below itself. */
export function roundRupees(value: number): number {
  return value >= 0 ? Math.ceil(value) : Math.floor(value);
}

/** Two-decimal rupees, for settlement lines where paise matter. */
export function paise(value: number): number {
  return Math.round(value * 100) / 100;
}
