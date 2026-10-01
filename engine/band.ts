/**
 * Band classification — where a price sits between the survival floor and the
 * visibility ceiling, and what to do about a new listing.
 *
 * Round-2 rule. The band is [floor × (1 + m), ceiling] with a safety margin m
 * (3% by default, seller-adjustable): pricing exactly at break-even leaves no
 * room for a bad week. Its width, as a share of the ceiling, picks the verdict:
 *
 *   ≤ 0      DON'T LIST YET     no price both pays and gets seen
 *   0–5%     DIFFERENTIATE      a band too thin to compete on price alone
 *   5–15%    LAUNCH AT PROFIT-MAX   argmax of expected contribution in the band
 *   > 15%    PRICE FOR MARGIN   plenty of room — and a design worth flagging to
 *                               sourcing (C2M), because rivals will notice
 */

import { BAND_MARGIN } from "./constants";
import { step, traced, type Traced } from "./trace";
import type { BandAnalysis, BandVerdict, LaunchVerdict } from "./types";

/** Prices ending in 9 read as considered rather than arbitrary. */
export function snapPrice(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rounded = Math.round(value);
  return rounded + ((9 - (rounded % 10) + 10) % 10);
}

export function launchVerdict(widthPct: number): LaunchVerdict {
  if (widthPct <= 0) return "DONT_LIST";
  if (widthPct < 0.05) return "DIFFERENTIATE";
  if (widthPct <= 0.15) return "PROFIT_MAX";
  return "PRICE_FOR_MARGIN";
}

/**
 * A fallback suggestion when no demand curve is available: 35% of the way up
 * the band. Wherever a demand model exists, callers replace it with the
 * profit-maximising price (engine/launch.ts).
 */
export function recommendedPrice(floor: number, ceiling: number, margin = BAND_MARGIN): number {
  const low = floor * (1 + margin);
  if (!Number.isFinite(floor) || floor <= 0 || ceiling <= low) return 0;
  const snapped = snapPrice(low + (ceiling - low) * 0.35);
  return snapped > ceiling ? Math.floor(ceiling) : snapped;
}

export function classifyBand(
  floor: number,
  ceiling: number,
  price: number,
  margin: number = BAND_MARGIN,
): Traced<BandAnalysis> {
  const bandLow = floor * (1 + margin);
  const widthRupees = ceiling - bandLow;
  const widthPct = ceiling > 0 ? widthRupees / ceiling : 0;

  let verdict: BandVerdict;
  if (!Number.isFinite(floor) || widthRupees <= 0) verdict = "NO_BAND";
  else if (price < floor) verdict = "BELOW_FLOOR";
  else if (price > ceiling) verdict = "ABOVE_GATE";
  else if (widthPct < 0.05) verdict = "THIN";
  else verdict = "HEALTHY";

  const analysis: BandAnalysis = {
    floor,
    ceiling,
    price,
    verdict,
    bandLow,
    margin,
    widthRupees,
    widthPct,
    launch: launchVerdict(Number.isFinite(widthPct) ? widthPct : -1),
    recommended: recommendedPrice(floor, ceiling, margin),
  };

  const f = Number.isFinite(floor) ? floor.toFixed(2) : "—";
  return traced(analysis, [
    step("सुरक्षा दाम — Your survival price", "सुरक्षा दाम", `₹${f}`, floor, "INR", "derived", "Below this, every parcel costs you money"),
    step("Lowest safe price", "सबसे कम सुरक्षित दाम", `₹${f} × (1 + ${(margin * 100).toFixed(0)}%)`, bandLow, "INR", "derived", "A small cushion above break-even, so one bad week does not tip you under"),
    step("दिखने की सीमा — Visibility ceiling", "दिखने की सीमा", `₹${ceiling.toFixed(2)}`, ceiling, "INR", "cluster_model", "Above this, buyers stop finding you"),
    step(
      widthRupees > 0 ? "Room between them" : "No room: the floor is above the ceiling",
      widthRupees > 0 ? "बीच की जगह" : "कोई जगह नहीं",
      `₹${ceiling.toFixed(2)} − ₹${bandLow.toFixed(2)} = ${(widthPct * 100).toFixed(1)}% of the ceiling`,
      widthRupees,
      "INR",
      "derived",
      widthRupees > 0 ? "Any price in here both covers your costs and gets seen" : "No price does both. The cost has to come down first.",
    ),
    step("Your price today", "आपका आज का दाम", `₹${price.toFixed(2)}`, price, "INR", "seller_input"),
  ]);
}

export const LAUNCH_COPY: Record<LaunchVerdict, { label: string; labelHi: string; tone: "danger" | "warning" | "success" | "info" }> = {
  DONT_LIST: { label: "Don't list yet", labelHi: "अभी मत डालें", tone: "danger" },
  DIFFERENTIATE: { label: "Differentiate first", labelHi: "पहले अलग बनाएँ", tone: "warning" },
  PROFIT_MAX: { label: "Launch at the best price", labelHi: "सबसे अच्छे दाम पर डालें", tone: "success" },
  PRICE_FOR_MARGIN: { label: "Price for margin", labelHi: "मुनाफ़े के लिए दाम", tone: "info" },
};

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
