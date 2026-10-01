/**
 * Monthly contribution at a price, and the price that maximises it.
 *
 * More orders is not more money: below the floor every order loses, above the
 * gate nobody sees the listing. The launch price is the argmax of expected
 * monthly contribution under the twins' demand prior, searched inside the band
 * only — the Ladder then confirms it live.
 */

import { contributionPerOrder, type CostInputs } from "./cost";
import { priorOrdersPerDay, type DemandPrior } from "./demand";
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
