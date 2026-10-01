/**
 * The unit-economics waterfall: what she believes she earns, against what
 * actually lands in her bank.
 *
 * Reproduces the brief's reference case exactly:
 *   price 305, COGS 180, freight 65, packaging 8
 *   believed +₹52.0 → reality −₹43.0
 *
 * The ordering matters. Each step is a thing she either did not know about or
 * did not know the size of, and they are listed in the order a seller
 * discovers them — goods and freight first (she knows these), then the
 * leakages, then the tax, then the ads.
 */

import { rates } from "./cost";
import type { CostInputs } from "./cost";
import { step, traced, type Traced, type TraceStep } from "./trace";

export type WaterfallBar = {
  key: string;
  label: string;
  labelHi: string;
  /** Signed rupees. Positive adds, negative subtracts. */
  value: number;
  /** Running total after this bar. */
  runningTotal: number;
  kind: "belief" | "leak" | "credit" | "reality";
  explain: string;
};

export type Waterfall = {
  bars: WaterfallBar[];
  believed: number;
  reality: number;
  /** The gap she does not discover for 15-25 days. */
  gap: number;
  gapPctOfPrice: number;
};

export function buildWaterfall(price: number, i: CostInputs): Traced<Waterfall> {
  const { d, k, gst, rho } = rates(i);
  const failed = 1 - k;
  const returned = d * i.returnRate;

  // What she believes: price − goods − freight − packaging.
  const believed = price - i.cogs - i.forwardFreight - i.packaging;

  // Revenue lost on parcels that never paid, net of the goods that came back
  // and resell for ρ of cost.
  const lostToFailures = -(price * failed - i.cogs * failed * rho);
  // She counted ₹65 of shipping on every parcel; refused ones are never charged it.
  const fwdNotCharged = i.forwardFreight * i.rtoRate;
  const reverseLeg = -(i.reverseFreight * returned);
  const ads = -(price * i.adSpendRate);
  const tax = -gst * (i.forwardFreight * d + price * i.adSpendRate);

  const bars: WaterfallBar[] = [];
  let running = 0;
  const push = (key: string, label: string, labelHi: string, value: number, kind: WaterfallBar["kind"], explain: string) => {
    running = kind === "belief" ? value : running + value;
    bars.push({ key, label, labelHi, value, runningTotal: running, kind, explain });
  };

  push("believed", "What you think you earn", "आपका हिसाब", believed, "belief", `₹${price} price − ₹${i.cogs} goods − ₹${i.forwardFreight} shipping − ₹${i.packaging} packing`);
  push("failures", "Lost to refused and returned parcels", "वापस आए पार्सल का नुकसान", lostToFailures, "leak", `${(failed * 100).toFixed(1)}% of parcels never pay. The goods come back worth ${(rho * 100).toFixed(0)}% of cost.`);
  push("fwd-credit", "No shipping charged on refused parcels", "मना किए पार्सल पर भाड़ा नहीं", fwdNotCharged, "credit", `${(i.rtoRate * 100).toFixed(1)}% × ₹${i.forwardFreight} — you counted it, but a refused parcel is never charged`);
  push("reverse", "Return shipping on customer returns", "वापसी का भाड़ा", reverseLeg, "leak", `${(returned * 100).toFixed(1)}% × ₹${i.reverseFreight.toFixed(0)} to bring back what customers send back. Valmo bears the refused-parcel leg.`);
  push("gst", "GST on shipping and ads", "भाड़े और विज्ञापन पर जीएसटी", tax, "leak", `${(gst * 100).toFixed(0)}% on ₹${(i.forwardFreight * d).toFixed(2)} of shipping and ₹${(price * i.adSpendRate).toFixed(2)} of ads — not on your goods`);
  push("ads", "Ads", "विज्ञापन", ads, "leak", `${(i.adSpendRate * 100).toFixed(1)}% of ₹${price} — the price of being seen at all`);

  const reality = running;
  bars.push({ key: "reality", label: "What actually reaches you", labelHi: "सच में क्या मिला", value: reality, runningTotal: reality, kind: "reality", explain: "Per parcel you ship, averaged across those that pay and those that do not." });

  const gap = believed - reality;
  const result: Waterfall = { bars, believed, reality, gap, gapPctOfPrice: price > 0 ? gap / price : 0 };

  const trace: TraceStep[] = bars.map((b) =>
    step(b.label, b.labelHi, b.explain, b.value, "INR", b.kind === "belief" ? "seller_input" : "derived"),
  );
  trace.push(step("The gap", "अंतर", `₹${believed.toFixed(2)} − (₹${reality.toFixed(2)})`, gap, "INR", "derived", "You find this out 15 to 25 days later, when the settlement arrives"));

  return traced(result, trace);
}

// --- the leakage funnel ---------------------------------------------------

export type Funnel = {
  dispatched: number;
  delivered: number;
  paid: number;
  /** Rupees lost on refused parcels, across the dispatched count. */
  rtoCost: number;
  /** Rupees lost on parcels returned after delivery. */
  returnCost: number;
};

/**
 * The funnel per 100 parcels dispatched, from the cost model's own rates.
 *
 * What each failed parcel costs, line by line:
 *   refused  — return freight, GST on it, packing, and the write-down on goods
 *              (forward freight is credited back, so it is not a cost here)
 *   returned — freight both ways, GST on both, packing, and the write-down
 */
export function funnelPer100(i: CostInputs): Funnel {
  const { d, gst, rho } = rates(i);
  const rtoParcels = 100 * i.rtoRate;
  const delivered = 100 * d;
  const returnedParcels = delivered * i.returnRate;

  // A refused parcel costs packing and the goods' lost value; no shipping either way.
  const perRto = i.packaging + i.cogs * (1 - rho);
  // A returned one: shipping out with its GST, the return leg, packing, lost value.
  const perReturn = i.forwardFreight * (1 + gst) + i.reverseFreight + i.packaging + i.cogs * (1 - rho);

  return {
    dispatched: 100,
    delivered,
    paid: delivered - returnedParcels,
    rtoCost: rtoParcels * perRto,
    returnCost: returnedParcels * perReturn,
  };
}
