/**
 * Generate the world and write it to /data/world.json.
 *
 *   npx tsx scripts/generate-world.ts [--days 548] [--seed 230540]
 *
 * The file is committed so the app boots instantly with history already in
 * place. Admin → Simulation Control can regenerate it in the browser at any
 * time, and `Reset to day 0` always works, because everything here is
 * reproducible from the seed alone.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WORLD_SEED } from "../engine/constants";
import { generateWorld, worldSummary } from "../data/generator/world";
import { serialiseWorld } from "../data/generator/serialise";

const here = dirname(fileURLToPath(import.meta.url));

function arg(flag: string, fallback: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return fallback;
  const raw = process.argv[i + 1];
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

const seed = arg("--seed", WORLD_SEED);
const days = arg("--days", 548);

console.log(`Generating world  seed=${seed}  history=${days} days`);
const started = Date.now();

const world = generateWorld({
  seed,
  historyDays: days,
  onProgress: (done, total, label) => {
    const pct = Math.round((done / total) * 100);
    process.stdout.write(`\r  ${label}  ${String(pct).padStart(3)}%  (day ${done}/${total})`);
  },
});

process.stdout.write("\n");

const summary = worldSummary(world);
console.log("\nWorld summary");
for (const [key, value] of Object.entries(summary)) {
  const shown = typeof value === "number" && !Number.isInteger(value) ? value.toFixed(4) : value;
  console.log(`  ${key.padEnd(14)} ${shown}`);
}

const outDir = resolve(here, "../data");
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, "world.json");
const stored = serialiseWorld(world);
const payload = JSON.stringify(stored);
writeFileSync(outFile, payload);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
const fullMb = Buffer.byteLength(JSON.stringify(world)) / 1_048_576;
const mb = Buffer.byteLength(payload) / 1_048_576;
console.log(
  `\nWrote ${outFile}  (${mb.toFixed(1)} MB, down from ${fullMb.toFixed(1)} MB, ${seconds}s)`,
);
console.log(
  `  trimmed to ${stored.orders.length} orders / ${stored.alerts.length} alerts; traces recomputed on open`,
);
