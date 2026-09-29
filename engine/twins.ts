/**
 * The catalog-twin retriever — cold start for a listing with no history.
 *
 * A new listing has no demand curve of its own, so we borrow one from
 * look-alikes. This is genuine cosine similarity over a real attribute vector,
 * not a stand-in: the similarity scores shown in the UI are the ones used to
 * pick the twins, and a seller can see exactly which listings her price band
 * was inferred from.
 *
 * Categorical attributes are one-hot encoded; numeric ones (weight, MRP) are
 * bucketed and scaled so that no single dimension dominates the cosine.
 */

import { step, traced, type Traced } from "./trace";
import type { AttributeVector, Listing } from "./types";

export type Twin = {
  listing: Listing;
  similarity: number;
  /** Which attributes matched, for the "why this twin?" explanation. */
  matched: string[];
};

/**
 * Weights per attribute. Category dominates — a bedsheet is never a twin for a
 * kurti however well the other fields line up. Fabric and MRP band matter next,
 * because together they set what a buyer expects to pay.
 */
const WEIGHTS = {
  category: 3.0,
  fabric: 1.6,
  mrpBand: 1.4,
  weightBand: 1.0,
  colourFamily: 0.7,
  occasion: 0.9,
  sleeveType: 0.6,
} as const;

/**
 * Encode an attribute vector as a sparse numeric vector, keyed by
 * "field:value" for categoricals and "field" for scaled numerics.
 */
export function encode(a: AttributeVector): Map<string, number> {
  const v = new Map<string, number>();
  v.set(`category:${a.category}`, WEIGHTS.category);
  v.set(`fabric:${a.fabric}`, WEIGHTS.fabric);
  v.set(`colour:${a.colourFamily}`, WEIGHTS.colourFamily);
  v.set(`occasion:${a.occasion}`, WEIGHTS.occasion);
  v.set(`sleeve:${a.sleeveType}`, WEIGHTS.sleeveType);
  // Numerics: log-scaled so that a ₹200 vs ₹400 gap counts like ₹2000 vs ₹4000.
  v.set("mrpBand", WEIGHTS.mrpBand * Math.log1p(a.mrpBand) * 0.2);
  v.set("weightBand", WEIGHTS.weightBand * Math.log1p(a.weightBand) * 0.2);
  return v;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [k, va] of a) {
    const vb = b.get(k);
    if (vb !== undefined) dot += va * vb;
  }
  let na = 0;
  for (const va of a.values()) na += va * va;
  let nb = 0;
  for (const vb of b.values()) nb += vb * vb;
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom > 0 ? dot / denom : 0;
}

function matchedAttributes(a: AttributeVector, b: AttributeVector): string[] {
  const out: string[] = [];
  if (a.category === b.category) out.push("category");
  if (a.fabric === b.fabric) out.push("fabric");
  if (a.colourFamily === b.colourFamily) out.push("colour");
  if (a.occasion === b.occasion) out.push("occasion");
  if (a.sleeveType === b.sleeveType) out.push("sleeve");
  if (Math.abs(a.mrpBand - b.mrpBand) <= 100) out.push("price band");
  if (Math.abs(a.weightBand - b.weightBand) <= 150) out.push("weight");
  return out;
}

/**
 * Top-k twins by cosine similarity. Deterministic: ties break on listing id, so
 * the same query always returns the same twins in the same order.
 */
export function findTwins(seed: AttributeVector, pool: Listing[], k = 40): Traced<Twin[]> {
  const q = encode(seed);

  const scored: Twin[] = pool
    .map((listing) => ({
      listing,
      similarity: cosine(q, encode(listing.attributes)),
      matched: matchedAttributes(seed, listing.attributes),
    }))
    .filter((t) => t.similarity > 0)
    .sort((a, b) =>
      b.similarity !== a.similarity
        ? b.similarity - a.similarity
        : a.listing.id.localeCompare(b.listing.id),
    )
    .slice(0, k);

  const avgSim = scored.length
    ? scored.reduce((acc, t) => acc + t.similarity, 0) / scored.length
    : 0;
  const medianPrice = (() => {
    if (!scored.length) return 0;
    const prices = scored.map((t) => t.listing.price).sort((a, b) => a - b);
    const mid = Math.floor(prices.length / 2);
    return prices.length % 2 ? (prices[mid] ?? 0) : ((prices[mid - 1] ?? 0) + (prices[mid] ?? 0)) / 2;
  })();

  return traced(scored, [
    step(
      "Listings we compared against",
      "जिनसे मिलान किया",
      `${pool.length} listings searched`,
      pool.length,
      "COUNT",
      "cluster_model",
    ),
    step(
      "Close matches found",
      "मिलते-जुलते सामान",
      `top ${scored.length} by similarity`,
      scored.length,
      "COUNT",
      "cluster_model",
      "Matched on category, fabric, price band, weight, colour and occasion",
    ),
    step(
      "How close the matches are",
      "कितना मिलता-जुलता",
      `average similarity`,
      avgSim,
      "RATIO",
      "derived",
      avgSim > 0.8
        ? "Very close matches — the price guidance is well grounded"
        : "Loose matches — treat the price guidance as a starting point",
    ),
    step(
      "What they sell for",
      "उनका दाम",
      `median of ${scored.length} listings`,
      medianPrice,
      "INR",
      "cluster_model",
    ),
  ]);
}
