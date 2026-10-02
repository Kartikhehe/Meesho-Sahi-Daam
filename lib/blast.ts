/**
 * Blast radius for model settings: what a change would actually do to what
 * sellers are told, computed over every listing and design in the world.
 */

import { classifyBand } from "@/engine/band";
import { estimateCeiling } from "@/engine/ceiling";
import { costInputsFor } from "@/engine/clock";
import { survivalPrice } from "@/engine/cost";
import { envAt } from "@/engine/environment";
import { priorTables } from "@/engine/priors";
import { classifyRegime, type RegimeThresholds } from "@/engine/regime";
import { floorBand } from "@/engine/uncertainty";
import type { World } from "@/engine/types";

function floorsAndCeilings(world: World) {
  const ceilings = new Map<string, number>();
  const env = envAt(world, world.day);
  return world.listings.flatMap((l) => {
    const seller = world.sellers.find((s) => s.id === l.sellerId);
    if (!seller) return [];
    if (!ceilings.has(l.clusterId)) ceilings.set(l.clusterId, estimateCeiling(world.competitors.filter((c) => c.clusterId === l.clusterId)).value);
    const inputs = costInputsFor(l, seller, env);
    return [{ l, seller, inputs, floor: survivalPrice(inputs).value, ceiling: ceilings.get(l.clusterId) ?? 0 }];
  });
}

export function marginBlast(world: World, from: number, to: number) {
  let changed = 0;
  let newlyNoBand = 0;
  for (const r of floorsAndCeilings(world)) {
    const a = classifyBand(r.floor, r.ceiling, r.l.price, from).value;
    const b = classifyBand(r.floor, r.ceiling, r.l.price, to).value;
    if (a.launch !== b.launch) changed += 1;
    if (a.launch !== "DONT_LIST" && b.launch === "DONT_LIST") newlyNoBand += 1;
  }
  return { changed, newlyNoBand };
}

export function rangeBlast(world: World, k: number, confidence: number) {
  const t = priorTables(world);
  let shown = 0;
  let width = 0;
  const rows = floorsAndCeilings(world);
  for (const r of rows) {
    const n = t.returnsByListing.get(r.l.id)?.n ?? 0;
    if (n < k) shown += 1;
    width += floorBand(r.inputs, n, r.seller.codShare, confidence, k).value.halfWidth * 2;
  }
  return { shown, avgWidth: rows.length ? width / rows.length : 0 };
}

export function regimeBlast(world: World, from: RegimeThresholds, to: RegimeThresholds) {
  let changed = 0;
  for (const c of world.clusters) {
    const rivals = world.competitors.filter((x) => x.clusterId === c.id);
    if (classifyRegime(rivals, from).value !== classifyRegime(rivals, to).value) changed += 1;
  }
  return { changed, total: world.clusters.length };
}
