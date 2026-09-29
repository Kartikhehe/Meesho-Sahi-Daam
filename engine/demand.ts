/**
 * The demand model — the intellectual core.
 *
 * ordersPerDay(listing, day) =
 *     clusterDailyDemand(cluster, day)   // seasonal + festive
 *   × priceShare(listing, cluster)       // softmax over −elasticity × ln(price)
 *   × visibilityGate(price, ceiling)     // sigmoid collapse above the ceiling
 *   × ratingFactor(rating)               // below 3.8 penalised sharply
 *   × stockFactor(inventory)
 *   × noise(seed, listing, day)          // lognormal, low variance
 *
 * All three archetype failures must EMERGE from this model. There is no
 * `if (seller === "imran")` anywhere in this codebase: Imran loses money
 * because the softmax rewards his undercutting with volume while his price
 * sits under his own floor, and Suresh sells nothing because the visibility
 * gate collapses his impressions. If the magnitudes are wrong, the parameters
 * in constants.ts get tuned — never the logic.
 */

import { RATING_PENALTY_KNEE, VISIBILITY_GATE_WIDTH } from "./constants";
import { lognormal, rngFor } from "./rng";
import { step, traced, type Traced } from "./trace";
import type { CompetitorListing, DesignCluster, Listing } from "./types";

/**
 * Seasonality. Indian ethnic wear peaks around the festive season (roughly
 * Sept-Nov: Navratri, Durga Puja, Diwali) and again for wedding season. Home
 * goods are far flatter.
 */
export function seasonalMultiplier(cluster: DesignCluster, day: number): number {
  const dayOfYear = ((day % 365) + 365) % 365;
  const festive = Math.exp(-Math.pow((dayOfYear - 285) / 34, 2)); // Oct peak
  const wedding = Math.exp(-Math.pow((dayOfYear - 40) / 30, 2)); // Feb peak
  const apparel = ["kurti", "saree", "co-ord-set", "jewellery-set"].includes(cluster.category);
  const amplitude = apparel ? 0.85 : 0.25;
  return 1 + amplitude * festive + amplitude * 0.5 * wedding;
}

export function clusterDailyDemand(cluster: DesignCluster, day: number): number {
  return cluster.baseDailyDemand * seasonalMultiplier(cluster, day);
}

/**
 * Share of the cluster's orders this listing takes, as a softmax over
 * −elasticity × ln(price). The log form is what makes it a constant-elasticity
 * response: a 10% price cut moves share by the same proportion whether the
 * price is ₹300 or ₹3,000. The cheapest credible listing takes the large
 * majority — which is exactly why undercutting feels like it is working.
 */
export function priceShare(
  price: number,
  rivals: CompetitorListing[],
  elasticity: number,
): number {
  if (price <= 0) return 0;
  const util = (p: number) => -elasticity * Math.log(p);
  const mine = Math.exp(util(price));
  const theirs = rivals.reduce((acc, r) => (r.price > 0 ? acc + Math.exp(util(r.price)) : acc), 0);
  const total = mine + theirs;
  return total > 0 ? mine / total : 0;
}

/**
 * The visibility gate. Above the ceiling, impressions fall off a cliff rather
 * than tapering — buyers sort by price and never scroll far enough to see you.
 *
 * This single function reproduces the Shopkeeper's failure: her prices are
 * perfectly sensible by her own arithmetic, and she still sells nothing.
 */
export function visibilityGate(price: number, ceiling: number): number {
  if (ceiling <= 0) return 1;
  return 1 / (1 + Math.exp((price - ceiling) / VISIBILITY_GATE_WIDTH));
}

/** Below 3.8 stars conversion falls sharply; above it the gain is modest. */
export function ratingFactor(rating: number): number {
  if (rating <= 0) return 0.55; // brand-new listing, no reviews yet
  const d = rating - RATING_PENALTY_KNEE;
  return d >= 0 ? 1 + 0.12 * Math.min(d, 1.2) : Math.max(0.15, 1 + 0.65 * d);
}

export function stockFactor(inventory: number): number {
  if (inventory <= 0) return 0;
  if (inventory < 5) return 0.6; // low stock throttles surfacing
  return 1;
}

/**
 * Orders for one listing on one day. Deterministic given the world seed: the
 * noise draw is keyed by listing id and day, so adding a listing never
 * perturbs another listing's history.
 */
export function ordersPerDay(
  listing: Listing,
  cluster: DesignCluster,
  rivals: CompetitorListing[],
  ceiling: number,
  day: number,
  seed: number,
): Traced<number> {
  const base = clusterDailyDemand(cluster, day);
  const share = priceShare(listing.price, rivals, cluster.elasticity);
  const gate = visibilityGate(listing.price, ceiling);
  const rating = ratingFactor(listing.rating);
  const stock = stockFactor(listing.inventory);
  const noise = lognormal(rngFor(seed, listing.id, day), 1, 0.22);

  const value = base * share * gate * rating * stock * noise;

  return traced(Math.max(0, value), [
    step(
      "Buyers looking for this design each day",
      "रोज़ कितने ग्राहक",
      `${cluster.baseDailyDemand.toFixed(1)} × ${seasonalMultiplier(cluster, day).toFixed(2)} season`,
      base,
      "COUNT",
      "cluster_model",
      "Across every listing in this design, not only yours",
    ),
    step(
      "Your share at this price",
      "इस दाम पर आपका हिस्सा",
      `softmax over ${rivals.length + 1} listings`,
      share,
      "RATIO",
      "cluster_model",
      "Buyers sort by price, so the cheapest credible listing takes most of it",
    ),
    step(
      "How often you are seen",
      "कितनी बार दिखे",
      `price ₹${listing.price} vs ceiling ₹${ceiling.toFixed(0)}`,
      gate,
      "RATIO",
      "cluster_model",
      gate < 0.5
        ? "Above the ceiling, buyers stop finding this listing"
        : "Your price keeps you on the pages buyers actually look at",
    ),
    step(
      "Rating effect",
      "रेटिंग का असर",
      `${listing.rating.toFixed(1)} stars`,
      rating,
      "RATIO",
      "platform_ledger",
    ),
    step(
      "Stock effect",
      "स्टॉक का असर",
      `${listing.inventory} in stock`,
      stock,
      "RATIO",
      "platform_ledger",
    ),
    step(
      "Orders a day",
      "रोज़ के ऑर्डर",
      `${base.toFixed(1)} × ${share.toFixed(3)} × ${gate.toFixed(2)} × ${rating.toFixed(2)} × ${stock.toFixed(2)}`,
      value,
      "COUNT",
      "derived",
    ),
  ]);
}

/**
 * Orders per month across a price range, for the price-profit-volume curve.
 * Noise is deliberately excluded here: the curve is the model's expectation,
 * and a jagged line would read as data rather than as a projection.
 */
export function demandCurve(
  listing: Listing,
  cluster: DesignCluster,
  rivals: CompetitorListing[],
  ceiling: number,
  day: number,
  prices: number[],
): { price: number; ordersPerMonth: number }[] {
  const base = clusterDailyDemand(cluster, day);
  const rating = ratingFactor(listing.rating);
  const stock = stockFactor(listing.inventory);
  return prices.map((price) => {
    const share = priceShare(price, rivals, cluster.elasticity);
    const gate = visibilityGate(price, ceiling);
    return { price, ordersPerMonth: Math.max(0, base * share * gate * rating * stock * 30) };
  });
}
