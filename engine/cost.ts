/**
 * The cost-to-serve solver — the heart of the product. Round-2 model.
 *
 *                 C·(1 − ρ(1 − k)) + C_pack + 1.18·C_fwd·d + C_rev·r
 * SurvivalPrice = ──────────────────────────────────────────────────
 *                                 k − 1.18·a
 *
 *   k  = (1 − RTO)(1 − returns)   share of dispatched parcels that pay
 *   d  = 1 − RTO                  share delivered (forward freight is paid on these)
 *   r  = d · returns              share returned by the customer (₹153 return leg each;
 *                                 the RTO return leg is borne by Valmo)
 *   ρ  = 0.83                     resale recovery on goods that come back
 *   a  = ad rate; 1.18 is 18% GST on forward freight and on ads
 *
 * The ad rate sits in the DENOMINATOR because ad spend is a percentage of
 * price: raise the price and the ad cost (and its GST) rises with it.
 *
 * Pure. No React, no browser globals.
 */

import { GST_ON_FEES, RESALE_RECOVERY } from "./constants";
import { step, traced, type Assumption, type Traced, type TraceStep } from "./trace";

export type CostInputs = {
  /** What the goods cost her. The one number she actually knows. */
  cogs: number;
  /** Share of dispatched parcels refused at the door (RTO). */
  rtoRate: number;
  /** Share of DELIVERED parcels returned by the customer. */
  returnRate: number;
  /** Ad spend as a share of list price. */
  adSpendRate: number;
  /** Forward freight, paid on delivered units. */
  forwardFreight: number;
  /** Return-leg freight, paid on customer returns only. */
  reverseFreight: number;
  packaging: number;
  /** Resale recovery ρ on goods that come back. Default 0.83. */
  recovery?: number;
  gstOnFees?: number;
};

export function paidFraction(rtoRate: number, returnRate: number): Traced<number> {
  const delivered = 1 - rtoRate;
  const kept = 1 - returnRate;
  const value = delivered * kept;

  return traced(value, [
    step(
      "Parcels that reach the customer",
      "ग्राहक तक पहुँचे पार्सल",
      `1 − ${(rtoRate * 100).toFixed(1)}% RTO`,
      delivered,
      "RATIO",
      "platform_ledger",
      "Your delivery rate over the last 90 days",
    ),
    step(
      "Of those, parcels she keeps",
      "जो ग्राहक ने रखे",
      `1 − ${(returnRate * 100).toFixed(1)}% returns`,
      kept,
      "RATIO",
      "platform_ledger",
      "Your return rate over the last 90 days",
    ),
    step(
      "Parcels that actually pay you",
      "जिनसे सच में पैसा मिला",
      `${delivered.toFixed(3)} × ${kept.toFixed(3)}`,
      value,
      "RATIO",
      "derived",
      "Out of every 100 parcels you ship",
    ),
  ]);
}

/** The four rates the formula is built from, named once. */
export function rates(i: CostInputs) {
  const d = 1 - i.rtoRate;
  const k = d * (1 - i.returnRate);
  const r = d * i.returnRate;
  const gst = i.gstOnFees ?? GST_ON_FEES;
  const rho = i.recovery ?? RESALE_RECOVERY;
  return { d, k, r, gst, rho, den: k - (1 + gst) * i.adSpendRate };
}

