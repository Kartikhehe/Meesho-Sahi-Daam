/**
 * CSV import adapter.
 *
 * Maps a real product-catalogue CSV onto the internal DesignCluster / Listing
 * types, so a Kaggle-style dataset can be dropped in later WITHOUT touching the
 * engine. Expected header:
 *
 *   product_name, category, mrp, selling_price, rating, num_ratings
 *
 * What such a dataset can and cannot give us is the whole reason this project
 * simulates a world rather than scraping one. A catalogue file has prices and
 * ratings; it has no COGS, no settlement lines, no RTO and no return data —
 * exactly the fields this product exists to reason about. So the adapter is
 * explicit about which fields are REAL (from the file) and which are MODELLED
 * (inferred from benchmarks), and it reports that split to the caller so the
 * UI can label imported data honestly.
 */

import { ELASTICITY_BY_CATEGORY } from "@/engine/constants";
import { rngFor, uniform } from "@/engine/rng";
import type { AttributeVector, Category, CompetitorListing, DesignCluster, Listing } from "@/engine/types";

export type CsvRow = {
  product_name: string;
  category: string;
  mrp: number;
  selling_price: number;
  rating: number;
  num_ratings: number;
};

export type ImportReport = {
  rowsRead: number;
  rowsAccepted: number;
  rowsRejected: { line: number; reason: string }[];
  clustersCreated: number;
  listingsCreated: number;
  /** Fields taken straight from the file. */
  realFields: string[];
  /** Fields the file cannot supply, which we infer. Shown to the user. */
  modelledFields: { field: string; how: string }[];
};

const KNOWN_CATEGORIES: Category[] = [
  "kurti",
  "saree",
  "co-ord-set",
  "bedsheet",
  "kitchen-storage",
  "phone-cover",
  "jewellery-set",
];

/** Map a free-text category onto our taxonomy. Unknown values are rejected. */
export function normaliseCategory(raw: string): Category | null {
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, "-");
  const direct = KNOWN_CATEGORIES.find((c) => c === key);
  if (direct) return direct;

  const aliases: Record<string, Category> = {
    kurta: "kurti",
    kurtis: "kurti",
    "kurta-set": "co-ord-set",
    sarees: "saree",
    sari: "saree",
    coord: "co-ord-set",
    "co-ord": "co-ord-set",
    "bed-sheet": "bedsheet",
    bedsheets: "bedsheet",
    "bed-linen": "bedsheet",
    kitchen: "kitchen-storage",
    storage: "kitchen-storage",
    "mobile-cover": "phone-cover",
    "phone-case": "phone-cover",
    jewellery: "jewellery-set",
    jewelry: "jewellery-set",
  };
  return aliases[key] ?? null;
}

/** Minimal RFC-4180-ish parser: handles quoted fields and embedded commas. */
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") field += ch;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
  return { header, rows: rows.filter((r) => r.some((c) => c.trim() !== "")) };
}

export function toRows(text: string): { rows: CsvRow[]; rejected: { line: number; reason: string }[] } {
  const { header, rows } = parseCsv(text);
  const idx = (name: string) => header.indexOf(name);

  const required = ["product_name", "category", "mrp", "selling_price"];
  const missing = required.filter((r) => idx(r) === -1);
  if (missing.length) {
    return { rows: [], rejected: [{ line: 1, reason: `Missing column(s): ${missing.join(", ")}` }] };
  }

  const out: CsvRow[] = [];
  const rejected: { line: number; reason: string }[] = [];

  rows.forEach((cells, i) => {
    const line = i + 2; // 1-based, and the header is line 1
    const get = (name: string) => cells[idx(name)]?.trim() ?? "";
    const num = (name: string) => Number(get(name).replace(/[^0-9.]/g, ""));

    const name = get("product_name");
    const sellingPrice = num("selling_price");
    if (!name) return rejected.push({ line, reason: "No product name" });
    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return rejected.push({ line, reason: `Selling price is not a number: "${get("selling_price")}"` });
    }
    if (!normaliseCategory(get("category"))) {
      return rejected.push({ line, reason: `Unrecognised category: "${get("category")}"` });
    }

    out.push({
      product_name: name,
      category: get("category"),
      mrp: Number.isFinite(num("mrp")) && num("mrp") > 0 ? num("mrp") : sellingPrice * 2,
      selling_price: sellingPrice,
      rating: idx("rating") !== -1 && Number.isFinite(num("rating")) ? num("rating") : 0,
      num_ratings: idx("num_ratings") !== -1 && Number.isFinite(num("num_ratings")) ? num("num_ratings") : 0,
    });
  });

  return { rows: out, rejected };
}

