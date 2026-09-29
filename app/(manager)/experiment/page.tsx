"use client";

/**
 * M4 · Experiment readout.
 *
 * Treated against control, with confidence intervals shown honestly. The
 * cohort here is six sellers, which is nowhere near enough to call anything —
 * so this screen's main job is to say "not yet significant" clearly instead of
 * dressing a noisy difference up as a result. That restraint is the point:
 * a readout that always shows a win is a readout nobody should trust.
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { useWorld } from "@/lib/use-seller";
import { cohortHealth, type SellerHealth } from "@/lib/cohort";
import { BUYER_PRICE_INDEX_GATE } from "@/engine/constants";
import { inr, count, pct } from "@/lib/format";

type ArmStats = {
  n: number;
  mean: number;
  sd: number;
  /** 95% interval on the mean. Wide intervals are the honest signal here. */
  ci: [number, number];
};

function stats(values: number[]): ArmStats {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, sd: 0, ci: [0, 0] };
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const sd = Math.sqrt(variance);
  const se = n > 0 ? sd / Math.sqrt(n) : 0;
  return { n, mean, sd, ci: [mean - 1.96 * se, mean + 1.96 * se] };
}

/** Intervals that overlap mean we cannot distinguish the arms. */
function overlaps(a: ArmStats, b: ArmStats): boolean {
  return a.ci[0] <= b.ci[1] && b.ci[0] <= a.ci[1];
}

function Metric({
  title,
  unit,
  treated,
  control,
  format,
  higherIsBetter = true,
}: {
  title: string;
  unit: string;
  treated: ArmStats;
  control: ArmStats;
  format: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const inconclusive = overlaps(treated, control) || treated.n < 20 || control.n < 20;
  const diff = treated.mean - control.mean;
  const better = higherIsBetter ? diff > 0 : diff < 0;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">{title}</h3>
        {inconclusive ? (
          <StatusChip tone="neutral" title="The groups cannot be told apart at this sample size">
            Not yet significant
          </StatusChip>
        ) : (
          <StatusChip tone={better ? "success" : "danger"}>
            {better ? "Treated ahead" : "Control ahead"}
          </StatusChip>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-4">
        {[
          { label: "Treated", s: treated },
          { label: "Control", s: control },
        ].map(({ label, s }) => (
          <div key={label}>
            <dt className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
              {label} · n={s.n}
            </dt>
            <dd className="tabular mt-0.5 text-lg font-semibold text-[var(--text)]">
              {format(s.mean)}
            </dd>
            <dd className="tabular mt-0.5 text-[11px] text-[var(--text-subtle)]">
              95% CI {format(s.ci[0])} to {format(s.ci[1])}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 border-t border-[var(--border)] pt-2.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
        {inconclusive
          ? `The confidence intervals overlap, so we cannot say these groups differ on ${unit}. With ${count(treated.n + control.n)} sellers this is what we would expect — the honest read is "no conclusion yet", not "no effect".`
          : `Treated sellers differ by ${format(Math.abs(diff))} on ${unit}.`}
      </p>
    </Card>
  );
}

export default function ExperimentPage() {
  const { world, status, error } = useWorld();
  const health = useMemo(() => (world ? cohortHealth(world) : []), [world]);

  const treated = health.filter((h) => h.seller.treatment === "treated");
  const control = health.filter((h) => h.seller.treatment === "control");

  const pick = (arm: SellerHealth[], f: (h: SellerHealth) => number) => stats(arm.map(f));

  /**
   * Buyer Price Index: what buyers pay in the treated group relative to the
   * control, indexed to 100. The guardrail exists because a tool that raises
   * seller margins by raising consumer prices is not a tool anyone should ship.
   */
  const treatedAvgPrice =
    treated.length && world
      ? world.listings.filter((l) => treated.some((t) => t.seller.id === l.sellerId)).reduce((a, l, _, arr) => a + l.price / arr.length, 0)
      : 0;
  const controlAvgPrice =
    control.length && world
      ? world.listings.filter((l) => control.some((c) => c.seller.id === l.sellerId)).reduce((a, l, _, arr) => a + l.price / arr.length, 0)
      : 0;
  const bpi = controlAvgPrice > 0 ? (treatedAvgPrice / controlAvgPrice) * 100 : 100;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">
      <header className="mb-4">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          M4
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Experiment readout</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Sellers who see the tool, against those who do not
        </p>
      </header>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        <Card className="mb-4 border-l-[3px] border-l-[var(--warning)] p-4">
          <h2 className="text-[13px] font-semibold text-[var(--text)]">
            This pilot is far too small to conclude anything
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
            {count(treated.length)} treated sellers against {count(control.length)} control. Every
            interval below is wide enough to contain zero, which is exactly what should happen at
            this size. We show it anyway, because a readout that only appears once it says something
            flattering is not a readout.
          </p>
        </Card>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Buyer Price Index"
            tone={bpi > BUYER_PRICE_INDEX_GATE ? "danger" : "success"}
            value={
              <span
                className={`tabular text-[28px] font-semibold ${bpi > BUYER_PRICE_INDEX_GATE ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
              >
                {bpi.toFixed(1)}
              </span>
            }
            caption={`What buyers pay in the treated group, indexed to the control at 100. The gate is ${BUYER_PRICE_INDEX_GATE} — above it, upward nudges pause automatically.`}
          />
          <MetricCard
            label="Sellers still trading"
            value={
              <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                {count(health.filter((h) => h.ordersLast30 > 0).length)}
                <span className="text-base font-normal text-[var(--text-subtle)]">
                  {" "}
                  / {count(health.length)}
                </span>
              </span>
            }
            caption="Took at least one order in the last 30 days"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric
            title="Listings below their own floor"
            unit="floor breaches"
            treated={pick(treated, (h) => h.belowFloorShare)}
            control={pick(control, (h) => h.belowFloorShare)}
            format={(v) => pct(v, 0)}
            higherIsBetter={false}
          />
          <Metric
            title="Monthly contribution per seller"
            unit="contribution"
            treated={pick(treated, (h) => h.monthlyContribution)}
            control={pick(control, (h) => h.monthlyContribution)}
            format={(v) => inr(v)}
          />
          <Metric
            title="Orders per seller, 30 days"
            unit="order volume"
            treated={pick(treated, (h) => h.ordersLast30)}
            control={pick(control, (h) => h.ordersLast30)}
            format={(v) => count(v)}
          />
          <Metric
            title="Average Daam Score"
            unit="pricing health"
            treated={pick(treated, (h) => h.averageScore)}
            control={pick(control, (h) => h.averageScore)}
            format={(v) => v.toFixed(0)}
          />
        </div>

        <Card className="mt-4 p-4">
          <h2 className="text-[13px] font-semibold text-[var(--text)]">
            What would make this readable
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
            To detect a 10-point shift in the share of listings below floor, with this much
            seller-to-seller variance, this experiment needs a few hundred sellers per arm and a
            90-day window. Until then the right decision is to keep running it, not to read the
            direction of a noisy difference.
          </p>
        </Card>
      </StateGate>
    </div>
  );
}
