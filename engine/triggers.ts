/**
 * The Clock, part two: the six triggers.
 *
 * Each is a pure function returning { fired, severity, rupeeImpact, message,
 * trace }. Alerts rank by rupeeImpact — what it costs her per month — because
 * ranking by severity or recency puts a ₹40 problem above a ₹4,000 one.
 *
 * At most 2 fire per seller per week. Beyond that sellers stop reading them,
 * and the channel stops being worth anything. Suppressed alerts are kept and
 * marked `muted` so Admin can inspect what the cap held back.
 */

import { ALERT_CAP_PER_WEEK } from "./constants";
import { step, traced, type Traced } from "./trace";
import type { BandAnalysis, FiredTrigger, Listing, TriggerId } from "./types";

export type TriggerContext = {
  listing: Listing;
  band: BandAnalysis;
  day: number;
  /** Orders in the last 30 days. */
  ordersLast30: number;
  contributionPerOrder: number;
  /** The band as it stood 30 days ago, for drift detection. */
  previousBand?: BandAnalysis;
  /** Cheapest rival price in the cluster today. */
  rivalFloorPrice: number;
  /** Return rate over the last 30 days vs the 90-day baseline. */
  returnRate30: number;
  returnRateBaseline: number;
  daysSincePriceChange: number;
};

export type TriggerResult = {
  fired: boolean;
  triggerId: TriggerId;
  severity: "low" | "medium" | "high";
  /** Rupees per month at stake. Ranking key. */
  rupeeImpact: number;
  message: string;
  messageHi: string;
  trace: Traced<number>;
};

const monthlyVolume = (ordersLast30: number) => Math.max(ordersLast30, 1);

/** 1. Her cost to serve moved — freight slab change, return drift, ad rate. */
function costDrift(ctx: TriggerContext): TriggerResult {
  const prev = ctx.previousBand;
  const delta = prev ? ctx.band.floor - prev.floor : 0;
  const fired = !!prev && Math.abs(delta) >= 4;
  const impact = Math.abs(delta) * monthlyVolume(ctx.ordersLast30);

  return {
    fired,
    triggerId: "COST_DRIFT",
    severity: Math.abs(delta) > 12 ? "high" : "medium",
    rupeeImpact: impact,
    message:
      delta > 0
        ? `Your costs rose ₹${delta.toFixed(0)} per order on ${ctx.listing.name}. Your survival price moved up with them.`
        : `Your costs fell ₹${Math.abs(delta).toFixed(0)} per order on ${ctx.listing.name}. There is room to price lower and win more orders.`,
    messageHi:
      delta > 0
        ? `${ctx.listing.name} पर लागत ₹${delta.toFixed(0)} बढ़ी है। सुरक्षा दाम भी बढ़ गया।`
        : `${ctx.listing.name} पर लागत ₹${Math.abs(delta).toFixed(0)} घटी है। दाम कम करके ज़्यादा ऑर्डर मिल सकते हैं।`,
    trace: traced(impact, [
      step(
        "Survival price before",
        "पहले का सुरक्षा दाम",
        `₹${prev?.floor.toFixed(2) ?? "—"}`,
        prev?.floor ?? 0,
        "INR",
        "derived",
        "30 days ago",
      ),
      step("Survival price now", "अब का सुरक्षा दाम", `₹${ctx.band.floor.toFixed(2)}`, ctx.band.floor, "INR", "derived"),
      step(
        "Per month, across your orders",
        "महीने भर में",
        `₹${Math.abs(delta).toFixed(2)} × ${monthlyVolume(ctx.ordersLast30)} orders`,
        impact,
        "INR",
        "derived",
      ),
    ]),
  };
}

/** 2. A rival undercut her and is taking her orders. */
function rivalUndercut(ctx: TriggerContext): TriggerResult {
  const gap = ctx.listing.price - ctx.rivalFloorPrice;
  const fired = gap > 8 && ctx.rivalFloorPrice > 0 && ctx.rivalFloorPrice >= ctx.band.floor;
  // What she could earn by matching, if matching still clears her floor.
  const impact = fired ? gap * monthlyVolume(ctx.ordersLast30) * 0.4 : 0;

  return {
    fired,
    triggerId: "RIVAL_UNDERCUT",
    severity: gap > 25 ? "high" : "medium",
    rupeeImpact: impact,
    message: `A similar listing is ₹${gap.toFixed(0)} cheaper than ${ctx.listing.name}. Matching is still above your survival price of ₹${ctx.band.floor.toFixed(0)}.`,
    messageHi: `${ctx.listing.name} जैसा सामान ₹${gap.toFixed(0)} सस्ता है। आपका सुरक्षा दाम ₹${ctx.band.floor.toFixed(0)} है, इसलिए दाम कम करने की जगह है।`,
    trace: traced(impact, [
      step("Your price", "आपका दाम", `₹${ctx.listing.price}`, ctx.listing.price, "INR", "seller_input"),
      step("Cheapest similar listing", "सबसे सस्ता प्रतियोगी", `₹${ctx.rivalFloorPrice}`, ctx.rivalFloorPrice, "INR", "cluster_model"),
      step("Your survival price", "आपका सुरक्षा दाम", `₹${ctx.band.floor.toFixed(2)}`, ctx.band.floor, "INR", "derived"),
    ]),
  };
}

