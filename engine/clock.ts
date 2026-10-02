/**
 * The simulation clock.
 *
 * advanceDays(world, n) is what makes this a product rather than a set of
 * screenshots. Advancing the clock:
 *   - generates new orders from the demand model for every live listing
 *   - resolves each to delivered / RTO / returned via the pincode + payment model
 *   - writes settlement lines, credited with a 15-day lag
 *   - drifts competitor prices (random walk with mild mean reversion)
 *   - drifts freight slabs occasionally, and return rates seasonally
 *   - re-evaluates all six triggers and raises alerts (respecting the cap)
 *   - advances each listing's lifecycle stage
 *   - steps any running price ladder
 *
 * Pure: it returns a new World and mutates nothing. Nothing is pre-baked — the
 * charts show what the simulation actually produced.
 */

import { classifyBand } from "./band";
import { estimateCeiling } from "./ceiling";
import {
  AD_SPEND_RATE_DEFAULT,
  GST_ON_FEES,
  PINCODE_TIERS,
  RETURN_RATE_BY_CATEGORY,
  REVERSE_FREIGHT_MULTIPLIER,
  RTO_BY_COD,
  SETTLEMENT_LAG_DAYS,
} from "./constants";
import { contributionPerOrder, survivalPrice, type CostInputs } from "./cost";
import { ordersPerDay } from "./demand";
import { freightFor } from "./money";
import { chance, normal, pickWeighted, rngFor, uniform } from "./rng";
import { advanceStage } from "./lifecycle";
import { envAt, type CostEnv } from "./environment";
import { classifyRegime, type Regime } from "./regime";
import { armPrice, conclude, enforceLossCap, nextArm, shouldConclude, updateArmDay } from "./bandit";
import { LADDER_MIN_SHOWS, LADDER_SHOWS_PER_DAY } from "./constants";
import { applyWeeklyCap, evaluateTriggers, type TriggerContext } from "./triggers";
import type {
  CompetitorListing,
  DesignCluster,
  Listing,
  OrderEvent,
  OrderOutcome,
  PaymentMode,
  Seller,
  SettlementLine,
  World,
} from "./types";

/** Effective RTO rate for a seller, from her COD share and the pincode mix. */
export function rtoRateFor(seller: Seller, tierMultiplier = 1): number {
  const blended = seller.codShare * RTO_BY_COD.cod + (1 - seller.codShare) * RTO_BY_COD.prepaid;
  return blended * RTO_BY_COD.dampening * tierMultiplier;
}

export function returnRateFor(listing: Listing, returnsMultiplier = 1): number {
  const base = listing.measured?.returnRate ?? RETURN_RATE_BY_CATEGORY[listing.category] ?? 0.12;
  return Math.min(0.6, base * returnsMultiplier);
}

const NEUTRAL: CostEnv = { freight: () => 1, returns: 1 };

/**
 * The cost inputs for one listing, assembled from her own ledger, under the
 * cost conditions (freight re-cards, monsoon returns) of a given day.
 */
export function costInputsFor(listing: Listing, seller: Seller, env: CostEnv = NEUTRAL): CostInputs {
  const forward = freightFor(listing.weightGrams) * env.freight(listing.weightGrams);
  const codShare = listing.measured?.codShare ?? seller.codShare;
  return {
    cogs: listing.cogs,
    rtoRate: rtoRateFor({ ...seller, codShare }),
    returnRate: returnRateFor(listing, env.returns),
    adSpendRate: seller.adSpendRate ?? AD_SPEND_RATE_DEFAULT,
    forwardFreight: forward,
    reverseFreight: forward * REVERSE_FREIGHT_MULTIPLIER,
    packaging: seller.packagingCost,
  };
}

function rivalsOf(world: World, clusterId: string): CompetitorListing[] {
  return world.competitors.filter((c) => c.clusterId === clusterId);
}

/** Resolve one order to delivered / RTO / returned. */
function resolveOutcome(
  rng: () => number,
  seller: Seller,
  listing: Listing,
  tierMultiplier: number,
  paymentMode: PaymentMode,
  returnsMultiplier = 1,
): OrderOutcome {
  const rtoBase = paymentMode === "cod" ? RTO_BY_COD.cod : RTO_BY_COD.prepaid;
  const rto = rtoBase * RTO_BY_COD.dampening * tierMultiplier;
  if (chance(rng, rto)) return "rto";
  if (chance(rng, returnRateFor(listing, returnsMultiplier))) return "returned";
  return "delivered";
}

