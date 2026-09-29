"use client";

import { useEffect, useState } from "react";
import { Download, Play, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/shared/empty-state";
import { useWorldStore } from "@/lib/store/world-store";
import { worldSummary } from "@/data/generator/world";
import { count, formatDate, pct } from "@/lib/format";
import { WORLD_SEED } from "@/engine/constants";

const STEPS = [1, 7, 30, 90];

export default function SimulationPage() {
  const { world, status, error, advancing, load, advance, reset, regenerate } = useWorldStore();
  const [seed, setSeed] = useState(String(WORLD_SEED));
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const exportWorld = () => {
    if (!world) return;
    const blob = new Blob([JSON.stringify(world)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sahi-daam-world-seed-${world.seed}-day-${world.day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = world ? worldSummary(world) : null;
  const progress = advancing ? Math.round((advancing.done / advancing.total) * 100) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <header className="mb-5">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          A5
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Simulation control</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
          The whole world is reproducible from its seed. Advancing the clock generates real orders
          from the demand model, resolves each to delivered, refused or returned, writes settlement
          lines credited fifteen days later, drifts rival prices, and re-evaluates every trigger.
          Nothing here is pre-baked.
        </p>
      </header>

      {status === "error" ? (
        <Card className="mb-4 border-[var(--danger)]/30 bg-[var(--danger-bg)] p-4">
          <p className="text-sm font-medium text-[var(--danger)]">The world could not be loaded</p>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{error}</p>
          <Button variant="secondary" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </Card>
      ) : null}

      {advancing ? (
        <Card className="mb-4 p-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium text-[var(--text)]">Simulating…</span>
            <span className="tabular text-[var(--text-muted)]">
              day {count(advancing.done)} of {count(advancing.total)}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div
              className="h-full rounded-full bg-[var(--brand-magenta)] transition-[width]"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">The clock</h2>
          {status === "loading" && !world ? (
            <Skeleton className="mt-3 h-24 w-full" />
          ) : world ? (
            <>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="tabular text-3xl font-semibold text-[var(--text)]">
                  Day {count(world.day)}
                </span>
                <span className="text-[13px] text-[var(--text-muted)]">{formatDate(world.day)}</span>
              </div>

              <p className="mt-3 text-[12px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
                Advance by
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {STEPS.map((n) => (
                  <Button
                    key={n}
                    variant="secondary"
                    size="sm"
                    disabled={!!busy || !!advancing}
                    onClick={() => void run(`adv-${n}`, () => advance(n))}
                  >
                    <Play size={13} aria-hidden />
                    {n} {n === 1 ? "day" : "days"}
                  </Button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!!busy || !!advancing}
                  onClick={() => void run("reset", reset)}
                >
                  <RotateCcw size={13} aria-hidden />
                  Reset to day 0
                </Button>
                <Button variant="secondary" size="sm" disabled={!world} onClick={exportWorld}>
                  <Download size={13} aria-hidden />
                  Export as JSON
                </Button>
              </div>
            </>
          ) : null}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Regenerate the world</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
            A different seed gives a different but equally valid world. The same seed always gives
            exactly this one.
          </p>
          <label className="mt-3 block text-[12px] font-medium text-[var(--text-muted)]" htmlFor="seed">
            Seed
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="seed"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              inputMode="numeric"
              className="tabular h-11 w-36 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
            />
            <Button
              variant="primary"
              disabled={!!busy || !!advancing}
              onClick={() =>
                void run("regen", () => regenerate(Number(seed) || WORLD_SEED, 180))
              }
            >
              <Sparkles size={14} aria-hidden />
              Regenerate
            </Button>
          </div>
          <p className="mt-2 text-[12px] text-[var(--text-subtle)]">
            Regenerating in the browser simulates 180 days rather than the full 18 months, so it
            finishes in a few seconds.
          </p>
        </Card>
      </div>

      {summary ? (
        <Card className="mt-4 p-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">What the simulation produced</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              ["Seed", count(summary.seed)],
              ["Sellers", count(summary.sellers)],
              ["Design clusters", count(summary.clusters)],
              ["Listings", count(summary.listings)],
              ["Rival listings", count(summary.competitors)],
              ["Orders in window", count(summary.orders)],
              ["Settlement lines", count(summary.settlements)],
              ["Alerts raised", count(summary.alerts)],
              ["Muted by the cap", count(summary.mutedAlerts)],
              ["Delivered", count(summary.delivered)],
              ["Refused (RTO)", `${count(summary.rto)} · ${pct(summary.rtoRate)}`],
              ["Returned", `${count(summary.returned)} · ${pct(summary.returnRate)}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] text-[var(--text-subtle)]">{label}</dt>
                <dd className="tabular mt-0.5 text-sm font-medium text-[var(--text)]">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-[var(--border)] pt-3 text-[12px] leading-relaxed text-[var(--text-subtle)]">
            The refused rate of {pct(summary.rtoRate)} is not configured anywhere — it emerges from
            each seller&rsquo;s cash-on-delivery share and the pincode mix her orders land in. The
            published national average is around 23%; our model lands below it deliberately, so the
            case this product makes stays conservative.
          </p>
        </Card>
      ) : null}
    </div>
  );
}