/** 3. Returns spiked — usually a sizing or colour-accuracy problem. */
function returnSpike(ctx: TriggerContext): TriggerResult {
  const delta = ctx.returnRate30 - ctx.returnRateBaseline;
  const fired = delta > 0.05 && ctx.ordersLast30 >= 8;
  // Each extra return costs roughly the full cost to serve of that parcel.
  const impact = fired ? delta * monthlyVolume(ctx.ordersLast30) * (ctx.listing.cogs * 0.15 + 75) : 0;

  return {
    fired,
    triggerId: "RETURN_SPIKE",
    severity: delta > 0.1 ? "high" : "medium",
    rupeeImpact: impact,
    message: `Returns on ${ctx.listing.name} rose to ${(ctx.returnRate30 * 100).toFixed(0)}%, from ${(ctx.returnRateBaseline * 100).toFixed(0)}%. That is costing you about ₹${impact.toFixed(0)} a month.`,
    messageHi: `${ctx.listing.name} पर वापसी ${(ctx.returnRateBaseline * 100).toFixed(0)}% से बढ़कर ${(ctx.returnRate30 * 100).toFixed(0)}% हो गई। महीने का लगभग ₹${impact.toFixed(0)} नुकसान।`,
    trace: traced(impact, [
      step("Returns before", "पहले वापसी", `${(ctx.returnRateBaseline * 100).toFixed(1)}%`, ctx.returnRateBaseline, "PCT", "platform_ledger", "Your 90-day baseline"),
      step("Returns now", "अब वापसी", `${(ctx.returnRate30 * 100).toFixed(1)}%`, ctx.returnRate30, "PCT", "platform_ledger", "Last 30 days"),
      step("Cost per extra return", "हर वापसी की लागत", `₹${(ctx.listing.cogs * 0.15 + 75).toFixed(0)}`, ctx.listing.cogs * 0.15 + 75, "INR", "derived", "Return shipping plus the value lost on the goods"),
    ]),
  };
}

/** 4. The listing is priced below its own floor — the most urgent case. */
function belowFloor(ctx: TriggerContext): TriggerResult {
  const fired = ctx.band.verdict === "BELOW_FLOOR";
  const lossPerOrder = fired ? ctx.band.floor - ctx.listing.price : 0;
  const impact = fired ? lossPerOrder * monthlyVolume(ctx.ordersLast30) : 0;

  return {
    fired,
    triggerId: "BELOW_FLOOR",
    severity: "high",
    rupeeImpact: impact,
    message: `Every ${ctx.listing.name} you ship loses you ₹${lossPerOrder.toFixed(0)}. At ${ctx.ordersLast30} orders a month, that is ₹${impact.toFixed(0)}.`,
    messageHi: `${ctx.listing.name} के हर पार्सल पर ₹${lossPerOrder.toFixed(0)} का नुकसान। महीने के ${ctx.ordersLast30} ऑर्डर पर ₹${impact.toFixed(0)}।`,
    trace: traced(impact, [
      step("Your price", "आपका दाम", `₹${ctx.listing.price}`, ctx.listing.price, "INR", "seller_input"),
      step("Your survival price", "आपका सुरक्षा दाम", `₹${ctx.band.floor.toFixed(2)}`, ctx.band.floor, "INR", "derived"),
      step("Loss on every parcel", "हर पार्सल पर नुकसान", `₹${ctx.band.floor.toFixed(2)} − ₹${ctx.listing.price}`, lossPerOrder, "INR", "derived"),
      step("Per month", "महीने में", `₹${lossPerOrder.toFixed(2)} × ${ctx.ordersLast30} orders`, impact, "INR", "derived"),
    ]),
  };
}

