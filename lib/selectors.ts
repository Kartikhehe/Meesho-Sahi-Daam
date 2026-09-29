/**
 * Selectors: world state → what a screen needs.
 *
 * Every seller screen reads through here, so a listing's floor, ceiling, band
 * and score are computed one way and one way only. Each returns the `Traced`
 * values alongside the numbers, so the UI can hand them straight to
 * <MoneyValue /> without recomputing or, worse, formatting a bare number.
 */

import { classifyBand } from "@/engine/band";
import { estimateCeiling } from "@/engine/ceiling";
import { costInputsFor } from "@/engine/clock";
import { contributionPerOrder, survivalPrice, type CostInputs } from "@/engine/cost";
import { visibilityGate } from "@/engine/demand";
import { daamScore } from "@/engine/score";
import { RETURN_WRITEDOWN } from "@/engine/constants";
import type { Funnel } from "@/engine/waterfall";
import type { Traced } from "@/engine/trace";
import type {
  BandAnalysis,
  FiredTrigger,
  Listing,
  OrderEvent,
  Seller,
  SettlementLine,
  World,
} from "@/engine/types";

export type ListingAnalysis = {
  listing: Listing;
  seller: Seller;
  inputs: CostInputs;
  floor: Traced<number>;
  ceiling: Traced<number>;
  band: Traced<BandAnalysis>;
  contribution: Traced<number>;
  score: Traced<number>;
  ordersLast30: number;
  /** Contribution per month at today's price and volume. */
  monthlyContribution: number;
  /** Negative when losing money — the number the home screen ranks by. */
  monthlyRisk: number;
  visibility: number;
};

export function analyseListing(world: World, listing: Listing): ListingAnalysis | null {
  const seller = world.sellers.find((s) => s.id === listing.sellerId);
  if (!seller) return null;

  const rivals = world.competitors.filter((c) => c.clusterId === listing.clusterId);
  const inputs = costInputsFor(listing, seller);
  const floor = survivalPrice(inputs);
  const ceiling = estimateCeiling(rivals);
  const band = classifyBand(floor.value, ceiling.value, listing.price);
  const contribution = contributionPerOrder(listing.price, inputs);

  const ordersLast30 = world.orders.filter(
    (o) => o.listingId === listing.id && o.day > world.day - 30,
  ).length;

  const visibility = visibilityGate(listing.price, ceiling.value);
  const score = daamScore({
    band: band.value,
    contributionPerOrder: contribution.value,
    visibilityGate: visibility,
    daysSincePriceChange: Math.max(0, world.day - listing.listedDay),
  });

  const monthlyContribution = contribution.value * ordersLast30;

  return {
    listing,
    seller,
    inputs,
    floor,
    ceiling,
    band,
    contribution,
    score,
    ordersLast30,
    monthlyContribution,
    monthlyRisk: monthlyContribution < 0 ? monthlyContribution : 0,
    visibility,
  };
}

export function listingsFor(world: World, sellerId: string): Listing[] {
  return world.listings.filter((l) => l.sellerId === sellerId);
}

export function analyseSeller(world: World, sellerId: string): ListingAnalysis[] {
  return listingsFor(world, sellerId)
    .map((l) => analyseListing(world, l))
    .filter((a): a is ListingAnalysis => a !== null);
}

export type SellerSummary = {
  listingCount: number;
  belowFloorCount: number;
  noBandCount: number;
  aboveGateCount: number;
  healthyCount: number;
  /** Rupees per month bleeding from below-floor listings. One big number. */
  monthlyBleed: number;
  monthlyContribution: number;
  ordersLast30: number;
  averageScore: number;
};

export function summariseSeller(analyses: ListingAnalysis[]): SellerSummary {
  const count = (v: string) => analyses.filter((a) => a.band.value.verdict === v).length;

  return {
    listingCount: analyses.length,
    belowFloorCount: count("BELOW_FLOOR"),
    noBandCount: count("NO_BAND"),
    aboveGateCount: count("ABOVE_GATE"),
    healthyCount: count("HEALTHY") + count("THIN"),
    monthlyBleed: analyses.reduce((acc, a) => acc + a.monthlyRisk, 0),
    monthlyContribution: analyses.reduce((acc, a) => acc + a.monthlyContribution, 0),
    ordersLast30: analyses.reduce((acc, a) => acc + a.ordersLast30, 0),
    averageScore: analyses.length
      ? Math.round(analyses.reduce((acc, a) => acc + a.score.value, 0) / analyses.length)
      : 0,
  };
}

