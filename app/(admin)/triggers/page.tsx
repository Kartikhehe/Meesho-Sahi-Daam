"use client";

/**
 * A2 · Trigger thresholds.
 *
 * The six triggers, their current fire rates, and the weekly cap — with a
 * histogram of alerts per seller per week so the cap's effect is visible
 * rather than asserted. The gap between "fired" and "sent" is the whole point:
 * the cap is protecting sellers from a channel that would otherwise become
 * noise.
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { ChartFrame } from "@/components/charts/chart-frame";
import { useWorld } from "@/lib/use-seller";
import { TRIGGER_COPY } from "@/engine/triggers";
import { ALERT_CAP_PER_WEEK } from "@/engine/constants";
import { inr, count, pct } from "@/lib/format";
import type { TriggerId } from "@/engine/types";
import { Page, PageHeader } from "@/components/shared/page-header";

export default function TriggersPage() {
  const { world, status, error } = useWorld();

  const stats = useMemo(() => {
    if (!world) return null;
    const window = world.alerts.filter((a) => a.day > world.day - 28);

    const byTrigger = (Object.keys(TRIGGER_COPY) as TriggerId[]).map((id) => {
      const fired = window.filter((a) => a.triggerId === id);
      const sent = fired.filter((a) => !a.muted);
      return {
        id,
        fired: fired.length,
        sent: sent.length,
        muted: fired.length - sent.length,
        totalImpact: sent.reduce((acc, a) => acc + a.rupeeImpact, 0),
        medianImpact:
          fired.length > 0
            ? [...fired].sort((a, b) => a.rupeeImpact - b.rupeeImpact)[
                Math.floor(fired.length / 2)
              ]?.rupeeImpact ?? 0
            : 0,
      };
    });

    // Alerts per seller per week, to show the cap biting.
    const perSellerWeek = new Map<string, number>();
    for (const a of window.filter((x) => !x.muted)) {
      const key = `${a.sellerId}|${Math.floor(a.day / 7)}`;
      perSellerWeek.set(key, (perSellerWeek.get(key) ?? 0) + 1);
    }
    const histogram = [0, 1, 2, 3, 4].map((n) => ({
      alerts: n,
      sellerWeeks: [...perSellerWeek.values()].filter((v) => v === n).length,
    }));
    // Seller-weeks with zero alerts are not in the map; infer them.
    const sellerWeeks = world.sellers.length * 4;
    const withAlerts = perSellerWeek.size;
    const zeroRow = histogram[0];
    if (zeroRow) zeroRow.sellerWeeks = Math.max(0, sellerWeeks - withAlerts);

    return {
      byTrigger,
      histogram,
      totalFired: window.length,
      totalSent: window.filter((a) => !a.muted).length,
      totalMuted: window.filter((a) => a.muted).length,
    };
  }, [world]);

  const maxBar = stats ? Math.max(...stats.byTrigger.map((t) => t.fired), 1) : 1;
  const maxHist = stats ? Math.max(...stats.histogram.map((h) => h.sellerWeeks), 1) : 1;

  return (
    <Page>
      <PageHeader
        title="Trigger thresholds"
        description={<>What fires, what actually reaches a seller, and what the weekly cap holds back</>}
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {stats ? (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Fired in the last 28 days"
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                    {count(stats.totalFired)}
                  </span>
                }
                caption="Every condition that genuinely became true"
              />
              <MetricCard
                label="Actually sent"
                tone="success"
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--success)]">
                    {count(stats.totalSent)}
                  </span>
                }
                caption={`${pct(stats.totalFired > 0 ? stats.totalSent / stats.totalFired : 0, 0)} of what fired`}
              />
              <MetricCard
                label="Held back by the cap"
                tone="warning"
                value={
                  <span className="tabular text-[28px] font-semibold text-[var(--warning)]">
                    {count(stats.totalMuted)}
                  </span>
                }
                caption="Real, smaller, and visible to sellers in a separate list"
              />
            </div>

            <Card className="mb-4 p-4">
              <ChartFrame
                title="How often each trigger fires, and how much reaches the seller"
                description="Fired against sent, per trigger, over the last 28 days."
                tableRows={stats.byTrigger.map((t) => ({
                  label: TRIGGER_COPY[t.id].label,
                  value: `${count(t.sent)} sent of ${count(t.fired)} fired`,
                }))}
                tableHeaders={["Trigger", "Sent / fired"]}
              >
                <ul className="space-y-3">
                  {stats.byTrigger.map((t) => (
                    <li key={t.id}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[13px] font-medium text-[var(--text)]">
                          {TRIGGER_COPY[t.id].label}
                          <span className="hi ml-1.5 text-[11px] text-[var(--text-subtle)]">
                            {TRIGGER_COPY[t.id].labelHi}
                          </span>
                        </span>
                        <span className="tabular text-[12px] text-[var(--text-muted)]">
                          {count(t.sent)} sent · {count(t.muted)} held
                        </span>
                      </div>
                      <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full bg-[var(--success)]"
                          style={{ width: `${(t.sent / maxBar) * 100}%` }}
                        />
                        <div
                          className="h-full bg-[var(--warning)] opacity-60"
                          style={{ width: `${(t.muted / maxBar) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                        {TRIGGER_COPY[t.id].about}
                        {t.medianImpact > 0
                          ? ` Median impact when it fires: ${inr(t.medianImpact)}/month.`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </ChartFrame>
            </Card>

            <Card className="p-4">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                Alerts per seller per week
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                The cap is {ALERT_CAP_PER_WEEK} a week. Nothing should appear to the right of it.
              </p>
              <ul className="mt-3 space-y-2">
                {stats.histogram.map((h) => (
                  <li key={h.alerts} className="flex items-center gap-3">
                    <span className="tabular w-16 shrink-0 text-[12px] text-[var(--text-muted)]">
                      {h.alerts} {h.alerts === 1 ? "alert" : "alerts"}
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded bg-[var(--surface-sunken)]">
                      <div
                        className={`h-full ${h.alerts > ALERT_CAP_PER_WEEK ? "bg-[var(--danger)]" : "bg-[var(--info)]"}`}
                        style={{ width: `${(h.sellerWeeks / maxHist) * 100}%` }}
                      />
                    </div>
                    <span className="tabular w-20 shrink-0 text-right text-[12px] text-[var(--text-muted)]">
                      {count(h.sellerWeeks)}
                    </span>
                    {h.alerts > ALERT_CAP_PER_WEEK && h.sellerWeeks > 0 ? (
                      <StatusChip tone="danger">Cap breached</StatusChip>
                    ) : null}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-[var(--border)] pt-2.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Bars beyond {ALERT_CAP_PER_WEEK} would mean the cap is not being enforced. It is
                enforced in the engine, not in the UI, so this histogram is a check on the code
                rather than a description of it.
              </p>
            </Card>
          </>
        ) : null}
      </StateGate>
    </Page>
  );
}
