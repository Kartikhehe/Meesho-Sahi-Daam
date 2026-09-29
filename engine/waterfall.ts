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

import { GST_ON_FEES, RETURN_WRITEDOWN, RTO_FORWARD_FREIGHT_REVERSED } from "./constants";
import { paidFraction } from "./cost";
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
  const writedown = i.returnWritedown ?? RETURN_WRITEDOWN;
  const gstRate = i.gstOnFees ?? GST_ON_FEES;

  const paid = paidFraction(i.rtoRate, i.returnRate);
  const failed = 1 - paid.value;

  // What she believes: price − goods − freight − packaging.
  const believed = price - i.cogs - i.forwardFreight - i.packaging;

  // Revenue lost on parcels that never paid, net of goods that came back and
  // can be resold at (1 − writedown) of cost.
  const revenueLost = price * failed;
  const goodsRecovered = i.cogs * failed * (1 - writedown);
  const lostToFailures = -(revenueLost - goodsRecovered);

  // On an RTO the parcel never reached the customer, so the freight is credited.
  const forwardReversed = RTO_FORWARD_FREIGHT_REVERSED ? i.forwardFreight * i.rtoRate : 0;

  const reverseLeg = -(i.reverseFreight * failed);
  const forwardNet = i.forwardFreight - forwardReversed;
  const gst = -((forwardNet + i.reverseFreight * failed) * gstRate);
  const ads = -(price * i.adSpendRate);

  const bars: WaterfallBar[] = [];
  let running = 0;

  const push = (
    key: string,
    label: string,
    labelHi: string,
    value: number,
    kind: WaterfallBar["kind"],
    explain: string,
  ) => {
    running = kind === "belief" ? value : running + value;
    bars.push({ key, label, labelHi, value, runningTotal: running, kind, explain });
  };

  push(
    "believed",
    "What you think you earn",
    "आपका हिसाब",
    believed,
    "belief",
    `₹${price} price − ₹${i.cogs} goods − ₹${i.forwardFreight} shipping − ₹${i.packaging} packing`,
  );
  push(
    "failures",
    "Lost to refused and returned parcels",
    "वापस आए पार्सल का नुकसान",
    lostToFailures,
    "leak",
    `${(failed * 100).toFixed(1)}% of parcels never pay. The goods come back worth ${((1 - writedown) * 100).toFixed(0)}% of cost.`,
  );
  push(
    "fwd-credit",
    "Shipping refunded on refused parcels",
    "मना किए पार्सल का भाड़ा वापस",
    forwardReversed,
    "credit",
    `${(i.rtoRate * 100).toFixed(1)}% × ₹${i.forwardFreight} — the parcel never reached the customer`,
  );
  push(
    "reverse",
    "Return shipping",
    "वापसी का भाड़ा",
    reverseLeg,
    "leak",
    `${(failed * 100).toFixed(1)}% × ₹${i.reverseFreight.toFixed(2)} to bring each failed parcel back`,
  );
  push(
    "gst",
    "GST on the shipping fees",
    "फीस पर जीएसटी",
    gst,
    "leak",
    `${(gstRate * 100).toFixed(0)}% on ₹${forwardNet.toFixed(2)} + ₹${(i.reverseFreight * failed).toFixed(2)} of fees — not on your goods`,
  );
  push(
    "ads",
    "Ads",
    "विज्ञापन",
    ads,
    "leak",
    `${(i.adSpendRate * 100).toFixed(1)}% of ₹${price} — the price of being seen at all`,
  );

  const reality = running;
  bars.push({
    key: "reality",
    label: "What actually reaches you",
    labelHi: "सच में क्या मिला",
    value: reality,
    runningTotal: reality,
    kind: "reality",
    explain: "Per parcel you ship, averaged across those that pay and those that do not.",
  });

  const gap = believed - reality;

  const result: Waterfall = {
    bars,
    believed,
    reality,
    gap,
    gapPctOfPrice: price > 0 ? gap / price : 0,
  };

  const trace: TraceStep[] = bars.map((b) =>
    step(b.label, b.labelHi, b.explain, b.value, "INR", b.kind === "belief" ? "seller_input" : "derived"),
  );
  trace.push(
    step(
      "The gap",
      "अंतर",
      `₹${believed.toFixed(2)} − (${reality < 0 ? "−" : ""}₹${Math.abs(reality).toFixed(2)})`,
      gap,
      "INR",
      "derived",
      "You find this out 15 to 25 days later, when the settlement arrives",
    ),
  );

  return traced(result, trace, paid.assumptions);
}
