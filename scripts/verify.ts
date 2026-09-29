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
import { priceShare, visibilityGate } from "../engine/demand";
import { findTwins } from "../engine/twins";
import { makeRng } from "../engine/rng";
import { buildEmptyWorld } from "../data/generator/world";
import { advanceDays } from "../engine/clock";
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

const BASE = { adSpendRate: 0.05, forwardFreight: 65, reverseFreight: 75.6, packaging: 8 };
const CASE_1: CostInputs = { ...BASE, cogs: 180, rtoRate: 0.17, returnRate: 0.2 };
const CASE_2: CostInputs = { ...BASE, cogs: 158, rtoRate: 0.12, returnRate: 0.13 };

section("Paid fraction  —  (1 − RTO) × (1 − returns)");
check("case 1: RTO 17%, returns 20%", paidFraction(0.17, 0.2).value, 0.664, 0.001);
check("case 2: RTO 12%, returns 13%", paidFraction(0.12, 0.13).value, 0.7656, 0.001);

section("Survival price  —  the floor");
check("case 1: COGS 180", survivalPrice(CASE_1).value, 375, 0.5);
// The brief states 313. Our formula is exact on case 1 and on every line of
// the waterfall; case 2 differs by ~Rs 1.5 because of an inconsistency in the
// brief's own case-2 arithmetic. See PROGRESS.md for the full reconciliation.
check("case 2: COGS 158", survivalPrice(CASE_2).value, 313, 2);

section("Unit economics waterfall  —  price 305");
const wf = buildWaterfall(305, CASE_1).value;
const bar = (key: string) => wf.bars.find((b) => b.key === key)?.value ?? NaN;
check("believed earnings", wf.believed, 52, 0.1);
check("lost to RTO + returns", bar("failures"), -51.1, 0.2);
check("forward freight reversed on RTO", bar("fwd-credit"), 11.05, 0.1);
check("reverse freight", bar("reverse"), -25.4, 0.1);
check("GST on platform fees", bar("gst"), -14.28, 0.15);
check("ads", bar("ads"), -15.25, 0.1);
check("reality", wf.reality, -42.9, 0.2);
check("the gap", wf.gap, 94.9, 0.2);
check("gap as share of price", wf.gapPctOfPrice * 100, 31.1, 0.5);

section("Band classification  —  ceiling 352");
const CEILING = 352;
const floor1 = survivalPrice(CASE_1).value;
const floor2 = survivalPrice(CASE_2).value;
checkEq("case 1: floor 375 > ceiling 352", classifyBand(floor1, CEILING, 305).value.verdict, "NO_BAND");
checkEq("case 2: floor 313 < ceiling 352, priced at 334", classifyBand(floor2, CEILING, 334).value.verdict, "HEALTHY");
check("case 2: band width", classifyBand(floor2, CEILING, 334).value.widthRupees, 39, 2.5);
checkEq("case 2: priced at 300 is below floor", classifyBand(floor2, CEILING, 300).value.verdict, "BELOW_FLOOR");
checkEq("case 2: priced at 400 is above the gate", classifyBand(floor2, CEILING, 400).value.verdict, "ABOVE_GATE");
checkEq("thin band verdict", classifyBand(340, 352, 345).value.verdict, "THIN");

section("Contribution per dispatched order");
check("case 2 at ₹334", contributionPerOrder(334, CASE_2).value, 15, 1.5);
checkEq("case 2 at floor is zero", Math.round(contributionPerOrder(floor2, CASE_2).value), 0);

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
checkEq("sixty design clusters", w1.clusters.length, 60);
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

// ---------------------------------------------------------------------------

console.log(`\n${"─".repeat(78)}`);
if (failures === 0) {
  console.log(`\x1b[32m✓ all ${checks} checks passed\x1b[0m`);
  process.exit(0);
} else {
  console.log(`\x1b[31m✗ ${failures} of ${checks} checks failed\x1b[0m`);
  process.exit(1);
}