/** The three things worth doing today, ranked by rupee impact. */
export function topActions(analyses: ListingAnalysis[], limit = 3): ListingAnalysis[] {
  return [...analyses]
    .filter((a) => a.monthlyRisk < 0 || a.band.value.verdict === "ABOVE_GATE")
    .sort((a, b) => {
      // Below-floor listings bleed cash now; above-gate ones only forgo it.
      const impactA = a.monthlyRisk < 0 ? Math.abs(a.monthlyRisk) : a.contribution.value * 8;
      const impactB = b.monthlyRisk < 0 ? Math.abs(b.monthlyRisk) : b.contribution.value * 8;
      return impactB - impactA;
    })
    .slice(0, limit);
}

// --- settlements ----------------------------------------------------------

export type SettlementSummary = {
  dispatched: number;
  delivered: number;
  paid: number;
  grossSales: number;
  netCredited: number;
  forwardFreight: number;
  reverseFreight: number;
  adCost: number;
  gst: number;
  packaging: number;
  /** Everything deducted between the sale and the bank. */
  totalDeductions: number;
};

export function summariseSettlements(
  settlements: SettlementLine[],
  orders: OrderEvent[],
): SettlementSummary {
  const delivered = orders.filter((o) => o.outcome === "delivered").length;

  const sum = (f: (s: SettlementLine) => number) => settlements.reduce((a, s) => a + f(s), 0);

  const grossSales = sum((s) => s.saleValue);
  const netCredited = sum((s) => s.netCredit);

  return {
    dispatched: orders.length,
    delivered: orders.filter((o) => o.outcome !== "rto").length,
    paid: delivered,
    grossSales,
    netCredited,
    forwardFreight: sum((s) => s.forwardFreight - s.forwardFreightReversed),
    reverseFreight: sum((s) => s.reverseFreight),
    adCost: sum((s) => s.adCost),
    gst: sum((s) => s.gstOnFees),
    packaging: sum((s) => s.packaging),
    totalDeductions: grossSales - netCredited,
  };
}

export function settlementsFor(world: World, sellerId: string, days = 30): SettlementLine[] {
  const ids = new Set(listingsFor(world, sellerId).map((l) => l.id));
  return world.settlements.filter(
    (s) => ids.has(s.listingId) && s.dispatchedDay > world.day - days,
  );
}

export function ordersFor(world: World, sellerId: string, days = 30): OrderEvent[] {
  const ids = new Set(listingsFor(world, sellerId).map((l) => l.id));
  return world.orders.filter((o) => ids.has(o.listingId) && o.day > world.day - days);
}

export function alertsFor(world: World, sellerId: string): FiredTrigger[] {
  return world.alerts
    .filter((a) => a.sellerId === sellerId && !a.muted)
    .sort((a, b) => b.day - a.day || b.rupeeImpact - a.rupeeImpact);
}

/** Daily contribution over a window, for the home screen's trend. */
export type TrendPoint = {
  day: number;
  /** Earned that day after every deduction, from her settlement lines. */
  value: number;
  /** Parcels dispatched that day. */
  parcels: number;
  /** Of those, how many were delivered and kept. */
  paid: number;
};

export function contributionTrend(world: World, sellerId: string, days = 30): TrendPoint[] {
  const settlements = settlementsFor(world, sellerId, days);
  const byDay = new Map<number, TrendPoint>();
  for (const s of settlements) {
    // Goods on a delivered parcel are gone; goods on a refused or returned one
    // come back and lose only the write-down. Charging the full cost of goods
    // on every failed parcel would overstate her losses.
    const goods = s.outcome === "delivered" ? s.cogs : s.cogs * RETURN_WRITEDOWN;
    const row = byDay.get(s.dispatchedDay) ?? { day: s.dispatchedDay, value: 0, parcels: 0, paid: 0 };
    row.value += s.netCredit - goods;
    row.parcels += 1;
    if (s.outcome === "delivered") row.paid += 1;
    byDay.set(s.dispatchedDay, row);
  }
  const out: TrendPoint[] = [];
  for (let d = world.day - days + 1; d <= world.day; d++) {
    out.push(byDay.get(d) ?? { day: d, value: 0, parcels: 0, paid: 0 });
  }
  return out;
}

/**
 * The funnel from a seller's actual settlement lines.
 *
 * A failed parcel's cost is what its settlement line took from her (freight,
 * GST, packing, ads) plus the write-down on the goods that came back — the
 * settlement line itself does not carry the goods.
 */
export function funnelFromLedger(settlements: SettlementLine[]): Funnel {
  const lossOn = (outcome: "rto" | "returned") =>
    settlements
      .filter((s) => s.outcome === outcome)
      .reduce((acc, s) => acc + -s.netCredit + s.cogs * RETURN_WRITEDOWN, 0);

  const dispatched = settlements.length;
  const rto = settlements.filter((s) => s.outcome === "rto").length;
  const returned = settlements.filter((s) => s.outcome === "returned").length;

  return {
    dispatched,
    delivered: dispatched - rto,
    paid: dispatched - rto - returned,
    rtoCost: lossOn("rto"),
    returnCost: lossOn("returned"),
  };
}
