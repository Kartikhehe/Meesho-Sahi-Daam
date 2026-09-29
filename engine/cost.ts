/**
 * The cost-to-serve solver — the heart of the product.
 *
 *                   COGS on units that sell
 *                 + COGS lost on damaged returns
 *                 + forward freight, net of RTO reversals
 *                 + reverse freight on failed parcels
 *                 + 18% GST on those platform fees
 *                 + packaging
 * SurvivalPrice = ────────────────────────────────────────
 *                    paidFraction − adSpendRate
 *
 * The ad rate sits in the DENOMINATOR, not the numerator, because ad spend is a
 * percentage of price: raise the price and the ad cost rises with it. Putting
 * it in the numerator as a flat rupee figure understates the floor, which is
 * the most common way a naive implementation of this gets it wrong.
 *
 * Pure. No React, no browser globals.
 */

import {
  GST_ON_FEES,
  RETURN_WRITEDOWN,
  RTO_FORWARD_FREIGHT_REVERSED,
} from "./constants";
import { step, traced, type Assumption, type Traced, type TraceStep } from "./trace";

export type CostInputs = {
  /** What the goods cost her. The one number she actually knows. */
  cogs: number;
  /** Share of dispatched parcels refused / undelivered. */
  rtoRate: number;
  /** Share of DELIVERED parcels returned by the customer. */
  returnRate: number;
  /** Ad spend as a share of list price. */
  adSpendRate: number;
  forwardFreight: number;
  reverseFreight: number;
  packaging: number;
  /** Share of COGS lost on a returned unit (it cannot always be resold at full value). */
  returnWritedown?: number;
  gstOnFees?: number;
};

/**
 * The fraction of dispatched parcels that actually pay.
 * An RTO never reaches the customer; a return reaches her and comes back.
 * Both legs must survive for the money to stay.
 */
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

/** The numerator: every rupee that leaves her pocket per dispatched parcel. */
export function costToServe(i: CostInputs): Traced<number> {
  const writedown = i.returnWritedown ?? RETURN_WRITEDOWN;
  const gst = i.gstOnFees ?? GST_ON_FEES;

  const paid = paidFraction(i.rtoRate, i.returnRate);
  /** Parcels that fail after dispatch: refused outright, or returned after delivery. */
  const failedFraction = 1 - paid.value;

  // 1. COGS on the units that actually sell.
  const cogsOnSold = i.cogs * paid.value;

  // 2. COGS written down on goods that come back — by EITHER route. An RTO'd
  //    parcel travels out and back and is handled exactly like a customer
  //    return, so both legs take the same write-down. (Counting the write-down
  //    on customer returns alone understates the floor by ~2%, and breaks the
  //    brief's own −51.1 "lost to RTO + returns" line, which nets revenue lost
  //    on all failed parcels against goods recovered at 85%.)
  const cogsLost = i.cogs * failedFraction * writedown;

  // 3. Forward freight on every dispatched parcel, net of the credit the
  //    marketplace gives back when a parcel is refused and never delivered.
  const forwardGross = i.forwardFreight;
  const forwardReversed = RTO_FORWARD_FREIGHT_REVERSED ? i.forwardFreight * i.rtoRate : 0;
  const forwardNet = forwardGross - forwardReversed;

  // 4. Reverse freight on every parcel that comes back, by either route.
  const reverse = i.reverseFreight * failedFraction;

  // 5. GST on the platform fees above — never on the goods.
  const feeBase = forwardNet + reverse;
  const gstAmount = feeBase * gst;

  // 6. Packaging, on every parcel she ships.
  const packaging = i.packaging;

  const total = cogsOnSold + cogsLost + forwardNet + reverse + gstAmount + packaging;

  const trace: TraceStep[] = [
    step(
      "Cost of goods on parcels that sold",
      "बिके माल की लागत",
      `₹${i.cogs} × ${paid.value.toFixed(3)}`,
      cogsOnSold,
      "INR",
      "seller_input",
      "What you paid your supplier",
      paid.trace,
    ),
    step(
      "Value lost on goods that came back",
      "वापस आए माल का नुकसान",
      `₹${i.cogs} × ${failedFraction.toFixed(3)} × ${(writedown * 100).toFixed(0)}%`,
      cogsLost,
      "INR",
      "benchmark",
      "A returned item rarely resells at full value",
    ),
    step(
      "Forward shipping, after RTO credits",
      "भेजने का भाड़ा",
      `₹${forwardGross} − (₹${forwardGross} × ${(i.rtoRate * 100).toFixed(1)}%)`,
      forwardNet,
      "INR",
      "platform_ledger",
      "The marketplace credits freight back when a parcel is refused",
    ),
    step(
      "Return shipping on failed parcels",
      "वापसी का भाड़ा",
      `${failedFraction.toFixed(3)} × ₹${i.reverseFreight.toFixed(2)}`,
      reverse,
      "INR",
      "platform_ledger",
      "Collecting from a customer address costs more than shipping out",
    ),
    step(
      "GST on the shipping fees",
      "फीस पर जीएसटी",
      `${(gst * 100).toFixed(0)}% × (₹${forwardNet.toFixed(2)} + ₹${reverse.toFixed(2)})`,
      gstAmount,
      "INR",
      "benchmark",
      "18% on platform fees — not on your goods",
    ),
    step(
      "Packaging",
      "पैकिंग",
      `₹${packaging}`,
      packaging,
      "INR",
      "seller_input",
      "Polybag, tape and label per parcel",
    ),
    step(
      "Total cost per parcel shipped",
      "कुल लागत हर पार्सल पर",
      "sum of the above",
      total,
      "INR",
      "derived",
    ),
  ];

  const assumptions: Assumption[] = [
    {
      key: "returnWritedown",
      label: "Write-down on returned goods",
      labelHi: "वापस आए माल पर नुकसान",
      value: writedown,
      unit: "PCT",
      source: "benchmark",
      note: "We assume a returned unit resells for 85% of its cost. If your packaging is better, this is generous to us — your true floor is lower.",
    },
    {
      key: "gstOnFees",
      label: "GST on platform fees",
      value: gst,
      unit: "PCT",
      source: "benchmark",
      note: "Statutory 18% on freight and ads. Not charged on the goods themselves.",
    },
  ];

  return traced(total, trace, assumptions);
}