/**
 * The settlement line for one order. A pure function of the order, the
 * listing's weight and the seller's rates — which is why a stored world does
 * not persist these and rebuilds them on load instead.
 */
export function settlementFor(
  order: OrderEvent,
  listing: Listing,
  seller: Seller,
  freightMultiplier = 1,
): SettlementLine {
  const forward = freightFor(listing.weightGrams) * freightMultiplier;
  const reverse = forward * REVERSE_FREIGHT_MULTIPLIER;
  const paid = order.outcome === "delivered";

  // Forward freight is charged on delivered units only: a refused parcel's is
  // credited back. The return leg is charged on customer returns only — the
  // refused-parcel return leg is borne by Valmo. GST applies to the forward
  // fee and to ads, matching the cost model exactly.
  const forwardFreightReversed = order.outcome === "rto" ? forward : 0;
  const reverseFreight = order.outcome === "returned" ? reverse : 0;
  const adCost = order.price * (seller.adSpendRate ?? AD_SPEND_RATE_DEFAULT);
  const gst = (forward - forwardFreightReversed + adCost) * GST_ON_FEES;

  const saleValue = paid ? order.price : 0;
  const netCredit =
    saleValue - (forward - forwardFreightReversed) - reverseFreight - adCost - gst - seller.packagingCost;

  return {
    orderId: order.id,
    listingId: listing.id,
    dispatchedDay: order.day,
    creditedDay: order.day + SETTLEMENT_LAG_DAYS,
    outcome: order.outcome,
    saleValue,
    cogs: listing.cogs,
    forwardFreight: forward,
    forwardFreightReversed,
    reverseFreight,
    adCost,
    gstOnFees: gst,
    packaging: seller.packagingCost,
    netCredit,
  };
}

/**
 * Competitor prices drift as a random walk with mild mean reversion toward the
 * cluster's own median — rivals react to each other, but nobody drifts away
 * forever.
 */
function driftCompetitors(world: World, day: number): CompetitorListing[] {
  const medians = new Map<string, number>();
  for (const cluster of world.clusters) {
    const prices = world.competitors
      .filter((c) => c.clusterId === cluster.id)
      .map((c) => c.price)
      .sort((a, b) => a - b);
    if (prices.length) medians.set(cluster.id, prices[Math.floor(prices.length / 2)] ?? 0);
  }

  const stable = new Set(world.clusters.filter((c) => c.stable).map((c) => c.id));
  return world.competitors.map((c) => {
    if (stable.has(c.clusterId)) return c;
    const rng = rngFor(world.seed, "competitor", c.id, day);
    const median = medians.get(c.clusterId) ?? c.price;
    const reversion = (median - c.price) * 0.02;
    const walk = normal(rng, 0, 1.6);
    const next = Math.max(20, Math.round(c.price + reversion + walk));
    return { ...c, price: next };
  });
}

/** Recompute order share from current prices, so share follows price honestly. */
function rebalanceShares(competitors: CompetitorListing[], clusters: DesignCluster[]): CompetitorListing[] {
  const byCluster = new Map<string, CompetitorListing[]>();
  for (const c of competitors) {
    const list = byCluster.get(c.clusterId);
    if (list) list.push(c);
    else byCluster.set(c.clusterId, [c]);
  }

  const out: CompetitorListing[] = [];
  for (const [clusterId, list] of byCluster) {
    const cluster = clusters.find((x) => x.id === clusterId);
    const elasticity = cluster?.elasticity ?? 3;
    const utils = list.map((c) => Math.exp(-elasticity * Math.log(Math.max(c.price, 1))));
    const total = utils.reduce((a, b) => a + b, 0);
    list.forEach((c, i) => {
      out.push({ ...c, orderShare: total > 0 ? (utils[i] ?? 0) / total : 0 });
    });
  }
  return out;
}

export type AdvanceResult = { world: World; ordersCreated: number; alertsRaised: number };

