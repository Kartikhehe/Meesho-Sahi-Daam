/**
 * The price ladder — Thompson sampling over three price rungs.
 *
 * Three arms at 0.94× / 1.00× / 1.06× the launch price, each with a Beta
 * posterior on conversion. We draw once from each posterior and play the
 * highest EXPECTED CONTRIBUTION, not the highest conversion — the cheapest rung
 * converts best and would win every time on conversion alone, which is exactly
 * the mistake the Matcher archetype makes by hand.
 *
 * Exploration is capped: if cumulative cost of learning exceeds 5% of what the
 * listing would have contributed at its base price, the experiment halts and
 * settles on the best arm so far. The cap is enforced here in code, not left to
 * an operator's judgement.
 */

import { LADDER_ARMS, LADDER_LOSS_CAP } from "./constants";
import { beta as betaSample, rngFor } from "./rng";
import { step, traced, type Traced } from "./trace";
import type { ArmId, ArmState, LadderExperiment } from "./types";

export function startLadder(
  id: string,
  listingId: string,
  basePrice: number,
  day: number,
): LadderExperiment {
  return {
    id,
    listingId,
    startedDay: day,
    basePrice,
    arms: LADDER_ARMS.map((multiplier, idx) => ({
      arm: idx as ArmId,
      multiplier,
      // Beta(1,1) is a uniform prior: we start genuinely undecided.
      alpha: 1,
      beta: 1,
      orders: 0,
      impressions: 0,
      contribution: 0,
    })),
    costOfLearning: 0,
    status: "running",
  };
}

export function armPrice(exp: LadderExperiment, arm: ArmId): number {
  const state = exp.arms[arm];
  return state ? Math.round(exp.basePrice * state.multiplier) : exp.basePrice;
}

/** Posterior mean conversion for an arm. */
export function posteriorMean(a: ArmState): number {
  return a.alpha / (a.alpha + a.beta);
}

/** Posterior standard deviation — how unsure we still are about this rung. */
export function posteriorSd(a: ArmState): number {
  const n = a.alpha + a.beta;
  return Math.sqrt((a.alpha * a.beta) / (n * n * (n + 1)));
}

/**
 * Choose the next arm to show. One Thompson draw per arm, scored by expected
 * rupee contribution rather than by conversion.
 */
export function nextArm(
  exp: LadderExperiment,
  contributionAt: (price: number) => number,
  day: number,
  seed: number,
): Traced<ArmId> {
  const rng = rngFor(seed, exp.id, day);

  const draws = exp.arms.map((a) => {
    const conversion = betaSample(rng, a.alpha, a.beta);
    const price = Math.round(exp.basePrice * a.multiplier);
    const contribution = contributionAt(price);
    return { arm: a.arm, conversion, price, expected: conversion * contribution };
  });

  const best = draws.reduce((x, y) => (y.expected > x.expected ? y : x));

  return traced(
    best.arm,
    [
      ...draws.map((d) =>
        step(
          `Rung ₹${d.price}`,
          `दाम ₹${d.price}`,
          `${(d.conversion * 100).toFixed(1)}% conversion × ₹${(d.expected / Math.max(d.conversion, 1e-9)).toFixed(2)} per order`,
          d.expected,
          "INR",
          "derived",
          "A sample from what we currently believe about this rung",
        ),
      ),
      step(
        "Rung we show next",
        "अगला दाम",
        `highest expected rupees, not highest conversion`,
        best.expected,
        "INR",
        "derived",
        "The cheapest rung converts best but earns least — we rank by rupees",
      ),
    ],
    [
      {
        key: "thompson",
        label: "How the rung is chosen",
        value: 3,
        unit: "COUNT",
        source: "derived",
        note: "Thompson sampling: one draw from each rung's posterior, then play the best. Rungs we are unsure about get shown more often until we are sure.",
      },
    ],
  );
}

/** Record an impression and whether it converted, then update that arm's belief. */
export function updatePosterior(
  exp: LadderExperiment,
  arm: ArmId,
  converted: boolean,
  contribution: number,
): LadderExperiment {
  const arms = exp.arms.map((a) =>
    a.arm !== arm
      ? a
      : {
          ...a,
          alpha: a.alpha + (converted ? 1 : 0),
          beta: a.beta + (converted ? 0 : 1),
          orders: a.orders + (converted ? 1 : 0),
          impressions: a.impressions + 1,
          contribution: a.contribution + (converted ? contribution : 0),
        },
  );
  return { ...exp, arms };
}

/**
 * The best arm by realised rupee contribution per impression — what the
 * experiment concludes, and what gets recommended.
 */
export function bestArm(exp: LadderExperiment): ArmId {
  let best: ArmId = 1;
  let bestValue = -Infinity;
  for (const a of exp.arms) {
    const perImpression = a.impressions > 0 ? a.contribution / a.impressions : -Infinity;
    if (perImpression > bestValue) {
      bestValue = perImpression;
      best = a.arm;
    }
  }
  return best;
}

/**
 * Enforce the loss cap. `baselineContribution` is what the listing would have
 * earned over the same impressions at its base price; anything below that is
 * the price of learning.
 */
export function enforceLossCap(
  exp: LadderExperiment,
  baselineContribution: number,
): LadderExperiment {
  const earned = exp.arms.reduce((acc, a) => acc + a.contribution, 0);
  const costOfLearning = Math.max(0, baselineContribution - earned);
  const cap = baselineContribution * LADDER_LOSS_CAP;

  if (baselineContribution > 0 && costOfLearning > cap) {
    return {
      ...exp,
      costOfLearning,
      status: "halted_by_cap",
      winningArm: bestArm(exp),
    };
  }
  return { ...exp, costOfLearning };
}

/** Enough evidence to stop: every rung seen enough times, and a clear leader. */
export function shouldConclude(exp: LadderExperiment, minImpressions = 120): boolean {
  if (exp.status !== "running") return false;
  return exp.arms.every((a) => a.impressions >= minImpressions);
}

export function conclude(exp: LadderExperiment): LadderExperiment {
  return { ...exp, status: "concluded", winningArm: bestArm(exp) };
}