/** 5. The listing moved lifecycle stage, so its price policy changed. */
function stageChange(ctx: TriggerContext): TriggerResult {
  const fired = ctx.listing.stage === "S2_CLIMB" && ctx.band.verdict === "HEALTHY" && ctx.daysSincePriceChange > 30;
  const headroom = Math.max(0, ctx.band.recommended - ctx.listing.price);
  const impact = fired ? headroom * monthlyVolume(ctx.ordersLast30) * 0.5 : 0;

  return {
    fired,
    triggerId: "STAGE_CHANGE",
    severity: "low",
    rupeeImpact: impact,
    message: `${ctx.listing.name} has enough reviews to hold a higher price. There is ₹${headroom.toFixed(0)} of room before you hit the visibility ceiling.`,
    messageHi: `${ctx.listing.name} पर अब अच्छी रेटिंग है। दिखने की सीमा तक ₹${headroom.toFixed(0)} की जगह बाकी है।`,
    trace: traced(impact, [
      step("Your price", "आपका दाम", `₹${ctx.listing.price}`, ctx.listing.price, "INR", "seller_input"),
      step("Suggested price", "सुझाया दाम", `₹${ctx.band.recommended}`, ctx.band.recommended, "INR", "derived"),
      step("Visibility ceiling", "दिखने की सीमा", `₹${ctx.band.ceiling.toFixed(2)}`, ctx.band.ceiling, "INR", "cluster_model"),
    ]),
  };
}

/** 6. Stock is about to run out on something that is earning. */
function stockRisk(ctx: TriggerContext): TriggerResult {
  const dailyRate = ctx.ordersLast30 / 30;
  const daysLeft = dailyRate > 0 ? ctx.listing.inventory / dailyRate : Infinity;
  const fired = daysLeft < 10 && ctx.contributionPerOrder > 0 && ctx.listing.inventory > 0;
  const impact = fired ? ctx.contributionPerOrder * dailyRate * 30 : 0;

  return {
    fired,
    triggerId: "STOCK_RISK",
    severity: daysLeft < 5 ? "high" : "medium",
    rupeeImpact: impact,
    message: `${ctx.listing.name} has about ${Math.floor(daysLeft)} days of stock left, and it earns you ₹${ctx.contributionPerOrder.toFixed(0)} an order. Running out costs you the listing's position.`,
    messageHi: `${ctx.listing.name} का स्टॉक लगभग ${Math.floor(daysLeft)} दिन का बचा है। हर ऑर्डर पर ₹${ctx.contributionPerOrder.toFixed(0)} की कमाई है।`,
    trace: traced(impact, [
      step("Stock left", "बचा स्टॉक", `${ctx.listing.inventory} pieces`, ctx.listing.inventory, "COUNT", "platform_ledger"),
      step("Selling per day", "रोज़ की बिक्री", `${dailyRate.toFixed(1)} a day`, dailyRate, "COUNT", "platform_ledger"),
      step("Earning per order", "हर ऑर्डर पर कमाई", `₹${ctx.contributionPerOrder.toFixed(2)}`, ctx.contributionPerOrder, "INR", "derived"),
    ]),
  };
}

export const EVALUATORS = [belowFloor, returnSpike, costDrift, rivalUndercut, stockRisk, stageChange];

export const TRIGGER_COPY: Record<TriggerId, { label: string; labelHi: string; about: string }> = {
  BELOW_FLOOR: { label: "Below floor", labelHi: "सुरक्षा दाम से नीचे", about: "The price is under your own break-even." },
  RETURN_SPIKE: { label: "Returns rising", labelHi: "वापसी बढ़ी", about: "Returns moved above your normal rate." },
  COST_DRIFT: { label: "Costs moved", labelHi: "लागत बदली", about: "Freight, returns or ads changed your survival price." },
  RIVAL_UNDERCUT: { label: "Undercut", labelHi: "सस्ता प्रतियोगी", about: "A similar listing is meaningfully cheaper." },
  STOCK_RISK: { label: "Stock running out", labelHi: "स्टॉक कम", about: "An earning listing is about to go out of stock." },
  STAGE_CHANGE: { label: "Room to rise", labelHi: "दाम बढ़ाने की जगह", about: "Reviews now support a higher price." },
};

export function evaluateTriggers(ctx: TriggerContext): TriggerResult[] {
  return EVALUATORS.map((f) => f(ctx)).filter((r) => r.fired && r.rupeeImpact > 0);
}

/**
 * Rank by rupee impact and apply the weekly cap. Everything over the cap is
 * returned too, marked `muted`, so nothing is silently discarded.
 */
export function applyWeeklyCap(
  results: { result: TriggerResult; listingId: string }[],
  sellerId: string,
  day: number,
  cap: number = ALERT_CAP_PER_WEEK,
): FiredTrigger[] {
  const ranked = [...results].sort((a, b) => b.result.rupeeImpact - a.result.rupeeImpact);

  return ranked.map((r, index) => ({
    id: `alert-${sellerId}-${r.listingId}-${day}-${r.result.triggerId}`,
    triggerId: r.result.triggerId,
    sellerId,
    listingId: r.listingId,
    day,
    severity: r.result.severity,
    rupeeImpact: r.result.rupeeImpact,
    message: r.result.message,
    messageHi: r.result.messageHi,
    trace: r.result.trace,
    muted: index >= cap,
  }));
}
