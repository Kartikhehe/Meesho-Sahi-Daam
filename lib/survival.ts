/**
 * Listing survival: Kaplan–Meier over how long listings stay alive (until they
 * exit at S5), split by treated and control sellers, with a 95% confidence
 * band from Greenwood's formula. With six sellers the bands are wide — and
 * the screen says so rather than hiding them.
 */

import type { World } from "@/engine/types";

export type SurvivalPoint = { t: number; s: number; lo: number; hi: number; atRisk: number };

export function kaplanMeier(spells: { time: number; event: boolean }[], horizon: number): SurvivalPoint[] {
  const out: SurvivalPoint[] = [{ t: 0, s: 1, lo: 1, hi: 1, atRisk: spells.length }];
  let s = 1;
  let gw = 0; // Greenwood running sum
  const times = [...new Set(spells.filter((x) => x.event && x.time <= horizon).map((x) => x.time))].sort((a, b) => a - b);
  for (const t of times) {
    const atRisk = spells.filter((x) => x.time >= t).length;
    const deaths = spells.filter((x) => x.event && x.time === t).length;
    if (!atRisk) continue;
    s *= 1 - deaths / atRisk;
    if (atRisk > deaths) gw += deaths / (atRisk * (atRisk - deaths));
    const se = s * Math.sqrt(gw);
    out.push({ t, s, lo: Math.max(0, s - 1.96 * se), hi: Math.min(1, s + 1.96 * se), atRisk });
  }
  const last = out[out.length - 1];
  if (last && last.t < horizon) out.push({ ...last, t: horizon });
  return out;
}

export function listingSurvival(world: World, horizon = 180) {
  const treated = new Set(world.sellers.filter((s) => s.treatment === "treated").map((s) => s.id));
  const spells = world.listings
    .filter((l) => l.listedDay <= world.day)
    .map((l) => ({
      treated: treated.has(l.sellerId),
      time: (l.exitedDay ?? world.day) - l.listedDay,
      event: l.exitedDay !== undefined,
    }));
  return {
    treated: kaplanMeier(spells.filter((x) => x.treated), horizon),
    control: kaplanMeier(spells.filter((x) => !x.treated), horizon),
    nTreated: spells.filter((x) => x.treated).length,
    nControl: spells.filter((x) => !x.treated).length,
  };
}
