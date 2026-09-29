/**
 * The visibility ceiling.
 *
 * The ceiling is a property of the CLUSTER, not of the seller: it is the price
 * above which buyers stop finding you, because the grid is sorted by price and
 * there are forty near-identical listings below you.
 *
 * Computed as the 85th percentile of the ORDER-WEIGHTED price distribution —
 * weighting by order share rather than by listing count, because ten dead
 * listings at ₹500 should not lift the ceiling. Cross-checked against
 * winning price × 1.07.
 */

import { CEILING_OVER_WINNING, CEILING_PERCENTILE } from "./constants";
import { step, traced, type Traced } from "./trace";
import type { CompetitorListing } from "./types";

/** The price that currently takes the largest share of the cluster's orders. */
export function winningPrice(competitors: CompetitorListing[]): number {
  if (competitors.length === 0) return 0;
  const best = competitors.reduce((a, b) => (b.orderShare > a.orderShare ? b : a));
  return best.price;
}

/**
 * Order-weighted percentile of price. Each listing contributes weight equal to
 * its share of orders, so the distribution reflects what buyers actually buy.
 */
export function orderWeightedPercentile(competitors: CompetitorListing[], p: number): number {
  if (competitors.length === 0) return 0;
  const sorted = [...competitors].sort((a, b) => a.price - b.price);
  const total = sorted.reduce((acc, c) => acc + c.orderShare, 0);
  if (total <= 0) {
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
    return sorted[idx]?.price ?? 0;
  }
  let cum = 0;
  for (const c of sorted) {
    cum += c.orderShare / total;
    if (cum >= p) return c.price;
  }
  return sorted[sorted.length - 1]?.price ?? 0;
}

/**
 * The cluster's ceiling. Blends the order-weighted percentile with the
 * winning-price multiple: the percentile alone is jumpy in thin clusters, and
 * the multiple alone ignores the real shape of the distribution.
 */
export function estimateCeiling(competitors: CompetitorListing[]): Traced<number> {
  if (competitors.length === 0) {
    return traced(0, [
      step(
        "No competing listings found",
        "कोई प्रतियोगी नहीं मिला",
        "—",
        0,
        "INR",
        "cluster_model",
        "Without rivals we cannot estimate a ceiling",
      ),
    ]);
  }

  const winning = winningPrice(competitors);
  const percentile = orderWeightedPercentile(competitors, CEILING_PERCENTILE);
  const fromWinning = winning * CEILING_OVER_WINNING;
  const value = (percentile + fromWinning) / 2;

  return traced(value, [
    step(
      "Rival listings in this design",
      "इस डिज़ाइन के प्रतियोगी",
      `${competitors.length} listings`,
      competitors.length,
      "COUNT",
      "cluster_model",
      "Listings buyers see next to yours",
    ),
    step(
      "जीतने वाला दाम — Winning price",
      "जीतने वाला दाम",
      `₹${winning.toFixed(0)}`,
      winning,
      "INR",
      "cluster_model",
      "The price taking the largest share of orders right now",
    ),
    step(
      "Where 85% of orders happen below",
      "85% ऑर्डर इससे नीचे",
      `85th percentile, weighted by orders`,
      percentile,
      "INR",
      "cluster_model",
      "Weighted by orders, so dead listings do not lift it",
    ),
    step(
      "Ceiling from the winning price",
      "जीतने वाले दाम से सीमा",
      `₹${winning.toFixed(0)} × ${CEILING_OVER_WINNING}`,
      fromWinning,
      "INR",
      "cluster_model",
    ),
    step(
      "दिखने की सीमा — Visibility ceiling",
      "दिखने की सीमा",
      `(₹${percentile.toFixed(0)} + ₹${fromWinning.toFixed(0)}) ÷ 2`,
      value,
      "INR",
      "derived",
      "Above this price, buyers stop finding you",
    ),
  ]);
}