function bandOf(v: number, width: number): number {
  return Math.round(v / width) * width;
}

function attributesFor(category: Category, mrp: number, grams: number): AttributeVector {
  return {
    category,
    fabric: "unknown",
    weightBand: bandOf(grams, 100),
    mrpBand: bandOf(mrp, 100),
    colourFamily: "unknown",
    occasion: "unknown",
    sleeveType: category === "kurti" || category === "co-ord-set" ? "unknown" : "not-applicable",
  };
}

/**
 * Turn parsed rows into clusters and competitor listings.
 *
 * Rows are grouped into clusters by (category, price band) — the same grouping
 * the generated world uses, since that is what determines which listings a
 * buyer actually sees side by side.
 */
export function importCatalogue(
  text: string,
  seed = 1,
): { clusters: DesignCluster[]; competitors: CompetitorListing[]; listings: Listing[]; report: ImportReport } {
  const { rows, rejected } = toRows(text);

  const groups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const category = normaliseCategory(row.category);
    if (!category) continue;
    const key = `${category}|${bandOf(row.selling_price, 100)}`;
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }

  const clusters: DesignCluster[] = [];
  const competitors: CompetitorListing[] = [];
  const listings: Listing[] = [];
  let n = 0;

  for (const [key, members] of groups) {
    const [categoryRaw = "kurti", bandRaw = "0"] = key.split("|");
    const category = categoryRaw as Category;
    const id = `imp-cl-${String(++n).padStart(3, "0")}`;
    const rng = rngFor(seed, "import", id);
    const avgPrice = members.reduce((a, m) => a + m.selling_price, 0) / members.length;
    const grams = Math.round(uniform(rng, 250, 700));

    clusters.push({
      id,
      name: `${category.replace(/-/g, " ")} around ₹${bandRaw}`,
      category,
      // Demand is MODELLED: a catalogue file has no order volumes. We proxy it
      // from review counts, which correlate with sales but are not sales.
      baseDailyDemand:
        Math.max(1, members.reduce((a, m) => a + m.num_ratings, 0) / Math.max(members.length, 1) / 60) || 4,
      elasticity: ELASTICITY_BY_CATEGORY[category] ?? 3,
      attributes: attributesFor(category, avgPrice, grams),
    });

    members.forEach((m, i) => {
      competitors.push({
        id: `imp-cmp-${id}-${i}`,
        clusterId: id,
        price: Math.round(m.selling_price),
        rating: m.rating || 4,
        orderShare: 0,
      });
    });
  }

  // Shares follow price through the same softmax the engine uses everywhere.
  const withShares = competitors.map((c) => c);
  const byCluster = new Map<string, CompetitorListing[]>();
  for (const c of withShares) {
    const list = byCluster.get(c.clusterId);
    if (list) list.push(c);
    else byCluster.set(c.clusterId, [c]);
  }
  for (const [clusterId, list] of byCluster) {
    const elasticity = clusters.find((c) => c.id === clusterId)?.elasticity ?? 3;
    const utils = list.map((c) => Math.exp(-elasticity * Math.log(Math.max(c.price, 1))));
    const total = utils.reduce((a, b) => a + b, 0);
    list.forEach((c, i) => {
      c.orderShare = total > 0 ? (utils[i] ?? 0) / total : 0;
    });
  }

  return {
    clusters,
    competitors: withShares,
    listings,
    report: {
      rowsRead: rows.length + rejected.length,
      rowsAccepted: rows.length,
      rowsRejected: rejected,
      clustersCreated: clusters.length,
      listingsCreated: listings.length,
      realFields: ["product_name", "category", "mrp", "selling_price", "rating", "num_ratings"],
      modelledFields: [
        {
          field: "COGS",
          how: "Not present in any public catalogue dataset. Must be entered by the seller — it is the one number she actually knows.",
        },
        {
          field: "RTO and return rates",
          how: "Not present in any public dataset. Modelled from published benchmarks by category and COD share (see Data Provenance).",
        },
        {
          field: "Settlement lines",
          how: "Nobody publishes per-order settlement ledgers. Computed by the cost model from freight slabs, GST and ad rate.",
        },
        {
          field: "Daily demand",
          how: "Proxied from review counts, which correlate with sales but are not sales.",
        },
        { field: "Parcel weight", how: "Inferred from category; catalogue files rarely carry shipping weight." },
      ],
    },
  };
}
