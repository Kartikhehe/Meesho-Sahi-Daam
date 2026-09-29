/**
 * Design cluster generation.
 *
 * A cluster is a set of near-identical competing listings — the unit within
 * which price competition actually happens. 60 clusters across 7 categories,
 * each with 15-50 rival listings whose prices form the distribution that sets
 * the ceiling.
 */

import { ELASTICITY_BY_CATEGORY } from "@/engine/constants";
import { int, pick, rngFor, uniform, type Rng } from "@/engine/rng";
import type { AttributeVector, Category, CompetitorListing, DesignCluster } from "@/engine/types";

const CATEGORY_MIX: { category: Category; count: number; priceRange: [number, number] }[] = [
  { category: "kurti", count: 16, priceRange: [260, 520] },
  { category: "saree", count: 11, priceRange: [340, 900] },
  { category: "co-ord-set", count: 8, priceRange: [420, 780] },
  { category: "bedsheet", count: 9, priceRange: [280, 640] },
  { category: "kitchen-storage", count: 6, priceRange: [150, 420] },
  { category: "phone-cover", count: 5, priceRange: [110, 290] },
  { category: "jewellery-set", count: 5, priceRange: [180, 560] },
];

const FABRICS: Record<string, string[]> = {
  kurti: ["cotton", "rayon", "georgette", "crepe"],
  saree: ["georgette", "silk-blend", "cotton", "chiffon"],
  "co-ord-set": ["rayon", "cotton", "crepe"],
  bedsheet: ["cotton", "microfibre", "poly-cotton"],
  "kitchen-storage": ["plastic", "steel", "glass"],
  "phone-cover": ["silicone", "polycarbonate"],
  "jewellery-set": ["alloy", "brass", "oxidised"],
};

const COLOURS = ["red", "blue", "green", "black", "pink", "yellow", "white", "maroon"];
const OCCASIONS = ["daily", "festive", "office", "wedding", "casual"];
const SLEEVES = ["three-quarter", "full", "short", "sleeveless", "not-applicable"];

const DESIGN_WORDS: Record<string, string[]> = {
  kurti: ["Anarkali", "Straight", "A-Line", "Angrakha", "Flared"],
  saree: ["Banarasi", "Printed", "Embroidered", "Plain", "Border"],
  "co-ord-set": ["Printed", "Solid", "Striped", "Floral"],
  bedsheet: ["Double", "Single", "King", "Floral", "Geometric"],
  "kitchen-storage": ["Airtight", "Stackable", "Jar Set", "Container"],
  "phone-cover": ["Matte", "Transparent", "Printed", "Shockproof"],
  "jewellery-set": ["Kundan", "Oxidised", "Pearl", "Temple"],
};

const WEIGHT_BY_CATEGORY: Record<string, [number, number]> = {
  kurti: [280, 620],
  saree: [420, 950],
  "co-ord-set": [480, 880],
  bedsheet: [700, 1600],
  "kitchen-storage": [350, 1400],
  "phone-cover": [60, 160],
  "jewellery-set": [90, 320],
};

function bandOf(value: number, width: number): number {
  return Math.round(value / width) * width;
}

export function makeAttributes(rng: Rng, category: Category, mrp: number, grams: number): AttributeVector {
  return {
    category,
    fabric: pick(rng, FABRICS[category] ?? ["mixed"]) ?? "mixed",
    weightBand: bandOf(grams, 100),
    mrpBand: bandOf(mrp, 100),
    colourFamily: pick(rng, COLOURS) ?? "black",
    occasion: pick(rng, OCCASIONS) ?? "daily",
    sleeveType:
      category === "kurti" || category === "co-ord-set"
        ? (pick(rng, SLEEVES) ?? "three-quarter")
        : "not-applicable",
  };
}

export function generateClusters(seed: number): DesignCluster[] {
  const clusters: DesignCluster[] = [];
  let n = 0;

  for (const spec of CATEGORY_MIX) {
    for (let i = 0; i < spec.count; i++) {
      const rng = rngFor(seed, "cluster", spec.category, i);
      const [lo, hi] = spec.priceRange;
      const centre = uniform(rng, lo, hi);
      const [wLo, wHi] = WEIGHT_BY_CATEGORY[spec.category] ?? [300, 600];
      const grams = Math.round(uniform(rng, wLo, wHi));
      const word = pick(rng, DESIGN_WORDS[spec.category] ?? ["Classic"]) ?? "Classic";

      clusters.push({
        id: `cl-${String(++n).padStart(3, "0")}`,
        name: `${word} ${spec.category.replace(/-/g, " ")}`,
        category: spec.category,
        // Popular designs get more daily demand; the spread is wide because
        // most designs are quiet and a few carry the category.
        baseDailyDemand: Math.round(uniform(rng, 4, 46) * 10) / 10,
        elasticity: ELASTICITY_BY_CATEGORY[spec.category] ?? 3,
        attributes: makeAttributes(rng, spec.category, centre, grams),
      });
    }
  }
  return clusters;
}

/**
 * Rival listings for each cluster. Their prices form the distribution the
 * ceiling is read off, so the spread matters: too tight and every cluster has
 * a thin band, too loose and the ceiling stops meaning anything.
 */
export function generateCompetitors(seed: number, clusters: DesignCluster[]): CompetitorListing[] {
  const out: CompetitorListing[] = [];

  for (const cluster of clusters) {
    const rng = rngFor(seed, "competitors", cluster.id);
    const count = int(rng, 15, 50);
    const centre = cluster.attributes.mrpBand * uniform(rng, 0.55, 0.72);

    for (let i = 0; i < count; i++) {
      const crng = rngFor(seed, "competitor", cluster.id, i);
      const price = Math.max(20, Math.round(centre * uniform(crng, 0.78, 1.34)));
      out.push({
        id: `cmp-${cluster.id}-${String(i).padStart(2, "0")}`,
        clusterId: cluster.id,
        price,
        rating: Math.round(uniform(crng, 3.2, 4.7) * 10) / 10,
        orderShare: 0, // filled by rebalanceShares below
      });
    }
  }

  return rebalance(out, clusters);
}

/** Order share follows price through the same softmax the demand model uses. */
export function rebalance(competitors: CompetitorListing[], clusters: DesignCluster[]): CompetitorListing[] {
  const byCluster = new Map<string, CompetitorListing[]>();
  for (const c of competitors) {
    const list = byCluster.get(c.clusterId);
    if (list) list.push(c);
    else byCluster.set(c.clusterId, [c]);
  }

  const out: CompetitorListing[] = [];
  for (const [clusterId, list] of byCluster) {
    const elasticity = clusters.find((c) => c.id === clusterId)?.elasticity ?? 3;
    const utils = list.map((c) => Math.exp(-elasticity * Math.log(Math.max(c.price, 1))));
    const total = utils.reduce((a, b) => a + b, 0);
    list.forEach((c, i) => out.push({ ...c, orderShare: total > 0 ? (utils[i] ?? 0) / total : 0 }));
  }
  return out;
}