export function advanceDays(world: World, days: number): AdvanceResult {
  let current: World = { ...world };
  let ordersCreated = 0;
  let alertsRaised = 0;

  for (let i = 0; i < days; i++) {
    const day = current.day + 1;
    const env = envAt(current, day);
    const newOrders: OrderEvent[] = [];
    const newSettlements: SettlementLine[] = [];
    let experiments = current.experiments;
    /** Today's selling price for listings on a price ladder. */
    const ladderPrice = new Map<string, number>();

    // 1. Competitor prices drift, then shares rebalance to match.
    const competitors = rebalanceShares(driftCompetitors(current, day), current.clusters);

    // 2. Orders for every live listing.
    for (const listing of current.listings) {
      if (listing.stage === "S5_EXIT" || listing.inventory <= 0 || listing.listedDay > day) continue;
      const cluster = current.clusters.find((c) => c.id === listing.clusterId);
      const seller = current.sellers.find((s) => s.id === listing.sellerId);
      if (!cluster || !seller) continue;

      const rivals = competitors.filter((c) => c.clusterId === listing.clusterId);
      const ceiling = estimateCeiling(rivals).value;

      // A running price ladder picks today's rung by Thompson sampling.
      const exp = listing.experimentId ? experiments.find((e) => e.id === listing.experimentId && e.status === "running") : undefined;
      const inputs = costInputsFor(listing, seller, env);
      let selling = listing;
      if (exp) {
        const arm = nextArm(exp, (p) => contributionPerOrder(p, inputs).value, day, current.seed).value;
        selling = { ...listing, price: armPrice(exp, arm) };
        ladderPrice.set(listing.id, selling.price);
        const expectedArm = ordersPerDay(selling, cluster, rivals, ceiling, day, current.seed).value;
        const expectedBase = ordersPerDay({ ...listing, price: exp.basePrice }, cluster, rivals, ceiling, day, current.seed).value;
        const sold = Math.min(LADDER_SHOWS_PER_DAY, Math.round(expectedArm));
        let next = updateArmDay(exp, arm, sold, LADDER_SHOWS_PER_DAY, sold * contributionPerOrder(selling.price, inputs).value);
        next = { ...next, baseline: (next.baseline ?? 0) + expectedBase * contributionPerOrder(exp.basePrice, inputs).value };
        // The 5% cap is judged once every rung has had a week of shows; before
        // that the baseline is too small for the ratio to mean anything, and
        // a day-one halt would settle on whichever rung happened to go first.
        if (next.arms.every((a) => a.impressions >= 7 * LADDER_SHOWS_PER_DAY)) next = enforceLossCap(next, next.baseline ?? 0);
        if (next.status === "running" && shouldConclude(next, LADDER_MIN_SHOWS)) next = conclude(next);
        experiments = experiments.map((e) => (e.id === next.id ? next : e));
      }
      const expected = ordersPerDay(selling, cluster, rivals, ceiling, day, current.seed).value;

      // Fractional expectation → integer orders, without losing the fraction.
      const rng = rngFor(current.seed, "orders", listing.id, day);
      const whole = Math.floor(expected);
      const count = whole + (chance(rng, expected - whole) ? 1 : 0);

      for (let k = 0; k < count; k++) {
        const orderRng = rngFor(current.seed, "order", listing.id, day, k);
        const tier = pickWeighted(orderRng, PINCODE_TIERS, (t) => t.share) ?? PINCODE_TIERS[0];
        // A listing with its own measured cash-on-delivery mix uses it; otherwise
        // payment mode follows the destination tier's propensity.
        const codP = listing.measured?.codShare ?? tier.codPropensity;
        const paymentMode: PaymentMode = chance(orderRng, codP) ? "cod" : "prepaid";
        const outcome = resolveOutcome(orderRng, seller, listing, tier.rtoMultiplier, paymentMode, env.returns);

        const order: OrderEvent = {
          id: `ord-${listing.id}-${day}-${k}`,
          listingId: listing.id,
          day,
          price: selling.price,
          paymentMode,
          pincodeTier: tier.tier,
          outcome,
        };
        newOrders.push(order);
        newSettlements.push(settlementFor(order, listing, seller, env.freight(listing.weightGrams)));
      }
    }
    ordersCreated += newOrders.length;

    const orders = [...current.orders, ...newOrders];
    const settlements = [...current.settlements, ...newSettlements];

    // 3. Inventory falls for delivered units; returns come back to stock.
    const soldByListing = new Map<string, number>();
    for (const o of newOrders) {
      if (o.outcome === "delivered") soldByListing.set(o.listingId, (soldByListing.get(o.listingId) ?? 0) + 1);
    }

    // 4. Lifecycle stages advance.
    const listings = current.listings.map((listing) => {
      const sold = soldByListing.get(listing.id) ?? 0;
      const ordersLast30 = orders.filter((o) => o.listingId === listing.id && o.day > day - 30).length;
      const seller = current.sellers.find((s) => s.id === listing.sellerId);
      let band;
      if (seller) {
        const rivals = competitors.filter((c) => c.clusterId === listing.clusterId);
        const ceiling = estimateCeiling(rivals).value;
        const floor = survivalPrice(costInputsFor(listing, seller, env)).value;
        band = classifyBand(floor, ceiling, listing.price).value;
      }
      // Sellers reorder. A listing that is still selling gets restocked when it
      // runs low — without this the whole world simply runs out of goods over
      // 18 months and every listing exits, which is an artefact of the
      // simulation rather than anything true about the business.
      const remaining = Math.max(0, listing.inventory - sold);
      const restocked =
        remaining < 8 && ordersLast30 > 0 && listing.stage !== "S5_EXIT"
          ? remaining + Math.max(30, Math.round(ordersLast30 * 2.5))
          : remaining;

      const stage = advanceStage(listing, day, { ordersLast30, band });
      // A concluded ladder settles the price on the rung that earned most.
      const exp = listing.experimentId ? experiments.find((e) => e.id === listing.experimentId) : undefined;
      const settled = exp && exp.status !== "running" && exp.winningArm !== undefined ? armPrice(exp, exp.winningArm) : undefined;

      return {
        ...listing,
        price: settled ?? listing.price,
        experimentId: settled !== undefined ? undefined : listing.experimentId,
        inventory: restocked,
        stage,
        exitedDay: stage === "S5_EXIT" ? (listing.exitedDay ?? day) : listing.exitedDay,
      };
    });

    current = { ...current, day, competitors, orders, settlements, listings, experiments };

    // 5. Triggers, once a week, so the weekly cap means something. Regimes are
    //    re-read first, so a shift can fire this same week.
    if (day % 7 === 0) {
      const regimes = clusterRegimes(current);
      const fired = evaluateWeek(current, day, regimes);
      alertsRaised += fired.filter((f) => !f.muted).length;
      current = { ...current, alerts: [...current.alerts, ...fired], clusterRegimes: regimes };
    }
  }

  return { world: current, ordersCreated, alertsRaised };
}

