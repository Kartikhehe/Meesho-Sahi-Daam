/**
 * Where a rate comes from when a seller has little or no data of her own.
 *
 * The fallback ladder, most specific first:
 *   her own orders → the design cluster (look-alikes) → the category → the platform
 * The first level with enough data becomes the prior, and her own figure is
 * blended in by credibility:
 *
 *   estimate = (n · own + K · prior) ÷ (n + K)        K = 30
 *
 * Refusals (RTO) are modelled on the BUYER side — by destination pincode tier
 * and payment mode — not as a property of the seller. A day-zero seller
 * therefore inherits real refusal rates for the buyers she will ship to,
 * weighted by her own cash-on-delivery mix.
 *
 * Freight is exact from day zero (rate card × weight), GST is statutory, and
 * cost of goods is the only number the seller types. Everything here is
 * computed from the world's own order history — nothing is typed in.
 */

import { CREDIBILITY_K, PINCODE_TIERS, RETURN_RATE_BY_CATEGORY } from "./constants";
import { step, type TraceStep } from "./trace";
import type { Listing, OrderEvent, World } from "./types";

/** A prior level needs at least this many parcels before it is trusted. */
const MIN_PRIOR_N = 100;

export type PriorLevel = "own" | "design cluster" | "category" | "platform";

export type RateEstimate = {
  value: number;
  own: number | null;
  n: number;
  prior: number;
  priorLevel: PriorLevel;
  priorN: number;
  /** One line a seller can read: where this number came from. */
  basis: string;
  trace: TraceStep;
};

type Cell = { n: number; hits: number };
const rate = (c: Cell | undefined) => (c && c.n > 0 ? c.hits / c.n : 0);

export type PriorTables = {
  /** RTO by pincode tier × payment mode, over dispatched parcels. */
  rtoByTierMode: Map<string, Cell>;
  /** Each seller's own RTO, over her dispatched parcels. */
  rtoBySeller: Map<string, Cell>;
  /** Returns over delivered parcels, by listing / cluster / category. */
  returnsByListing: Map<string, Cell>;
  returnsByCluster: Map<string, Cell>;
  returnsByCategory: Map<string, Cell>;
  returnsPlatform: Cell;
};

const cache = new WeakMap<OrderEvent[], PriorTables>();

export function priorTables(world: World): PriorTables {
  const hit = cache.get(world.orders);
  if (hit) return hit;

  const listingMap = new Map(world.listings.map((l) => [l.id, l]));
  const t: PriorTables = {
    rtoByTierMode: new Map(),
    rtoBySeller: new Map(),
    returnsByListing: new Map(),
    returnsByCluster: new Map(),
    returnsByCategory: new Map(),
    returnsPlatform: { n: 0, hits: 0 },
  };
  const bump = (m: Map<string, Cell>, k: string, isHit: boolean) => {
    const c = m.get(k) ?? { n: 0, hits: 0 };
    c.n += 1;
    if (isHit) c.hits += 1;
    m.set(k, c);
  };

  for (const o of world.orders) {
    bump(t.rtoByTierMode, `${o.pincodeTier}|${o.paymentMode}`, o.outcome === "rto");
    const l = listingMap.get(o.listingId);
    if (l) bump(t.rtoBySeller, l.sellerId, o.outcome === "rto");
    if (o.outcome === "rto") continue;
    const returned = o.outcome === "returned";
    bump(t.returnsByListing, o.listingId, returned);
    if (l) {
      bump(t.returnsByCluster, l.clusterId, returned);
      bump(t.returnsByCategory, l.category, returned);
    }
    t.returnsPlatform.n += 1;
    if (returned) t.returnsPlatform.hits += 1;
  }
  cache.set(world.orders, t);
  return t;
}

function blend(own: number | null, n: number, prior: number, k: number) {
  return own === null || n === 0 ? prior : (n * own + k * prior) / (n + k);
}

const lakh = (n: number) => (n >= 100000 ? `${(n / 100000).toFixed(1)} lakh` : n.toLocaleString("en-IN"));

