/**
 * The deck's worked kurti, placed in the world as real data.
 *
 * One design cluster carries the deck's measured demand curve and a set of
 * rivals whose order-weighted prices put the visibility ceiling at ₹352. Its
 * rivals are held still (`stable`) so the deck's numbers stay reproducible.
 * Three personas list the same kurti at the deck's price points:
 *
 *   Imran   ₹299   the matcher — loses ₹46 an order, about ₹47.5k a month
 *   Suresh  ₹449   the shopkeeper — above the gate, dies unseen
 *   Anita   ₹334   after the three unlocks (COGS 158, returns 13%, COD 55%),
 *                  with a price ladder that settles on ₹334
 *
 * These are data, not logic: nothing in the engine knows these listings exist.
 */

import { REFERENCE_DEMAND } from "@/engine/reference";
import type { CompetitorListing, DesignCluster, Listing } from "@/engine/types";

export const REFERENCE_CLUSTER_ID = "cl-ref";

const RIVAL_PRICES = [329, 330, 332, 333, 335, 336, 338, 339, 341, 342, 344, 345, 346, 348, 352, 357, 361, 365];

export const REFERENCE_ATTRIBUTES = {
  category: "kurti" as const,
  fabric: "cotton",
  weightBand: 400,
  mrpBand: 700,
  colourFamily: "blue",
  occasion: "daily",
  sleeveType: "three-quarter",
};

export function referenceCluster(): DesignCluster {
  return {
    id: REFERENCE_CLUSTER_ID,
    name: "Cotton straight kurti",
    category: "kurti",
    baseDailyDemand: 30,
    elasticity: 3.4,
    attributes: REFERENCE_ATTRIBUTES,
    stable: true,
    demandPrior: REFERENCE_DEMAND,
  };
}

export function referenceCompetitors(): CompetitorListing[] {
  return RIVAL_PRICES.map((price, i) => ({
    id: `cmp-${REFERENCE_CLUSTER_ID}-${String(i).padStart(2, "0")}`,
    clusterId: REFERENCE_CLUSTER_ID,
    price,
    rating: 3.9 + (i % 5) * 0.1,
    orderShare: 0,
  }));
}

export function heroListings(historyDays: number): Listing[] {
  const base = {
    clusterId: REFERENCE_CLUSTER_ID,
    category: "kurti" as const,
    weightGrams: 450,
    mrp: 799,
    rating: 4.1,
    ratingCount: 120,
    inventory: 140,
    stage: "S3_HARVEST" as const,
    productType: "evergreen" as const,
    attributes: REFERENCE_ATTRIBUTES,
  };
  return [
    { ...base, id: "sku-imran-ref", sellerId: "slr-imran", name: "Cotton straight kurti — navy", price: 299, cogs: 180, listedDay: historyDays - 200, measured: { returnRate: 0.2, codShare: 0.8 } },
    { ...base, id: "sku-suresh-ref", sellerId: "slr-suresh", name: "Cotton straight kurti — navy", price: 449, cogs: 180, listedDay: historyDays - 200, rating: 4.3, measured: { returnRate: 0.2, codShare: 0.8 } },
    { ...base, id: "sku-anita-ref", sellerId: "slr-anita", name: "Cotton straight kurti — navy, re-sourced", price: 334, cogs: 158, listedDay: historyDays - 120, measured: { returnRate: 0.13, codShare: 0.55 } },
  ];
}
