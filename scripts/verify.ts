/**
 * The Phase 2 gate.
 *
 * Reproduces every reference number from the brief, in a plain Node process
 * with no browser and no React. Exits non-zero on any mismatch, so this is a
 * genuine gate rather than a report.
 *
 *   npx tsx scripts/verify.ts
 */

import { classifyBand, recommendedPrice } from "../engine/band";
import { estimateCeiling } from "../engine/ceiling";
import { contributionPerOrder, paidFraction, survivalPrice, type CostInputs } from "../engine/cost";
import { buildWaterfall } from "../engine/waterfall";
import { monthlyContribution, profitMaxPrice } from "../engine/launch";
import { floorBand, probFloorAbove, rtoForCodShare } from "../engine/uncertainty";
import { resolveNewListingMarket } from "../lib/new-listing-market";
import { proposedMoves } from "../lib/trust";
import { listingSurvival } from "../lib/survival";
import { marginBlast } from "../lib/blast";
import { analyseSeller } from "../lib/selectors";
import { estimateReturns, estimateRto } from "../engine/priors";
import { REFERENCE_AFTER, REFERENCE_BEFORE, REFERENCE_CEILING, REFERENCE_DEMAND } from "../engine/reference";
import { priceShare, visibilityGate } from "../engine/demand";
import { findTwins } from "../engine/twins";
import { makeRng } from "../engine/rng";
import { buildEmptyWorld } from "../data/generator/world";
import { advanceDays } from "../engine/clock";
import { hydrateWorld, serialiseWorld, RETAINED_HISTORY_DAYS } from "../data/generator/serialise";
import { importCatalogue } from "../data/import/csv-adapter";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompetitorListing } from "../engine/types";

let failures = 0;
let checks = 0;

function check(label: string, actual: number, expected: number, tolerance = 0.05) {
  checks++;
  const ok = Math.abs(actual - expected) <= tolerance;
  if (!ok) failures++;
  const status = ok ? "  ok  " : " FAIL ";
  console.log(
    `[${status}] ${label.padEnd(52)} ${actual.toFixed(2).padStart(10)}   expected ${expected.toFixed(2)}${ok ? "" : `  (off by ${(actual - expected).toFixed(2)})`}`,
  );
}

function checkEq<T>(label: string, actual: T, expected: T) {
  checks++;
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(
    `[${ok ? "  ok  " : " FAIL "}] ${label.padEnd(52)} ${String(actual).padStart(10)}   expected ${String(expected)}`,
  );
}

