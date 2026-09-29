/**
 * Band classification — where a price sits between the survival floor and the
 * visibility ceiling.
 *
 * The case that matters most is the INVERTED one: floor above ceiling, where no
 * price both covers her costs and gets seen. Every pricing tool in the market
 * will happily recommend a number here. The honest answer is "don't list this
 * yet — fix your cost or your returns first", and naming that is the single
 * best idea in this product.
 */

import { step, traced, type Traced } from "./trace";
import type { BandAnalysis, BandVerdict } from "./types";

/** Under 5% of headroom is too thin to compete on price alone. */
const THIN_BAND_PCT = 0.05;

/** Prices ending in 9 convert better and read as considered rather than arbitrary. */
export function snapPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rounded = Math.round(value);
  const lastDigit = rounded % 10;
  if (lastDigit === 9) return rounded;
  // Round up to the next number ending in 9, so we never land below the floor.
  return rounded + ((9 - lastDigit + 10) % 10);
}

/**
 * Where to launch inside the band. Sits at 35% of the way up from floor to
 * ceiling — low enough to win visibility, high enough that a small cost drift
 * does not immediately push her under water.
 */
export function recommendedPrice(floor: number, ceiling: number): number {
  if (!Number.isFinite(floor) || floor <= 0) return 0;
  if (ceiling <= floor) return 0; // no viable price
  const raw = floor + (ceiling - floor) * 0.35;
  const snapped = snapPrice(raw);
  // Snapping must never push the recommendation outside the band.
  return snapped > ceiling ? Math.floor(ceiling) : snapped;
}

export function classifyBand(floor: number, ceiling: number, price: number): Traced<BandAnalysis> {
  const widthRupees = ceiling - floor;
  const widthPct = ceiling > 0 ? widthRupees / ceiling : 0;
  const recommended = recommendedPrice(floor, ceiling);

  let verdict: BandVerdict;
  if (!Number.isFinite(floor) || widthRupees <= 0) {
    // The floor sits above the ceiling. No price works.
    verdict = "NO_BAND";
  } else if (price < floor) {
    verdict = "BELOW_FLOOR";
  } else if (price > ceiling) {
    verdict = "ABOVE_GATE";
  } else if (widthPct < THIN_BAND_PCT) {
    verdict = "THIN";
  } else {
    verdict = "HEALTHY";
  }

  const analysis: BandAnalysis = {
    floor,
    ceiling,
    price,
    verdict,
    widthRupees,
    widthPct,
    recommended,
  };

  const trace = [
    step(
      "सुरक्षा दाम — Your survival price",
      "सुरक्षा दाम",
      `₹${Number.isFinite(floor) ? floor.toFixed(2) : "—"}`,
      floor,
      "INR",
      "derived",
      "Below this, every parcel costs you money",
    ),
    step(
      "दिखने की सीमा — Visibility ceiling",
      "दिखने की सीमा",
      `₹${ceiling.toFixed(2)}`,
      ceiling,
      "INR",
      "cluster_model",
      "Above this, buyers stop finding you",
    ),
    step(
      widthRupees > 0 ? "Room between them" : "The floor is above the ceiling",
      widthRupees > 0 ? "बीच की जगह" : "सुरक्षा दाम, सीमा से ऊपर है",
      `₹${ceiling.toFixed(2)} − ₹${Number.isFinite(floor) ? floor.toFixed(2) : "—"}`,
      widthRupees,
      "INR",
      "derived",
      widthRupees > 0
        ? "Any price in here both covers your costs and gets seen"
        : "No price does both. The cost has to come down before this can be listed.",
    ),
    step(
      "Your price today",
      "आपका आज का दाम",
      `₹${price.toFixed(2)}`,
      price,
      "INR",
      "seller_input",
    ),
  ];

  return traced(analysis, trace);
}

export const VERDICT_COPY: Record<
  BandVerdict,
  { label: string; labelHi: string; tone: "danger" | "warning" | "success" | "neutral"; meaning: string }
> = {
  BELOW_FLOOR: {
    label: "Below floor",
    labelHi: "सुरक्षा दाम से नीचे",
    tone: "danger",
    meaning: "Every parcel you ship at this price takes money out of your pocket.",
  },
  THIN: {
    label: "Thin band",
    labelHi: "कम जगह",
    tone: "warning",
    meaning: "There is room, but very little. A small cost change wipes it out.",
  },
  HEALTHY: {
    label: "Healthy",
    labelHi: "ठीक है",
    tone: "success",
    meaning: "This price covers your costs and still gets you seen.",
  },
  ABOVE_GATE: {
    label: "Above the gate",
    labelHi: "सीमा से ऊपर",
    tone: "neutral",
    meaning: "The price is safe for you, but buyers are not seeing this listing.",
  },
  NO_BAND: {
    label: "No viable price",
    labelHi: "कोई सही दाम नहीं",
    tone: "danger",
    meaning:
      "Your cost to serve is above what buyers will pay to find you. Nothing to fix in the price — the cost has to move first.",
  },
};
