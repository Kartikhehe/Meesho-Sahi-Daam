/**
 * Market regimes — the answer to "what about less competitive categories?"
 *
 * One pricing tempo does not fit every design. Each cluster is classified from
 * data the world already has, on two axes:
 *
 *   crowding    how many CREDIBLE rivals there are (rated 4.0+ and taking at
 *               least 2.5% of orders) — not how many listings exist
 *   dispersion  how spread rival prices are (coefficient of variation); a
 *               tight spread means buyers see a commodity and sort by price
 *
 *                 tight prices      spread prices
 *   crowded       RED OCEAN         CONTESTED
 *   few rivals    NEW / THIN        NICHE
 *
 * Each regime sets its own clock: how wide the price ladder tests, how fast
 * the harvest stage climbs, and how steep the visibility cliff is.
 */

import { step, traced, type Traced } from "./trace";
import type { CompetitorListing } from "./types";

export type Regime = "RED_OCEAN" | "CONTESTED" | "NICHE" | "NEW_THIN";

export type RegimeThresholds = {
  /** Credible rivals at or above which a design is crowded. */
  crowdedAt: number;
  /** A credible rival's minimum rating and share of orders. */
  credibleRating: number;
  credibleShare: number;
  /** Coefficient of variation of prices at or above which prices are dispersed. */
  dispersedAt: number;
};

export const DEFAULT_REGIME_THRESHOLDS: RegimeThresholds = {
  crowdedAt: 10,
  credibleRating: 4.0,
  credibleShare: 0.025,
  dispersedAt: 0.03,
};

export type RegimeTempo = {
  label: string;
  labelHi: string;
  /** Price ladder rungs at ±this share of the launch price. */
  ladder: number;
  /** Harvest stage: raise by this share every `harvestDays`. */
  harvestStep: number;
  harvestDays: number;
  /** Multiplier on the visibility gate's width: >1 is a gentler cliff. */
  gateSoftness: number;
  note: string;
};

export const REGIME_TEMPO: Record<Regime, RegimeTempo> = {
  RED_OCEAN: { label: "Red ocean", labelHi: "भीड़ भरा बाज़ार", ladder: 0.04, harvestStep: 0.01, harvestDays: 21, gateSoftness: 1, note: "Crowded and commodity: the ceiling is a cliff, DEFEND dominates, DON'T LIST is common." },
  CONTESTED: { label: "Contested", labelHi: "कड़ा मुकाबला", ladder: 0.06, harvestStep: 0.02, harvestDays: 14, gateSoftness: 1.2, note: "Crowded but quality is rewarded: about ₹6 of headroom per rating point." },
  NICHE: { label: "Niche", labelHi: "खास बाज़ार", ladder: 0.1, harvestStep: 0.04, harvestDays: 14, gateSoftness: 1.8, note: "Few rivals and spread prices: a gentle demand slope, DEFEND rarely triggered." },
  NEW_THIN: { label: "New / thin", labelHi: "नया बाज़ार", ladder: 0.08, harvestStep: 0.02, harvestDays: 28, gateSoftness: 1.4, note: "Few rivals and little data: a category prior, a range not a point, a 28-day ladder." },
};

export function regimeSignals(rivals: CompetitorListing[], t: RegimeThresholds = DEFAULT_REGIME_THRESHOLDS) {
  const credible = rivals.filter((r) => r.rating >= t.credibleRating && r.orderShare >= t.credibleShare).length;
  const prices = rivals.map((r) => r.price);
  const mean = prices.reduce((a, b) => a + b, 0) / Math.max(prices.length, 1);
  const sd = Math.sqrt(prices.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(prices.length, 1));
  const cv = mean > 0 ? sd / mean : 0;
  const topShare = rivals.reduce((m, r) => Math.max(m, r.orderShare), 0);
  return { credible, cv, topShare };
}

export function classifyRegime(rivals: CompetitorListing[], t: RegimeThresholds = DEFAULT_REGIME_THRESHOLDS): Traced<Regime> {
  const { credible, cv, topShare } = regimeSignals(rivals, t);
  const crowded = credible >= t.crowdedAt;
  const dispersed = cv >= t.dispersedAt;
  const regime: Regime = crowded ? (dispersed ? "CONTESTED" : "RED_OCEAN") : dispersed ? "NICHE" : "NEW_THIN";

  return traced(regime, [
    step("Credible rivals", "भरोसेमंद प्रतियोगी", `rated ${t.credibleRating}+ with ≥ ${(t.credibleShare * 100).toFixed(1)}% of orders`, credible, "COUNT", "cluster_model", crowded ? `At or above ${t.crowdedAt}: crowded` : `Below ${t.crowdedAt}: few rivals`),
    step("Price spread", "दामों का फैलाव", "coefficient of variation of rival prices", cv, "PCT", "cluster_model", dispersed ? "Spread: buyers compare more than price" : "Tight: buyers see a commodity and sort by price"),
    step("Largest rival's share", "सबसे बड़े प्रतियोगी का हिस्सा", "of the design's orders", topShare, "PCT", "cluster_model"),
    step(`Regime: ${REGIME_TEMPO[regime].label}`, REGIME_TEMPO[regime].labelHi, `${crowded ? "crowded" : "few rivals"} × ${dispersed ? "spread" : "tight"} prices`, 0, "COUNT", "derived", REGIME_TEMPO[regime].note),
  ]);
}