function section(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Golden numbers — the Round-2 deck, to the rupee.
// ---------------------------------------------------------------------------

const B = REFERENCE_BEFORE;
const A = REFERENCE_AFTER;
const CEILING = REFERENCE_CEILING;
const at = (o: Partial<CostInputs>) => survivalPrice({ ...B, ...o }).value;
const perMonth = (price: number, i: CostInputs) => monthlyContribution(price, i, REFERENCE_DEMAND);

section("Golden · paid fraction and the floor");
check("k = (1 − RTO)(1 − returns)", paidFraction(B.rtoRate, B.returnRate).value, 0.664, 0.0005);
check("floor, before unlocks", survivalPrice(B).value, 374.98, 0.01);
check("floor, after unlocks (COGS 158, returns 13%, COD 55%)", survivalPrice(A).value, 312.8, 0.05);

section("Golden · contribution per dispatched parcel");
check("Π(305), before", contributionPerOrder(305, B).value, -42.34, 0.01);
check("Π(334), after", contributionPerOrder(334, A).value, 14.75, 0.01);
check("Π(299), before — Imran's ₹46 an order", contributionPerOrder(299, B).value, -45.97, 0.01);

section("Golden · six ways to price it (₹ / month)");
check("₹449 — dies unseen", perMonth(449, B), 0, 10);
check("₹299 — the matcher", perMonth(299, B), -47517, 1);
check("₹305", perMonth(305, B), -39164, 1);
check("₹329 — at the winning price", perMonth(329, B), -12350, 1);
check("₹405", perMonth(405, B), 0, 50);
check("₹334, after unlocks", perMonth(334, A), 5190, 1);
check("profit-maximising price after unlocks", profitMaxPrice(A, REFERENCE_DEMAND, 300, 360).value, 333, 1);

section("Golden · single-lever unlocks against ₹375");
check("returns 20% → 13%", Math.round(at({ returnRate: 0.13 })), 342, 0);
check("COGS 180 → 158", Math.round(at({ cogs: 158 })), 349, 0);
check("COD 80% → 55%", Math.round(at({ rtoRate: rtoForCodShare(0.55) })), 371, 0);
check("ads off", Math.round(at({ adSpendRate: 0 })), 342, 0);
check("all three", Math.round(survivalPrice(A).value), 313, 0);

section("Golden · cost ladder and sensitivity row (returns 20%)");
for (const [cogs, want] of [[160, 351], [180, 375], [200, 399]] as const) check(`COGS ${cogs}`, Math.round(at({ cogs })), want, 0);
const row = [210, 195, 180, 165, 150, 135].map((cogs) => Math.round(at({ cogs })));
checkEq("row 20%: 411 393 375 357 339 321", row.join(" "), "411 393 375 357 339 321");

section("Golden · day-zero band on the floor (80%)");
for (const [n, want] of [[0, 28], [30, 20], [90, 14], [270, 9]] as const) {
  check(`±₹ at ${n} own orders`, floorBand(B, n, 0.8).value.halfWidth, want, 0.6);
}
check("P(floor > ₹352) on day zero", probFloorAbove(floorBand(B, 0, 0.8).value, CEILING), 0.85, 0.01);

section("Golden · the waterfall at ₹305 reconciles to Π(305)");
const wf = buildWaterfall(305, B).value;
check("believed earnings", wf.believed, 52, 0.001);
check("reality equals Π(305)", wf.reality, contributionPerOrder(305, B).value, 0.001);
check("the gap", wf.gap, 94.34, 0.01);

section("Band classification — ceiling 352");
const floor1 = survivalPrice(B).value;
const floor2 = survivalPrice(A).value;
checkEq("before: floor 375 > ceiling 352", classifyBand(floor1, CEILING, 305).value.verdict, "NO_BAND");
checkEq("after: priced at 334 is inside the band", classifyBand(floor2, CEILING, 334).value.verdict, "HEALTHY");
checkEq("after: priced at 300 is below floor", classifyBand(floor2, CEILING, 300).value.verdict, "BELOW_FLOOR");
checkEq("after: priced at 400 is above the gate", classifyBand(floor2, CEILING, 400).value.verdict, "ABOVE_GATE");
checkEq("thin band verdict", classifyBand(340, 352, 345).value.verdict, "THIN");
checkEq("contribution at the floor is zero", Math.round(contributionPerOrder(floor2, A).value), 0);

section("Band rule — [floor × (1 + m), ceiling], m = 3%");
const bandAfter = classifyBand(survivalPrice(A).value, CEILING, 334).value;
check("band low after unlocks", bandAfter.bandLow, 322.2, 0.5);
check("band high (ceiling)", bandAfter.widthRupees + bandAfter.bandLow, 352, 0.01);
checkEq("after unlocks: launch verdict", bandAfter.launch, "PROFIT_MAX");
const launchP = profitMaxPrice(A, REFERENCE_DEMAND, bandAfter.bandLow, CEILING).value;
checkEq("launch at ₹333–334", launchP >= 333 && launchP <= 334, true);
checkEq("before unlocks: DON'T LIST", classifyBand(survivalPrice(B).value, CEILING, 305).value.launch, "DONT_LIST");
checkEq("0–5% band → DIFFERENTIATE", classifyBand(330, 352, 340).value.launch, "DIFFERENTIATE");
checkEq(">15% band → PRICE FOR MARGIN", classifyBand(250, 352, 300).value.launch, "PRICE_FOR_MARGIN");

section("Ceiling estimation");
const rivals: CompetitorListing[] = [
  { id: "a", clusterId: "c", price: 329, rating: 4.2, orderShare: 0.42 },
  { id: "b", clusterId: "c", price: 339, rating: 4.0, orderShare: 0.2 },
  { id: "c", clusterId: "c", price: 349, rating: 3.9, orderShare: 0.14 },
  { id: "d", clusterId: "c", price: 359, rating: 4.1, orderShare: 0.12 },
  { id: "e", clusterId: "c", price: 379, rating: 3.8, orderShare: 0.07 },
  { id: "f", clusterId: "c", price: 399, rating: 3.6, orderShare: 0.05 },
];
check("winning price 329 → ceiling ≈ 352", estimateCeiling(rivals).value, 352, 8);

section("Visibility gate  —  the cliff above the ceiling");
check("at the ceiling, half of impressions", visibilityGate(352, 352), 0.5, 0.001);
const below = visibilityGate(320, 352);
const above = visibilityGate(390, 352);
checkEq("well below ceiling keeps most impressions", below > 0.9, true);
checkEq("well above ceiling loses nearly all", above < 0.08, true);

section("Price share  —  softmax rewards the cheapest");
const shareCheap = priceShare(320, rivals, 3.4);
const shareDear = priceShare(390, rivals, 3.4);
checkEq("cheaper listing takes a larger share", shareCheap > shareDear, true);

section("Recommended price sits inside the band");
const rec = recommendedPrice(floor2, CEILING);
checkEq("recommendation is above the floor", rec > floor2, true);
checkEq("recommendation is below the ceiling", rec < CEILING, true);

section("New listing — no twins falls back to a category prior");
{
  const w0 = buildEmptyWorld(230540);
  const seller = w0.sellers[0]!;
  const dup = resolveNewListingMarket(w0, { seller, category: "dupatta", cogs: 140, grams: 300 });
  checkEq("zari dupatta has no twins → CATEGORY_PRIOR", dup.route, "CATEGORY_PRIOR");
  checkEq("its ceiling is shown as a ±10% range", !!dup.ceilingRange && Math.abs(dup.ceilingRange.high / dup.ceiling.value - 1.1) < 1e-9, true);
  const kur = resolveNewListingMarket(w0, { seller, category: "kurti", cogs: 100, grams: 450 });
  checkEq("a kurti finds twins → TWINS", kur.route, "TWINS");
  checkEq("day-zero floor is a range", kur.range.value.high > kur.range.value.low, true);
}

section("Fallback ladder and credibility blending");
{
  const w1 = advanceDays(buildEmptyWorld(230540), 60).world;
  const farida = w1.sellers.find((x) => x.id === "slr-farida")!;
  const fr = estimateRto(w1, farida.id, 0.8);
  checkEq("day-zero seller: n = 0, prior used as-is", fr.n === 0 && fr.value === fr.prior, true);
  check("buyer-side RTO prior at 80% COD ≈ 17%", fr.value, 0.17, 0.02);
  checkEq("basis names the prior and its n", fr.basis.startsWith("MEESHO · prior"), true);
  const l = w1.listings.find((x) => x.sellerId === "slr-imran")!;
  const r = estimateReturns(w1, l);
  const expect = r.own === null ? r.prior : (r.n * r.own + 30 * r.prior) / (r.n + 30);
  check("returns = (n·own + 30·prior) ÷ (n + 30)", r.value, expect, 1e-12);
  checkEq("prior level comes from the fallback ladder", ["design cluster", "category", "platform"].includes(r.priorLevel), true);
}

section("Trust ladder, survival, blast radius");
{
  const w2 = advanceDays(buildEmptyWorld(230540, 0, 120), 120).world;
  const moves = proposedMoves(analyseSeller(w2, "slr-imran"));
  const bandOf = (id: string) => analyseSeller(w2, "slr-imran").find((a) => a.listing.id === id)!.band.value;
  checkEq("Auto-Pilot never moves outside [floor·(1+m), ceiling]", moves.every((m) => { const b = bandOf(m.listingId); return m.to >= b.bandLow && m.to <= b.ceiling; }), true);
  const km = listingSurvival(w2, 120).treated;
  checkEq("survival starts at 100% and never rises", km[0]?.s === 1 && km.every((p, i) => i === 0 || p.s <= (km[i - 1]?.s ?? 1) + 1e-12), true);
  checkEq("a no-op margin change has zero blast radius", marginBlast(w2, 0.03, 0.03).changed, 0);
}

section("Determinism  —  same seed, same world");
const r1 = makeRng(230540);
const r2 = makeRng(230540);
const seq1 = [r1(), r1(), r1()].join(",");
const seq2 = [r2(), r2(), r2()].join(",");
checkEq("rng is reproducible", seq1 === seq2, true);

const w1 = buildEmptyWorld(230540);
const w2 = buildEmptyWorld(230540);
checkEq("same seed → same listing count", w1.listings.length, w2.listings.length);
checkEq(
  "same seed → identical prices",
  w1.listings.map((l) => l.price).join(",") === w2.listings.map((l) => l.price).join(","),
  true,
);

section("World shape");
checkEq("six sellers", w1.sellers.length, 6);
checkEq("sixty design clusters plus the deck's reference market", w1.clusters.length, 61);
checkEq("competitors generated", w1.competitors.length > 1500, true);
checkEq("listings generated", w1.listings.length > 300, true);

section("Twin retrieval  —  deterministic cosine similarity");
const seedAttrs = w1.listings[0]?.attributes;
if (seedAttrs) {
  const t1 = findTwins(seedAttrs, w1.listings, 40);
  const t2 = findTwins(seedAttrs, w1.listings, 40);
  checkEq("same query → same twins", t1.value.map((t) => t.listing.id).join(",") === t2.value.map((t) => t.listing.id).join(","), true);
  checkEq("similarity is ordered", t1.value.every((t, i) => i === 0 || (t1.value[i - 1]?.similarity ?? 1) >= t.similarity), true);
}

section("Clock  —  advancing produces orders and settlements");
const advanced = advanceDays(buildEmptyWorld(230540), 14);
checkEq("orders were created", advanced.ordersCreated > 0, true);
checkEq("a settlement exists per order", advanced.world.settlements.length, advanced.world.orders.length);
const firstSettlement = advanced.world.settlements[0];
checkEq(
  "settlement credited 15 days after dispatch",
  firstSettlement ? firstSettlement.creditedDay - firstSettlement.dispatchedDay : -1,
  15,
);
checkEq("clock advanced 14 days", advanced.world.day, 14);

const rerun = advanceDays(buildEmptyWorld(230540), 14);
checkEq("clock is reproducible from the seed", rerun.world.orders.length, advanced.world.orders.length);

section("Storage round-trip  —  a stored world rebuilds exactly");
// serialiseWorld drops settlement lines and alert traces, because both are pure
// functions of their inputs. This proves hydrateWorld puts back exactly what
// the clock produced, so the saving costs no fidelity.
const before = advanceDays(buildEmptyWorld(230540), 21).world;
const stored = serialiseWorld(before);
const after = hydrateWorld(JSON.parse(JSON.stringify(stored)) as typeof stored);

checkEq("stored world carries no settlement lines", stored.settlements.length, 0);
checkEq("rehydrated settlement count matches", after.settlements.length, after.orders.length);

const retained = before.settlements.filter((s) => s.dispatchedDay > before.day - RETAINED_HISTORY_DAYS);
const sumNet = (rows: { netCredit: number }[]) => rows.reduce((a, r) => a + r.netCredit, 0);
check("rehydrated net credit matches the original", sumNet(after.settlements), sumNet(retained), 0.01);
checkEq(
  "every rehydrated line is identical to the original",
  JSON.stringify(after.settlements) === JSON.stringify(retained),
  true,
);
checkEq("daily rollups cover the whole history", (stored.daily?.length ?? 0) > 0, true);
checkEq("alert traces are not persisted", stored.alerts.every((a) => a.trace === undefined), true);

section("CSV import adapter  —  real catalogue data maps onto engine types");
const csv = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../data/import/sample-catalogue.csv"), "utf8");
const imported = importCatalogue(csv);
checkEq("rows accepted", imported.report.rowsAccepted, 33);
checkEq("no rows rejected", imported.report.rowsRejected.length, 0);
checkEq("clusters created", imported.report.clustersCreated > 0, true);
checkEq("competitors created", imported.competitors.length, 33);
checkEq(
  "order shares sum to 1 per cluster",
  imported.clusters.every((c) => {
    const share = imported.competitors
      .filter((x) => x.clusterId === c.id)
      .reduce((a, x) => a + x.orderShare, 0);
    return Math.abs(share - 1) < 1e-6;
  }),
  true,
);
checkEq(
  "the adapter names what a catalogue file cannot supply",
  imported.report.modelledFields.some((f) => f.field === "COGS"),
  true,
);
// A ceiling computed from imported rows must be usable by the engine unchanged.
const importedCluster = imported.clusters[0];
if (importedCluster) {
  const importedRivals = imported.competitors.filter((c) => c.clusterId === importedCluster.id);
  checkEq("ceiling is computable from imported rows", estimateCeiling(importedRivals).value > 0, true);
}

// ---------------------------------------------------------------------------

console.log(`\n${"─".repeat(78)}`);
if (failures === 0) {
  console.log(`\x1b[32m✓ all ${checks} checks passed\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${failures} of ${checks} checks failed\x1b[0m`);
  process.exit(1);
}
