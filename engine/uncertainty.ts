/**
 * The floor as a range, not a fake point.
 *
 * A day-zero seller's return and refusal rates are borrowed priors, so her
 * survival price is uncertain. That uncertainty is propagated through the
 * floor formula (delta method) from the prior standard deviations in
 * constants.ts, then shrunk as her own orders arrive using the same
 * credibility constant the blending rule uses:
 *
 *   σ(n) = σ₀ · √(K / (n + K))
 *
 * On the reference kurti this gives the deck's 80% half-widths of
 * ±₹28 / ±₹20 / ±₹14 / ±₹9 at 0 / 30 / 90 / 270 own orders — derived, not typed.
 */

import { BAND_CONFIDENCE, CREDIBILITY_K, PRIOR_SD, RTO_BY_COD } from "./constants";
import { survivalPrice, type CostInputs } from "./cost";
import { step, traced, type Traced } from "./trace";

/** Standard normal CDF (Abramowitz–Stegun 26.2.17, error < 7.5e-8). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** z such that the central `confidence` of a normal lies within ±z. */
export function zFor(confidence: number): number {
  const target = 0.5 + confidence / 2;
  let lo = 0;
  let hi = 6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export type FloorBand = {
  floor: number;
  low: number;
  high: number;
  halfWidth: number;
  sigma: number;
  /** Own delivered orders behind the estimate. */
  n: number;
  /** Weight her own data carries: n ÷ (n + K). */
  ownWeight: number;
  confidence: number;
};

/**
 * @param codShare her share of cash-on-delivery orders — refusal-rate
 *                 uncertainty only bites on COD parcels.
 */
export function floorBand(
  i: CostInputs,
  n: number,
  codShare: number,
  confidence: number = BAND_CONFIDENCE,
  k: number = CREDIBILITY_K,
): Traced<FloorBand> {
  const floor = survivalPrice(i).value;
  const h = 0.001;
  const dRet = (survivalPrice({ ...i, returnRate: i.returnRate + h }).value - survivalPrice({ ...i, returnRate: i.returnRate - h }).value) / (2 * h);
  const dRto = (survivalPrice({ ...i, rtoRate: i.rtoRate + h }).value - survivalPrice({ ...i, rtoRate: i.rtoRate - h }).value) / (2 * h);

  // A change in the COD refusal rate moves the blended RTO by codShare of it.
  const sigma0 = Math.hypot(dRet * PRIOR_SD.returnRate, dRto * codShare * PRIOR_SD.rtoCod);
  const shrink = Math.sqrt(k / (Math.max(0, n) + k));
  const sigma = sigma0 * shrink;
  const halfWidth = zFor(confidence) * sigma;

  const value: FloorBand = {
    floor,
    low: floor - halfWidth,
    high: floor + halfWidth,
    halfWidth,
    sigma,
    n,
    ownWeight: n / (n + k),
    confidence,
  };

  return traced(value, [
    step("Your own delivered orders", "आपके अपने ऑर्डर", `${n} orders`, n, "COUNT", "platform_ledger"),
    step("Weight your own data carries", "आपके आँकड़ों का वज़न", `${n} ÷ (${n} + ${k})`, value.ownWeight, "RATIO", "derived", n < k ? "Under 30 orders, borrowed figures still carry most of the weight" : undefined),
    step("Uncertainty at day zero", "पहले दिन की अनिश्चितता", `returns ±${(PRIOR_SD.returnRate * 100).toFixed(1)} pts, COD refusals ±${(PRIOR_SD.rtoCod * 100).toFixed(1)} pts`, sigma0, "INR", "benchmark", "How far the borrowed rates could plausibly be off, in rupees of floor"),
    step("Uncertainty now", "अब की अनिश्चितता", `₹${sigma0.toFixed(2)} × √(${k} ÷ ${n + k})`, sigma, "INR", "derived", "Shrinks as your own orders arrive"),
    step(`${Math.round(confidence * 100)}% range for your floor`, "सुरक्षा दाम की सीमा", `₹${floor.toFixed(0)} ± ₹${halfWidth.toFixed(0)}`, halfWidth, "INR", "derived", `Likely between ₹${value.low.toFixed(0)} and ₹${value.high.toFixed(0)}`),
  ]);
}

/** Chance the true floor sits above a price — e.g. "85% likely no viable price". */
export function probFloorAbove(band: FloorBand, price: number): number {
  if (band.sigma <= 0) return band.floor > price ? 1 : 0;
  return 1 - normalCdf((price - band.floor) / band.sigma);
}

/** Blended RTO for a cash-on-delivery share, from the buyer-side rates. */
export function rtoForCodShare(codShare: number): number {
  return (codShare * RTO_BY_COD.cod + (1 - codShare) * RTO_BY_COD.prepaid) * RTO_BY_COD.dampening;
}