/**
 * The survival price: the price at which she breaks exactly even per
 * dispatched parcel, once every leakage is counted.
 *
 * Returns Infinity when adSpendRate >= paidFraction — at that point ads consume
 * every paying parcel and no finite price can break even. The band classifier
 * treats that as a NO_BAND verdict rather than printing a nonsense number.
 */
export function survivalPrice(i: CostInputs): Traced<number> {
  const cost = costToServe(i);
  const paid = paidFraction(i.rtoRate, i.returnRate);
  const denominator = paid.value - i.adSpendRate;

  const value = denominator <= 0 ? Number.POSITIVE_INFINITY : cost.value / denominator;

  const trace: TraceStep[] = [
    ...cost.trace,
    step(
      "Share of price left after ads",
      "विज्ञापन के बाद बचा हिस्सा",
      `${paid.value.toFixed(3)} paid − ${(i.adSpendRate * 100).toFixed(1)}% ads`,
      denominator,
      "RATIO",
      "derived",
      "Ads take a cut of the price itself, so they shrink what each parcel returns",
      paid.trace,
    ),
    step(
      "सुरक्षा दाम — Survival price",
      "सुरक्षा दाम",
      `₹${cost.value.toFixed(2)} ÷ ${denominator.toFixed(3)}`,
      value,
      "INR",
      "derived",
      "Below this price, every parcel you ship costs you money",
    ),
  ];

  return traced(value, trace, cost.assumptions);
}

/**
 * Contribution per dispatched order at a given price.
 * (price − survivalPrice) × (paidFraction − adSpendRate)
 *
 * Reads as: every rupee above the floor is only partly yours, because only
 * some parcels pay and ads take a slice of each.
 */
export function contributionPerOrder(price: number, i: CostInputs): Traced<number> {
  const floor = survivalPrice(i);
  const paid = paidFraction(i.rtoRate, i.returnRate);
  const denominator = paid.value - i.adSpendRate;
  const value = Number.isFinite(floor.value) ? (price - floor.value) * denominator : -Infinity;

  return traced(
    value,
    [
      step(
        "Your price",
        "आपका दाम",
        `₹${price}`,
        price,
        "INR",
        "seller_input",
      ),
      step(
        "सुरक्षा दाम — Survival price",
        "सुरक्षा दाम",
        `₹${floor.value.toFixed(2)}`,
        floor.value,
        "INR",
        "derived",
        "Your true break-even",
        floor.trace,
      ),
      step(
        "Rupees above the floor",
        "सुरक्षा दाम से ऊपर",
        `₹${price} − ₹${floor.value.toFixed(2)}`,
        price - floor.value,
        "INR",
        "derived",
      ),
      step(
        value >= 0 ? "You earn, per parcel shipped" : "You lose, per parcel shipped",
        value >= 0 ? "हर पार्सल पर कमाई" : "हर पार्सल पर नुकसान",
        `(₹${price} − ₹${floor.value.toFixed(2)}) × ${denominator.toFixed(3)}`,
        value,
        "INR",
        "derived",
        "Counted across every parcel you ship, not only the ones that pay",
      ),
    ],
    floor.assumptions,
  );
}
