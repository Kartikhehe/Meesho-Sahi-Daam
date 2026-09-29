"use client";

/**
 * S3 · Experiment tab — the price ladder.
 *
 * Three rungs, a Beta posterior per rung, and the cumulative cost of learning
 * against the 5% cap. The posteriors are drawn because a seller deciding
 * whether to trust a test deserves to see how sure the test actually is —
 * "we tried ₹349 eleven times" is a very different claim from "we tried it
 * four hundred times".
 */

import { useId } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LADDER_ARMS, LADDER_LOSS_CAP } from "@/engine/constants";
import { posteriorMean, posteriorSd, startLadder, armPrice } from "@/engine/bandit";
import type { ListingAnalysis } from "@/lib/selectors";
import type { LadderExperiment } from "@/engine/types";
import { inr, pct, count } from "@/lib/format";

export function ExperimentTab({
  analysis,
  experiment,
  onStart,
}: {
  analysis: ListingAnalysis;
  experiment?: LadderExperiment;
  onStart?: () => void;
}) {
  const { listing, band } = analysis;

  if (!experiment) {
    const preview = startLadder("preview", listing.id, listing.price, 0);
    const canRun = band.value.verdict !== "NO_BAND";

    return (
      <div className="space-y-4">
        <EmptyState
          title="No price test running"
          description={
            canRun
              ? "A price ladder shows the same listing at three prices and watches which one earns most — not which one sells most. It stops itself if learning costs more than 5% of what you would have earned."
              : "A price test cannot help here: there is no price that both covers your costs and gets this listing seen. Fix the cost first."
          }
          action={
            canRun && onStart ? (
              <Button variant="primary" onClick={onStart}>
                Start a price test
              </Button>
            ) : undefined
          }
        />

        {canRun ? (
          <Card className="p-4">
            <h3 className="text-[13px] font-semibold text-[var(--text)]">
              What it would test
            </h3>
            <ul className="mt-2 space-y-2">
              {LADDER_ARMS.map((m, i) => (
                <li
                  key={m}
                  className="flex items-center justify-between rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2"
                >
                  <span className="text-[13px] text-[var(--text-muted)]">
                    Rung {i + 1} · {(m * 100).toFixed(0)}% of today&rsquo;s price
                  </span>
                  <span className="tabular text-[13px] font-medium text-[var(--text)]">
                    {inr(armPrice(preview, i as 0 | 1 | 2))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
              We rank the rungs by rupees earned, not by how many sell. The cheapest rung almost
              always sells most — that is exactly the trap this test exists to avoid.
            </p>
          </Card>
        ) : null}
      </div>
    );
  }

  const totalImpressions = experiment.arms.reduce((a, x) => a + x.impressions, 0);
  const baseline = experiment.arms.reduce((a, x) => a + x.contribution, 0) + experiment.costOfLearning;
  const capRupees = baseline * LADDER_LOSS_CAP;
  const capUsed = capRupees > 0 ? Math.min(experiment.costOfLearning / capRupees, 1) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">The three rungs</h3>
          <span className="text-[12px] text-[var(--text-muted)]">
            {count(totalImpressions)} shows so far
          </span>
        </div>

        <ul className="mt-3 space-y-3">
          {experiment.arms.map((arm) => {
            const price = armPrice(experiment, arm.arm);
            const mean = posteriorMean(arm);
            const sd = posteriorSd(arm);
            const perShow = arm.impressions > 0 ? arm.contribution / arm.impressions : 0;
            const isWinner = experiment.winningArm === arm.arm;

            return (
              <li
                key={arm.arm}
                className={`rounded-[var(--radius-input)] border p-3 ${
                  isWinner
                    ? "border-[var(--success)] bg-[var(--success-bg)]"
                    : "border-[var(--border)]"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="tabular text-sm font-semibold text-[var(--text)]">
                    {inr(price)}
                    {isWinner ? (
                      <span className="ml-2 text-[11px] font-medium text-[var(--success)]">
                        earning most
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular text-[12px] text-[var(--text-muted)]">
                    {count(arm.orders)} of {count(arm.impressions)} shows sold
                  </span>
                </div>

                <Posterior mean={mean} sd={sd} />

                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
                  <span>
                    Sells {pct(mean)} of the time
                    {arm.impressions < 30 ? (
                      <span className="text-[var(--warning)]"> — still early</span>
                    ) : null}
                  </span>
                  <span className="tabular">
                    Earns {inr(perShow, 2)} per show
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="p-4">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">What learning has cost</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
          Testing means sometimes showing a price that earns less. We cap that at{" "}
          {pct(LADDER_LOSS_CAP, 0)} of what you would have earned anyway, and the test stops itself
          at the cap.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
          <div
            className={`h-full rounded-full ${capUsed > 0.85 ? "bg-[var(--danger)]" : "bg-[var(--warning)]"}`}
            style={{ width: `${Math.round(capUsed * 100)}%` }}
          />
        </div>
        <p className="tabular mt-1.5 text-[12px] text-[var(--text-muted)]">
          {inr(experiment.costOfLearning)} of {inr(capRupees)} used
          {experiment.status === "halted_by_cap" ? (
            <span className="text-[var(--danger)]"> — the test stopped here</span>
          ) : null}
        </p>
      </Card>
    </div>
  );
}

/** A Beta posterior, drawn so "how sure are we" is visible rather than asserted. */
function Posterior({ mean, sd }: { mean: number; sd: number }) {
  const id = useId();
  const w = 300;
  const h = 34;
  const lo = Math.max(0, mean - sd * 2);
  const hi = Math.min(1, mean + sd * 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full max-w-[300px]" role="img" aria-labelledby={id}>
      <title id={id}>
        Between {pct(lo)} and {pct(hi)} of shows sell, most likely {pct(mean)}
      </title>
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="var(--border)" strokeWidth="1" />
      <rect
        x={lo * w}
        y={h / 2 - 6}
        width={Math.max((hi - lo) * w, 2)}
        height="12"
        rx="6"
        fill="var(--info)"
        opacity="0.22"
      />
      <circle cx={mean * w} cy={h / 2} r="4" fill="var(--info)" />
    </svg>
  );
}