/** Evaluate every seller's listings and apply the per-seller weekly cap. */
export function clusterRegimes(world: World): Record<string, Regime> {
  const out: Record<string, Regime> = {};
  for (const c of world.clusters) out[c.id] = classifyRegime(rivalsOf(world, c.id), undefined, world.clusterRegimes?.[c.id]).value;
  return out;
}

export function evaluateWeek(world: World, day: number, regimes: Record<string, Regime> = clusterRegimes(world)) {
  const out = [];
  for (const seller of world.sellers) {
    const candidates: { result: ReturnType<typeof evaluateTriggers>[number]; listingId: string }[] = [];

    for (const listing of world.listings.filter((l) => l.sellerId === seller.id)) {
      if (listing.stage === "S5_EXIT") continue;
      const rivals = rivalsOf(world, listing.clusterId);
      if (!rivals.length) continue;

      const inputs = costInputsFor(listing, seller, envAt(world, day));
      const floor = survivalPrice(inputs).value;
      const ceiling = estimateCeiling(rivals).value;
      const band = classifyBand(floor, ceiling, listing.price).value;
      // The band as it stood 30 days ago — so COST_DRIFT sees a re-card or a
      // monsoon return spike move the floor under a price that did not move.
      const prevFloor = survivalPrice(costInputsFor(listing, seller, envAt(world, day - 30))).value;
      const previousBand = classifyBand(prevFloor, ceiling, listing.price).value;

      const listingOrders = world.orders.filter((o) => o.listingId === listing.id);
      const ordersLast30 = listingOrders.filter((o) => o.day > day - 30).length;
      const recent = listingOrders.filter((o) => o.day > day - 30);
      const returned = recent.filter((o) => o.outcome === "returned").length;

      const ctx: TriggerContext = {
        listing,
        band,
        day,
        ordersLast30,
        contributionPerOrder: contributionPerOrder(listing.price, inputs).value,
        rivalFloorPrice: Math.min(...rivals.map((r) => r.price)),
        returnRate30: recent.length ? returned / recent.length : 0,
        returnRateBaseline: returnRateFor(listing),
        daysSincePriceChange: day - listing.listedDay,
        previousBand,
        regime: regimes[listing.clusterId],
        previousRegime: world.clusterRegimes?.[listing.clusterId],
      };

      for (const result of evaluateTriggers(ctx)) {
        candidates.push({ result, listingId: listing.id });
      }
    }

    out.push(...applyWeeklyCap(candidates, seller.id, day));
  }
  return out;
}

/** Occasional freight-slab drift, so cost drift triggers have something to find. */
export function driftFreight(day: number, seed: number): number {
  const rng = rngFor(seed, "freight", Math.floor(day / 90));
  return 1 + uniform(rng, -0.03, 0.06);
}
