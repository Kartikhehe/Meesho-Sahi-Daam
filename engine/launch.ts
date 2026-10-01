/**
 * Monthly contribution at a price, and the price that maximises it.
 *
 * More orders is not more money: below the floor every order loses, above the
 * gate nobody sees the listing. The launch price is the argmax of expected
 * monthly contribution under the twins' demand prior, searched inside the band
 * only — the Ladder then confirms it live.
 */

import { contributionPerOrder, type CostInputs } from "./cost";
import { demandCurve, priorOrdersPerDay, type DemandPrior } from "./demand";
import type { CompetitorListing, DesignCluster, Listing } from "./types";
import { step, traced, type Traced } from "./trace";

export function monthlyContribution(price: number, i: CostInputs, prior: DemandPrior): number {
  return priorOrdersPerDay(price, prior) * 30 * contributionPerOrder(price, i).value;
}

/** Argmax over [lo, hi] in ₹0.5 steps, reported to the rupee. */
export function profitMaxPrice(i: CostInputs, prior: DemandPrior, lo: number, hi: number): Traced<number> {
  let best = lo;
  let bestValue = -Infinity;
  for (let p = Math.ceil(lo * 2) / 2; p <= hi; p += 0.5) {
    const v = monthlyContribution(p, i, prior);
    if (v > bestValue) {
      bestValue = v;
      best = p;
    }
  }
  const price = Math.round(best);
  const orders = priorOrdersPerDay(price, prior) * 30;

  return traced(price, [
    step("Lowest price in the band", "बैंड का निचला दाम", `₹${lo.toFixed(0)}`, lo, "INR", "derived"),
    step("Highest price in the band", "बैंड का ऊपरी दाम", `₹${hi.toFixed(0)}`, hi, "INR", "cluster_model"),
    step("Orders a month at the best price", "सबसे अच्छे दाम पर ऑर्डर", `from look-alike listings' demand`, orders, "COUNT", "cluster_model", "Borrowed from twins until your own orders arrive"),
    step("Earnings a month at the best price", "सबसे अच्छे दाम पर कमाई", `${orders.toFixed(0)} orders × ₹${contributionPerOrder(price, i).value.toFixed(2)}`, monthlyContribution(price, i, prior), "INR", "derived"),
    step("Launch price", "शुरुआती दाम", "the price that earns most inside the band", price, "INR", "derived"),
  ]);
}

/**
 * The launch price for a real listing: the argmax of expected monthly
 * contribution across the band, under its design cluster's demand model.
 */
export function bestPriceInBand(
  listing: Listing,
  cluster: DesignCluster,
  rivals: CompetitorListing[],
  ceiling: number,
  day: number,
  i: CostInputs,
  lo: number,
  hi: number,
): Traced<number> {
  if (!(hi > lo)) return traced(0, []);
  const prices: number[] = [];
  for (let p = Math.ceil(lo); p <= Math.floor(hi); p += 1) prices.push(p);
  if (!prices.length) prices.push(Math.round((lo + hi) / 2));
  const curve = demandCurve(listing, cluster, rivals, ceiling, day, prices);
  const unit = (p: number) => contributionPerOrder(p, i).value;
  let best = curve[0] ?? { price: prices[0] ?? lo, ordersPerMonth: 0 };
  for (const c of curve) if (c.ordersPerMonth * unit(c.price) > best.ordersPerMonth * unit(best.price)) best = c;

  return traced(best.price, [
    step("Lowest safe price", "सबसे कम सुरक्षित दाम", `₹${lo.toFixed(0)}`, lo, "INR", "derived"),
    step("Visibility ceiling", "दिखने की सीमा", `₹${hi.toFixed(0)}`, hi, "INR", "cluster_model"),
    step("Orders a month at the best price", "सबसे अच्छे दाम पर ऑर्डर", "from this design's demand model", best.ordersPerMonth, "COUNT", "cluster_model"),
    step("Earnings a month at the best price", "सबसे अच्छे दाम पर कमाई", `${best.ordersPerMonth.toFixed(0)} × ₹${unit(best.price).toFixed(2)}`, best.ordersPerMonth * unit(best.price), "INR", "derived"),
    step("Launch price", "शुरुआती दाम", "the price that earns most inside the band", best.price, "INR", "derived", "Your price ladder then confirms it with real orders"),
  ]);
}
