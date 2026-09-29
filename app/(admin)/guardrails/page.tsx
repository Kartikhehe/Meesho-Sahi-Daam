"use client";

/**
 * A3 · Guardrails.
 *
 * Four, each with a live monitor. The Buyer Price Index gate is the one that
 * matters most: a pricing tool that improves seller margins by raising what
 * buyers pay has not solved anything, it has just moved the loss. The breach
 * state is reachable in a demo on purpose — a guardrail nobody has seen fire
 * is a guardrail nobody trusts.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Power, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { ChartFrame } from "@/components/charts/chart-frame";
import { useWorld } from "@/lib/use-seller";
import { useAudit } from "@/lib/audit";
import { ALERT_CAP_PER_WEEK, BUYER_PRICE_INDEX_GATE } from "@/engine/constants";
import { count } from "@/lib/format";
import { Page, PageHeader } from "@/components/shared/page-header";

export default function GuardrailsPage() {
  const { world, status, error } = useWorld();
  const audit = useAudit();

  const [simulatedBpi, setSimulatedBpi] = useState<number | null>(null);
  const [killed, setKilled] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [autoPilot, setAutoPilot] = useState(false);

  /** Buyer Price Index over time, from what the simulation actually produced. */
  const series = useMemo(() => {
    if (!world) return [];
    const treated = new Set(
      world.sellers.filter((s) => s.treatment === "treated").map((s) => s.id),
    );
    const listingSeller = new Map(world.listings.map((l) => [l.id, l.sellerId]));

    const out: { day: number; index: number }[] = [];
    for (let d = world.day - 56; d <= world.day; d += 7) {
      const window = world.orders.filter((o) => o.day > d - 7 && o.day <= d);
      const t = window.filter((o) => treated.has(listingSeller.get(o.listingId) ?? ""));
      const c = window.filter((o) => !treated.has(listingSeller.get(o.listingId) ?? ""));
      if (!t.length || !c.length) continue;
      const tAvg = t.reduce((a, o) => a + o.price, 0) / t.length;
      const cAvg = c.reduce((a, o) => a + o.price, 0) / c.length;
      out.push({ day: d, index: (tAvg / cAvg) * 100 });
    }
    return out;
  }, [world]);

  const liveBpi = series.length ? (series[series.length - 1]?.index ?? 100) : 100;
  const bpi = simulatedBpi ?? liveBpi;
  const breached = bpi > BUYER_PRICE_INDEX_GATE;

  const toggleKill = () => {
    const next = !killed;
    setKilled(next);
    setConfirmKill(false);
    audit({
      capability: "admin.guardrails",
      action: next ? "Pulled the global kill switch" : "Restored the tool",
      subject: "All price recommendations",
      before: next ? "active" : "stopped",
      after: next ? "stopped" : "active",
      blastRadius: next
        ? `All recommendations, alerts and Auto-Pilot stopped for ${count(world?.sellers.length ?? 0)} sellers. Existing prices are untouched.`
        : `Recommendations resumed for ${count(world?.sellers.length ?? 0)} sellers.`,
    });
  };

  return (
    <Page>
      <PageHeader
        title="Guardrails"
        description={<>The four limits that stop this tool doing harm at scale</>}
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {killed ? (
          <Card className="mb-4 flex items-start gap-2 border-[var(--danger)]/40 bg-[var(--danger-bg)] p-3">
            <Power size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <p className="text-[13px] leading-relaxed text-[var(--text)]">
              <strong>The tool is stopped.</strong> No recommendations, no alerts, no Auto-Pilot
              changes. Sellers keep their current prices and can still price manually — nothing has
              been reverted.
            </p>
          </Card>
        ) : null}

        {/* 1 — Buyer Price Index */}
        <Card tone={breached ? "danger" : "default"} className="mb-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text)]">Buyer Price Index</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                What buyers pay in the treated group, against the control at 100. If this rises
                above {BUYER_PRICE_INDEX_GATE}, the tool is making shopping more expensive — and
                upward nudges pause on their own.
              </p>
            </div>
            <StatusChip tone={breached ? "danger" : "success"}>
              {breached ? "Breached — upward nudges paused" : "Within the gate"}
            </StatusChip>
          </div>

          <p className={`tabular mt-3 text-[32px] font-semibold ${breached ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
            {bpi.toFixed(1)}
          </p>

          {series.length > 1 ? (
            <div className="mt-2">
              <ChartFrame
                title="Buyer Price Index over the last 8 weeks"
                description={`The index has ranged from ${Math.min(...series.map((s) => s.index)).toFixed(1)} to ${Math.max(...series.map((s) => s.index)).toFixed(1)}.`}
                tableRows={series.map((s) => ({
                  label: `Day ${s.day}`,
                  value: s.index.toFixed(1),
                }))}
                tableHeaders={["Week", "Index"]}
              >
                <Sparkline series={series} gate={BUYER_PRICE_INDEX_GATE} />
              </ChartFrame>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
            <span className="text-[12px] text-[var(--text-muted)]">
              Make the breach reachable for a demo:
            </span>
            <Button
              size="sm"
              variant={simulatedBpi !== null ? "primary" : "secondary"}
              onClick={() => setSimulatedBpi(simulatedBpi === null ? 103.4 : null)}
            >
              {simulatedBpi === null ? "Simulate a breach" : "Back to live data"}
            </Button>
          </div>

          {breached ? (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-relaxed text-[var(--danger)]">
              <AlertTriangle size={13} aria-hidden className="mt-0.5 shrink-0" />
              Upward price suggestions are paused across the cohort. Suggestions that would lower a
              price still run, because those help buyers too.
            </p>
          ) : null}
        </Card>

        {/* 2 — Alert cap */}
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text)]">Alert cap</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                At most {ALERT_CAP_PER_WEEK} messages per seller per week. Enforced in the engine,
                not in the UI.
              </p>
            </div>
            <StatusChip tone="success">Enforced</StatusChip>
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-muted)]">
            {count(world?.alerts.filter((a) => a.muted).length ?? 0)} alerts are currently held
            back. See the trigger screen for the per-seller histogram.
          </p>
        </Card>

        {/* 3 — Auto-Pilot bounds */}
        <Card className="mb-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text)]">Auto-Pilot bounds</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Opt-in only, and it may never set a price below the seller&rsquo;s own floor or
                above her ceiling. Every automatic change is reversible and is shown to her.
              </p>
            </div>
            <StatusChip tone={autoPilot ? "warning" : "neutral"}>
              {autoPilot ? "Available to opt in" : "Off for the cohort"}
            </StatusChip>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              const next = !autoPilot;
              setAutoPilot(next);
              audit({
                capability: "admin.guardrails",
                action: next ? "Made Auto-Pilot available" : "Withdrew Auto-Pilot",
                subject: "Auto-Pilot opt-in",
                before: autoPilot ? "available" : "off",
                after: next ? "available" : "off",
                blastRadius: `${count(world?.sellers.length ?? 0)} sellers can now choose to opt in. Nobody is enrolled automatically.`,
              });
            }}
          >
            {autoPilot ? "Withdraw Auto-Pilot" : "Make Auto-Pilot available"}
          </Button>
        </Card>

        {/* 4 — Kill switch */}
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold text-[var(--text)]">Global kill switch</h2>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Stops all recommendations, alerts and Auto-Pilot immediately.
              </p>
            </div>
            <StatusChip tone={killed ? "danger" : "success"}>
              {killed ? "Stopped" : "Running"}
            </StatusChip>
          </div>

          {confirmKill ? (
            <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--danger)]/30 bg-[var(--danger-bg)] p-3">
              <p className="text-[13px] font-medium text-[var(--text)]">
                This stops, for all {count(world?.sellers.length ?? 0)} sellers:
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[12px] text-[var(--text-muted)]">
                <li>· every price recommendation</li>
                <li>· every alert, including ones already queued</li>
                <li>· every Auto-Pilot adjustment</li>
              </ul>
              <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
                It does <strong>not</strong> revert any price already set. Sellers keep trading
                exactly as they are.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="danger" onClick={toggleKill}>
                  Stop the tool
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmKill(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant={killed ? "secondary" : "danger"}
              className="mt-3"
              onClick={() => (killed ? toggleKill() : setConfirmKill(true))}
            >
              {killed ? (
                <>
                  <ShieldCheck size={13} aria-hidden />
                  Restore the tool
                </>
              ) : (
                <>
                  <Power size={13} aria-hidden />
                  Stop everything
                </>
              )}
            </Button>
          )}
        </Card>
      </StateGate>
    </Page>
  );
}

function Sparkline({ series, gate }: { series: { day: number; index: number }[]; gate: number }) {
  const w = 600;
  const h = 80;
  const values = series.map((s) => s.index);
  const min = Math.min(...values, gate - 2);
  const max = Math.max(...values, gate + 2);
  const y = (v: number) => h - ((v - min) / Math.max(max - min, 1)) * h;
  const path = series
    .map((s, i) => `${i ? "L" : "M"}${(i / Math.max(series.length - 1, 1)) * w},${y(s.index)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Buyer Price Index, currently ${values[values.length - 1]?.toFixed(1)}`}>
      <line x1="0" y1={y(gate)} x2={w} y2={y(gate)} stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="4 3" />
      <text x={w - 4} y={y(gate) - 4} textAnchor="end" fill="var(--danger)" fontSize="10" className="tabular">
        gate {gate}
      </text>
      <path d={path} fill="none" stroke="var(--info)" strokeWidth="2" />
    </svg>
  );
}
