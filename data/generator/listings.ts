/**
 * Listing generation.
 *
 * Each seller's listings are priced by HER RULE, not by a desired outcome. The
 * rules are behavioural ("undercut the cheapest rival by ₹6") rather than
 * results-oriented ("lose ₹47,500 a month"). Whether that rule leaves her above
 * the ceiling, below her floor, or inside the band is then a fact about the
 * world, discovered by the engine — never something written here.
 */

import { estimateCeiling } from "@/engine/ceiling";
import { survivalPrice } from "@/engine/cost";
import { freightFor } from "@/engine/money";
import { REVERSE_FREIGHT_MULTIPLIER, RTO_BY_COD, RETURN_RATE_BY_CATEGORY } from "@/engine/constants";
import { int, pick, rngFor, uniform } from "@/engine/rng";
import type { Category, CompetitorListing, DesignCluster, Listing } from "@/engine/types";
import { makeAttributes } from "./clusters";
import type { PersonaSpec } from "./personas";

const PRODUCT_PREFIX: Record<string, string[]> = {
  kurti: ["Cotton", "Rayon", "Printed", "Embroidered", "Casual"],
  saree: ["Georgette", "Silk Blend", "Printed", "Party Wear"],
  "co-ord-set": ["Printed", "Solid", "Summer"],
  bedsheet: ["Double Bed", "King Size", "Cotton"],
  "kitchen-storage": ["Airtight", "Steel", "Stackable"],
  "phone-cover": ["Matte", "Printed", "Shockproof"],
  "jewellery-set": ["Kundan", "Oxidised", "Pearl"],
};

/** Her survival price, computed the same way the app computes it. */
function floorFor(persona: PersonaSpec, cogs: number, grams: number, category: Category): number {
  const forward = freightFor(grams);
  const rto =
    (persona.codShare * RTO_BY_COD.cod + (1 - persona.codShare) * RTO_BY_COD.prepaid) *
    RTO_BY_COD.dampening;
  return survivalPrice({
    cogs,
    rtoRate: rto,
    returnRate: RETURN_RATE_BY_CATEGORY[category] ?? 0.12,
    adSpendRate: persona.adSpendRate,
    forwardFreight: forward,
    reverseFreight: forward * REVERSE_FREIGHT_MULTIPLIER,
    packaging: persona.packagingCost,
  }).value;
}

export function generateListings(
  seed: number,
  personas: PersonaSpec[],
  clusters: DesignCluster[],
  competitors: CompetitorListing[],
  today: number,
): Listing[] {
  const out: Listing[] = [];

  for (const persona of personas) {
    if (persona.listingCount === 0) continue;

    const eligible = clusters.filter((c) => persona.categories.includes(c.category));
    if (!eligible.length) continue;

    for (let i = 0; i < persona.listingCount; i++) {
      const rng = rngFor(seed, "listing", persona.id, i);
      const cluster = eligible[i % eligible.length];
      if (!cluster) continue;

      const rivals = competitors.filter((c) => c.clusterId === cluster.id);
      const rivalPrices = rivals.map((r) => r.price).sort((a, b) => a - b);
      const cheapest = rivalPrices.length ? (rivalPrices[0] ?? 200) : 200;
      const median = rivalPrices.length
        ? (rivalPrices[Math.floor(rivalPrices.length / 2)] ?? cheapest)
        : cheapest;
      const ceiling = estimateCeiling(rivals).value;

      // Weight tracks the cluster's price level. Freight is charged by slab, so
      // on a ₹200 kurti an 800g parcel is most of the cost to serve — real
      // sellers in cheap clusters ship light, because the slab is the business.
      const weightPull = Math.min(1.15, Math.max(0.55, median / 420));
      const grams = Math.max(
        60,
        Math.round(cluster.attributes.weightBand * weightPull * uniform(rng, 0.82, 1.1)),
      );

      // COGS is anchored to the cluster MEDIAN, not the cheapest rival: sellers
      // buy from broadly the same wholesale market, and the median is what a
      // typical one pays. Anchoring to the cheapest instead pushes every floor
      // up against the ceiling and makes NO_BAND the normal case rather than
      // the notable one.
      // The survival price lands at roughly 2.2-2.3x COGS once RTO, returns,
      // both freight legs, GST and ads are counted. So a seller whose goods
      // cost half the market price has no viable band at all — which is the
      // arithmetic reality of this business, and why wholesale sourcing at
      // ~a third of retail is what makes marketplace selling work.
      const cogs = Math.round(median * uniform(rng, 0.3, 0.4));
      const mrp = Math.round(median * uniform(rng, 1.7, 2.4));
      const floor = floorFor(persona, cogs, grams, cluster.category);

      // --- her pricing rule, applied as she would apply it ---
      let price: number;
      switch (persona.pricingRule) {
        case "offline_markup":
          // Cost plus her shop markup. She never looks at the grid.
          price = Math.round(cogs * (persona.offlineMarkup ?? 1.7));
          break;
        case "undercut": {
          // He watches the listings ABOVE the rock-bottom outlier — the prices
          // the bulk of orders actually happen at — and goes a few rupees
          // under. He never checks that against his own cost to serve.
          const target = cheapest + (median - cheapest) * 0.45;
          price = Math.max(20, Math.round(target - (persona.undercutBy ?? 5)));
          break;
        }
        case "stale": {
          // Priced sensibly eleven months ago, against the costs of that time:
          // a lower COD share, a lighter freight slab, fewer returns. Those
          // have all drifted since. The price has not moved, so a chunk of her
          // catalogue has quietly slipped under a floor that rose without her.
          const thenFloor = floor * uniform(rng, 0.76, 0.88);
          price = Math.round(thenFloor + (ceiling - thenFloor) * uniform(rng, 0.2, 0.45));
          break;
        }
        case "banded":
          price =
            ceiling > floor
              ? Math.round(floor + (ceiling - floor) * uniform(rng, 0.3, 0.6))
              : Math.round(floor * 1.02);
          break;
        case "mixed":
          price =
            rng() < 0.62 && ceiling > floor
              ? Math.round(floor + (ceiling - floor) * uniform(rng, 0.25, 0.55))
              : Math.max(20, Math.round(cheapest - (persona.undercutBy ?? 4)));
          break;
        default:
          price = Math.round(cogs * 1.7);
      }

      const listedDay =
        persona.pricingRule === "stale"
          ? persona.joinedDay + int(rng, 0, 20)
          : persona.joinedDay + int(rng, 0, Math.max(1, today - persona.joinedDay - 30));

      const prefix = pick(rng, PRODUCT_PREFIX[cluster.category] ?? ["Classic"]) ?? "Classic";

      out.push({
        id: `sku-${persona.id.replace("slr-", "")}-${String(i + 1).padStart(3, "0")}`,
        sellerId: persona.id,
        clusterId: cluster.id,
        name: `${prefix} ${cluster.name}`,
        category: cluster.category,
        price,
        cogs,
        weightGrams: grams,
        mrp,
        rating: Math.round(uniform(rng, 3.1, 4.6) * 10) / 10,
        ratingCount: int(rng, 0, 380),
        inventory: int(rng, 0, 140),
        listedDay,
        stage: "S1_DISCOVER",
        attributes: makeAttributes(rng, cluster.category, mrp, grams),
      });
    }
  }

  return out;
}
