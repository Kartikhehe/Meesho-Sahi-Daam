/**
 * Which lever moves the floor most — the second half of a DON'T LIST verdict.
 *
 * Each lever is tried at a move a seller could realistically make (the sizes
 * the deck's single-lever table uses: returns −7 points, cost of goods −12%,
 * cash-on-delivery share −25 points). The one that lowers the floor most is
 * named. If it closes the gap on its own, we say how far it has to move; if it
 * cannot, we say so rather than inventing an impossible target.
 */

import { survivalPrice, type CostInputs } from "@/engine/cost";
import { BAND_MARGIN } from "@/engine/constants";
import { rtoForCodShare } from "@/engine/uncertainty";
import { inr, pct } from "@/lib/format";

export type LeverAdvice = {
  key: "returns" | "cogs" | "cod";
  lever: string;
  leverHi: string;
  from: string;
  to: string;
  /** Floor after the realistic move. */
  floorAfter: number;
  /** Whether this lever alone opens a band. */
  closes: boolean;
  detail: string;
};

export function rankLevers(inputs: CostInputs, ceiling: number, codShare: number, margin = BAND_MARGIN): LeverAdvice[] {
  const target = ceiling / (1 + margin); // floor must sit below this for a band to open
  const floor = (o: Partial<CostInputs>) => survivalPrice({ ...inputs, ...o }).value;

  const retMin = Math.max(0.03, inputs.returnRate - 0.07);
  const cogsMin = inputs.cogs * 0.88;
  const codMin = Math.max(0.1, codShare - 0.25);

  const retNeed = solveDown(inputs.returnRate, retMin, (r) => floor({ returnRate: r }), target);
  const cogsNeed = solveDown(inputs.cogs, cogsMin, (c) => floor({ cogs: c }), target);
  const codNeed = solveDown(codShare, codMin, (c) => floor({ rtoRate: rtoForCodShare(c) }), target);

  const out: LeverAdvice[] = [
    {
      key: "returns",
      lever: "How often things come back",
      leverHi: "वापसी",
      from: pct(inputs.returnRate, 0),
      to: pct(retNeed ?? retMin, 0),
      floorAfter: floor({ returnRate: retMin }),
      closes: retNeed !== null,
      detail: retNeed !== null
        ? `Bringing returns down to ${pct(retNeed, 0)} opens a band on its own. A real size chart usually moves returns by 3 to 6 points.`
        : `Even at ${pct(retMin, 0)} returns the floor only falls to ${inr(floor({ returnRate: retMin }))} — the biggest single move, but not enough alone.`,
    },
    {
      key: "cogs",
      lever: "What your goods cost",
      leverHi: "माल की लागत",
      from: inr(inputs.cogs),
      to: inr(cogsNeed ?? cogsMin),
      floorAfter: floor({ cogs: cogsMin }),
      closes: cogsNeed !== null,
      detail: cogsNeed !== null
        ? `Buying ${inr(inputs.cogs - cogsNeed)} cheaper (${pct((inputs.cogs - cogsNeed) / inputs.cogs, 0)}) opens a band on its own.`
        : `12% off what you pay your supplier brings the floor to ${inr(floor({ cogs: cogsMin }))} — not enough alone.`,
    },
    {
      key: "cod",
      lever: "How many pay cash on delivery",
      leverHi: "कैश पर लेने वाले",
      from: pct(codShare, 0),
      to: pct(codNeed ?? codMin, 0),
      floorAfter: floor({ rtoRate: rtoForCodShare(codMin) }),
      closes: codNeed !== null,
      detail: codNeed !== null
        ? `Moving cash-on-delivery to ${pct(codNeed, 0)} of orders opens a band on its own. A small prepaid discount is the usual way.`
        : `Even ${pct(codMin, 0)} cash-on-delivery only brings the floor to ${inr(floor({ rtoRate: rtoForCodShare(codMin) }))}.`,
    },
  ];

  return out.sort((a, b) => a.floorAfter - b.floorAfter);
}

/** The smallest move from `start` toward `limit` that brings f below target, or null. */
function solveDown(start: number, limit: number, f: (x: number) => number, target: number): number | null {
  if (f(limit) > target) return null;
  if (f(start) <= target) return start;
  let hi = start; // f(hi) > target
  let lo = limit; // f(lo) <= target
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > target) hi = mid;
    else lo = mid;
  }
  return lo;
}
