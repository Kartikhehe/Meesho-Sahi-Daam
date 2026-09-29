"use client";

/**
 * M1 · Cohort health.
 *
 * Aggregates only. The individual numbers a manager can act on are "how many
 * listings are below their own floor" and "how much NMV is at risk" — not any
 * one seller's cost model, which requires a deliberate, audited drill-in.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { Skeleton, StateGate, EmptyState } from "@/components/shared/empty-state";
import { ChartFrame } from "@/components/charts/chart-frame";
import { useWorld } from "@/lib/use-seller";
import { bandDistribution, cohortHealth, summariseCohort } from "@/lib/cohort";
import { inr, inrCompact, count, pct } from "@/lib/format";

const BAND_COLOUR: Record<string, string> = {
  BELOW_FLOOR: "var(--danger)",
  NO_BAND: "var(--danger)",
  THIN: "var(--warning)",
  HEALTHY: "var(--success)",
  ABOVE_GATE: "var(--neutral-data)",
};

export default function CohortPage() {
  const { world, status, error } = useWorld();

  const health = useMemo(() => (world ? cohortHealth(world) : []), [world]);
  const summary = useMemo(() => summariseCohort(health), [health]);
  const distribution = useMemo(() => (world ? bandDistribution(world) : []), [world]);

  const maxBand = Math.max(...distribution.map((d) => d.count), 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
      <header className="mb-5">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          M1
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Cohort health</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          How the sellers in your category are actually doing — and how much of it is a pricing
          problem you can fix
        </p>
      </header>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {health.length === 0 ? (
          <EmptyState
            title="No sellers in this cohort yet"
            description="Once sellers are onboarded into your category, their health appears here."
          />
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Sellers covered"
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                    {count(summary.sellers)}
                  </span>
                }
                caption={`${count(summary.treatedCount)} treated, ${count(summary.controlCount)} control`}
              />
              <MetricCard
                label="Listings below their own floor"
                tone={summary.belowFloorShare > 0.3 ? "danger" : "warning"}
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--danger)]">
                    {pct(summary.belowFloorShare, 0)}
                  </span>
                }
                caption={`${count(summary.listingsBelowFloor)} of ${count(summary.listings)} listings lose money on every parcel`}
              />
              <MetricCard
                label="NMV at risk"
                tone="danger"
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--danger)]">
                    {inrCompact(summary.nmvAtRisk)}
                  </span>
                }
                caption="a month, bleeding from listings priced under their cost to serve"
              />
              <MetricCard
                label="Sellers losing money"
                tone="danger"
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                    {count(summary.sellersAtRisk)}
                    <span className="text-base font-normal text-[var(--text-subtle)]">
                      {" "}
                      / {count(summary.sellers)}
                    </span>
                  </span>
                }
                caption="Net negative contribution across their whole catalogue"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="p-4">
                <ChartFrame
                  title="Where every listing sits, across the cohort"
                  description="How many listings fall into each band position."
                  tableRows={distribution.map((d) => ({
                    label: d.label,
                    value: `${count(d.count)} listings`,
                  }))}
                  tableHeaders={["Band position", "Listings"]}
                >
                  <ul className="space-y-2">
                    {distribution.map((d) => (
                      <li key={d.verdict}>
                        <div className="flex items-baseline justify-between gap-2 text-[12px]">
                          <span className="text-[var(--text)]">{d.label}</span>
                          <span className="tabular font-medium text-[var(--text-muted)]">
                            {count(d.count)}
                          </span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(d.count / maxBand) * 100}%`,
                              background: BAND_COLOUR[d.verdict] ?? "var(--neutral-data)",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </ChartFrame>
                <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
                  &ldquo;No viable price&rdquo; is the one to watch: those listings cannot be fixed
                  by pricing at all. See cluster health for where that clusters by design.
                </p>
              </Card>

              <Card className="p-4">
                <h2 className="text-[13px] font-semibold text-[var(--text)]">
                  Sellers, worst first
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  Ranked by what their catalogue earns or loses in a month
                </p>
                <ul className="mt-3 space-y-2">
                  {health.map((h) => (
                    <li
                      key={h.seller.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/sellers?focus=${h.seller.id}`}
                          className="truncate text-[13px] font-medium text-[var(--text)] hover:underline"
                        >
                          {h.seller.businessName}
                        </Link>
                        <p className="text-[11px] text-[var(--text-subtle)]">
                          {h.seller.city} · {count(h.listingCount)} listings ·{" "}
                          {h.archetype.replace(/-/g, " ")}
                        </p>
                      </div>
                      <span
                        className={`tabular shrink-0 text-[13px] font-semibold ${h.monthlyContribution >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                      >
                        {inr(h.monthlyContribution)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card className="mt-4 p-4">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                90-day survival, treated against control
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                This cohort is small — see the experiment readout for whether any of this is
                significant yet.
              </p>
              <div className="mt-3">
                <Link
                  href="/experiment"
                  className="inline-flex min-h-11 items-center text-[13px] font-medium text-[var(--brand-magenta)] hover:underline"
                >
                  Open the experiment readout
                </Link>
              </div>
            </Card>
          </>
        )}
      </StateGate>
    </div>
  );
}