/** Refusal rate for a seller: buyer-side prior by tier × payment, blended with her own. */
export function estimateRto(world: World, sellerId: string, codShare: number, k = CREDIBILITY_K): RateEstimate {
  const t = priorTables(world);

  let prior = 0;
  let priorN = 0;
  const children: TraceStep[] = [];
  for (const tier of PINCODE_TIERS) {
    const cod = t.rtoByTierMode.get(`${tier.tier}|cod`);
    const pre = t.rtoByTierMode.get(`${tier.tier}|prepaid`);
    const tierRate = codShare * rate(cod) + (1 - codShare) * rate(pre);
    prior += tier.share * tierRate;
    priorN += (cod?.n ?? 0) + (pre?.n ?? 0);
    children.push(
      step(`Tier-${tier.tier} pincodes`, `टियर-${tier.tier} पिनकोड`, `${(rate(cod) * 100).toFixed(1)}% COD · ${(rate(pre) * 100).toFixed(1)}% prepaid`, tierRate, "PCT", "platform_ledger", `From ${lakh(cod?.n ?? 0)} COD and ${lakh(pre?.n ?? 0)} prepaid parcels to this pincode tier`),
    );
  }

  const mine = t.rtoBySeller.get(sellerId);
  const n = mine?.n ?? 0;
  const own = n > 0 ? rate(mine) : null;
  const value = blend(own, n, prior, k);
  const basis = n >= k ? `Your own ${n} parcels, blended with buyer-side rates` : `MEESHO · prior: buyer-side, n=${lakh(priorN)}`;

  return {
    value, own, n, prior, priorLevel: n >= k ? "own" : "platform", priorN, basis,
    trace: step("Refused at the door (RTO)", "दरवाज़े पर मना", `(${n} × ${own === null ? "—" : (own * 100).toFixed(1) + "%"} + ${k} × ${(prior * 100).toFixed(1)}%) ÷ (${n} + ${k})`, value, "PCT", "platform_ledger", `Refusals belong to buyers, not sellers: priced from where your parcels go, at your ${(codShare * 100).toFixed(0)}% cash-on-delivery mix`, children),
  };
}

/** Return rate for a listing: the fallback ladder, blended with her own. */
export function estimateReturns(world: World, listing: Listing, k = CREDIBILITY_K): RateEstimate {
  const t = priorTables(world);
  const ownCell = t.returnsByListing.get(listing.id);
  const cl = t.returnsByCluster.get(listing.clusterId);
  const cat = t.returnsByCategory.get(listing.category);

  // The cluster prior excludes her own parcels, so she is not her own prior.
  const clusterOther: Cell = { n: (cl?.n ?? 0) - (ownCell?.n ?? 0), hits: (cl?.hits ?? 0) - (ownCell?.hits ?? 0) };

  let priorLevel: PriorLevel;
  let prior: number;
  let priorN: number;
  if (clusterOther.n >= MIN_PRIOR_N) { priorLevel = "design cluster"; prior = rate(clusterOther); priorN = clusterOther.n; }
  else if ((cat?.n ?? 0) >= MIN_PRIOR_N) { priorLevel = "category"; prior = rate(cat); priorN = cat?.n ?? 0; }
  else { priorLevel = "platform"; prior = RETURN_RATE_BY_CATEGORY[listing.category] ?? rate(t.returnsPlatform); priorN = t.returnsPlatform.n; }

  const n = ownCell?.n ?? 0;
  const own = n > 0 ? rate(ownCell) : null;
  const value = blend(own, n, prior, k);
  const basis = `MEESHO · prior: ${priorLevel}, n=${lakh(priorN)}`;

  return {
    value, own, n, prior, priorLevel, priorN, basis,
    trace: step("Returned after delivery", "डिलीवरी के बाद वापसी", `(${n} × ${own === null ? "—" : (own * 100).toFixed(1) + "%"} + ${k} × ${(prior * 100).toFixed(1)}%) ÷ (${n} + ${k})`, value, "PCT", "platform_ledger", n >= k ? `Mostly your own ${n} delivered parcels` : `${n} of your own delivered parcels so far — the ${priorLevel} prior carries the rest`, [
      step("Your own rate", "आपकी अपनी दर", own === null ? "no orders yet" : `${ownCell?.hits} of ${n} delivered`, own ?? 0, "PCT", "platform_ledger"),
      step(`Prior: ${priorLevel}`, "पहले का अनुमान", `over ${lakh(priorN)} delivered parcels`, prior, "PCT", priorLevel === "platform" ? "benchmark" : "cluster_model"),
      step("Weight on your own", "आपके आँकड़ों का वज़न", `${n} ÷ (${n} + ${k})`, n / (n + k), "RATIO", "derived"),
    ]),
  };
}