/** The numerator: every rupee that leaves her pocket per dispatched parcel, before ads. */
export function costToServe(i: CostInputs): Traced<number> {
  const { d, k, r, gst, rho } = rates(i);

  const goodsSold = i.cogs * k;
  const goodsLost = i.cogs * (1 - k) * (1 - rho);
  const forward = i.forwardFreight * d;
  const forwardGst = forward * gst;
  const reverse = i.reverseFreight * r;
  const total = goodsSold + goodsLost + i.packaging + forward + forwardGst + reverse;

  const trace: TraceStep[] = [
    step("Cost of goods on parcels that sold", "बिके माल की लागत", `₹${i.cogs} × ${k.toFixed(3)}`, goodsSold, "INR", "seller_input", "What you paid your supplier", paidFraction(i.rtoRate, i.returnRate).trace),
    step("Value lost on goods that came back", "वापस आए माल का नुकसान", `₹${i.cogs} × ${(1 - k).toFixed(3)} × ${((1 - rho) * 100).toFixed(0)}%`, goodsLost, "INR", "benchmark", `Refused or returned goods resell for ${(rho * 100).toFixed(0)}% of cost`),
    step("Packaging", "पैकिंग", `₹${i.packaging}`, i.packaging, "INR", "seller_input", "Polybag, tape and label per parcel"),
    step("Shipping on delivered parcels", "भेजने का भाड़ा", `₹${i.forwardFreight} × ${d.toFixed(3)} delivered`, forward, "INR", "platform_ledger", "Not charged on parcels refused at the door"),
    step("GST on that shipping", "भाड़े पर जीएसटी", `${(gst * 100).toFixed(0)}% × ₹${forward.toFixed(2)}`, forwardGst, "INR", "benchmark", "18% on the shipping fee — not on your goods"),
    step("Return shipping on customer returns", "वापसी का भाड़ा", `₹${i.reverseFreight.toFixed(2)} × ${r.toFixed(3)} returned`, reverse, "INR", "platform_ledger", "The refused-parcel return leg is borne by Valmo, so only customer returns cost you this"),
    step("Total cost per parcel shipped", "कुल लागत हर पार्सल पर", "sum of the above", total, "INR", "derived"),
  ];

  const assumptions: Assumption[] = [
    { key: "recovery", label: "Resale recovery on goods that come back", labelHi: "वापस आए माल की बिक्री", value: rho, unit: "PCT", source: "benchmark", note: "We assume a refused or returned unit resells for 83% of its cost. If yours resell better, your true floor is lower." },
    { key: "gstOnFees", label: "GST on shipping and ads", value: gst, unit: "PCT", source: "benchmark", note: "Statutory 18% on the forward shipping fee and on ad spend. Not charged on your goods." },
  ];

  return traced(total, trace, assumptions);
}

/**
 * The survival price: break-even per dispatched parcel once every leakage is
 * counted. Infinity when ads (with their GST) eat every paying parcel — the
 * band classifier reports that as NO_BAND rather than printing a number.
 */
export function survivalPrice(i: CostInputs): Traced<number> {
  const cost = costToServe(i);
  const { k, gst, den } = rates(i);
  const value = den <= 0 ? Number.POSITIVE_INFINITY : cost.value / den;

  return traced(
    value,
    [
      ...cost.trace,
      step("Share of price left after ads", "विज्ञापन के बाद बचा हिस्सा", `${k.toFixed(3)} paid − ${(1 + gst).toFixed(2)} × ${(i.adSpendRate * 100).toFixed(1)}% ads`, den, "RATIO", "derived", "Ads, and the GST on them, take a cut of the price itself", paidFraction(i.rtoRate, i.returnRate).trace),
      step("सुरक्षा दाम — Survival price", "सुरक्षा दाम", `₹${cost.value.toFixed(2)} ÷ ${den.toFixed(3)}`, value, "INR", "derived", "Below this price, every parcel you ship costs you money"),
    ],
    cost.assumptions,
  );
}

/** Contribution per dispatched parcel: (k − 1.18a)·P − numerator. */
export function contributionPerOrder(price: number, i: CostInputs): Traced<number> {
  const cost = costToServe(i);
  const floor = survivalPrice(i);
  const { den } = rates(i);
  const value = den * price - cost.value;

  return traced(
    value,
    [
      step("Your price", "आपका दाम", `₹${price}`, price, "INR", "seller_input"),
      step("What each parcel keeps of it", "दाम में से बचा", `₹${price} × ${den.toFixed(3)}`, den * price, "INR", "derived", "After refused and returned parcels, ads and the GST on ads"),
      step("Cost to serve each parcel", "हर पार्सल की लागत", `₹${cost.value.toFixed(2)}`, cost.value, "INR", "derived", "Goods, packing, shipping and its GST, returns", cost.trace),
      step(value >= 0 ? "You earn, per parcel shipped" : "You lose, per parcel shipped", value >= 0 ? "हर पार्सल पर कमाई" : "हर पार्सल पर नुकसान", `₹${(den * price).toFixed(2)} − ₹${cost.value.toFixed(2)}`, value, "INR", "derived", `Your survival price is ₹${floor.value.toFixed(2)}`),
    ],
    floor.assumptions,
  );
}
