/**
 * The Daam Score, 0-100.
 *
 * A single number a seller can scan across 90 SKUs. It has to be honest about
 * what it rewards, so it is a weighted blend of four things she can actually
 * act on, and the trace shows each component's contribution.
 *
 * A listing priced below its own floor is capped at 25 no matter how well it
 * scores elsewhere — a high score on a loss-making listing would be a lie.
 */

import { step, traced, type Traced } from "./trace";
import type { BandAnalysis } from "./types";

export type ScoreParts = {
  bandPosition: number;
  contribution: number;
  visibility: number;
  freshness: number;
};

const WEIGHTS = { bandPosition: 0.4, contribution: 0.3, visibility: 0.2, freshness: 0.1 };

/** 100 when sitting at the band's sweet spot, falling off toward either edge. */
function bandPositionScore(band: BandAnalysis): number {
  if (band.widthRupees <= 0) return 0;
  if (band.price < band.floor) return 0;
  if (band.price > band.ceiling) return 25;
  const position = (band.price - band.floor) / band.widthRupees;
  // Sweet spot around 0.35-0.55 of the band.
  const distance = Math.abs(position - 0.45);
  return Math.max(0, 100 - distance * 180);
}

function contributionScore(contributionPerOrder: number, price: number): number {
  if (price <= 0) return 0;
  const margin = contributionPerOrder / price;
  if (margin <= 0) return 0;
  // 12% contribution margin reads as a full score for this category of goods.
  return Math.min(100, (margin / 0.12) * 100);
}

function visibilityScore(gate: number): number {
  return Math.max(0, Math.min(100, gate * 100));
}

function freshnessScore(daysSincePriceChange: number): number {
  if (daysSincePriceChange <= 30) return 100;
  if (daysSincePriceChange >= 240) return 0;
  return Math.round(100 * (1 - (daysSincePriceChange - 30) / 210));
}

export function daamScore(input: {
  band: BandAnalysis;
  contributionPerOrder: number;
  visibilityGate: number;
  daysSincePriceChange: number;
}): Traced<number> {
  const parts: ScoreParts = {
    bandPosition: bandPositionScore(input.band),
    contribution: contributionScore(input.contributionPerOrder, input.band.price),
    visibility: visibilityScore(input.visibilityGate),
    freshness: freshnessScore(input.daysSincePriceChange),
  };

  let value =
    parts.bandPosition * WEIGHTS.bandPosition +
    parts.contribution * WEIGHTS.contribution +
    parts.visibility * WEIGHTS.visibility +
    parts.freshness * WEIGHTS.freshness;

  // A loss-making listing can never look healthy, whatever else is true of it.
  const belowFloor = input.band.verdict === "BELOW_FLOOR" || input.band.verdict === "NO_BAND";
  if (belowFloor) value = Math.min(value, 25);

  const rounded = Math.round(Math.max(0, Math.min(100, value)));

  return traced(rounded, [
    step(
      "Where your price sits in the band",
      "बैंड में आपका दाम",
      `${(WEIGHTS.bandPosition * 100).toFixed(0)}% of the score`,
      parts.bandPosition,
      "COUNT",
      "derived",
      "Best near the lower-middle of the band",
    ),
    step(
      "What you earn per order",
      "हर ऑर्डर पर कमाई",
      `${(WEIGHTS.contribution * 100).toFixed(0)}% of the score`,
      parts.contribution,
      "COUNT",
      "derived",
    ),
    step(
      "How often buyers see you",
      "कितनी बार दिखे",
      `${(WEIGHTS.visibility * 100).toFixed(0)}% of the score`,
      parts.visibility,
      "COUNT",
      "cluster_model",
    ),
    step(
      "How recently you checked the price",
      "दाम कब देखा था",
      `${(WEIGHTS.freshness * 100).toFixed(0)}% of the score`,
      parts.freshness,
      "COUNT",
      "platform_ledger",
      `${input.daysSincePriceChange} days since you last changed it`,
    ),
    ...(belowFloor
      ? [
          step(
            "Capped: this listing loses money",
            "सीमित: इस पर नुकसान है",
            "score capped at 25",
            25,
            "COUNT",
            "derived",
            "No listing priced below its own floor can score well",
          ),
        ]
      : []),
    step("दाम स्कोर — Daam Score", "दाम स्कोर", "weighted total", rounded, "COUNT", "derived"),
  ]);
}

export function scoreBadge(score: number): { label: string; tone: "danger" | "warning" | "success" } {
  if (score < 40) return { label: "Needs attention", tone: "danger" };
  if (score < 70) return { label: "Could be better", tone: "warning" };
  return { label: "Healthy", tone: "success" };
}
