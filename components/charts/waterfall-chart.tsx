"use client";

/**
 * The unit-economics waterfall, read like a statement: +₹52 believed at the
 * top, −₹43 real at the bottom, every step in between on its own line.
 *
 * Laid out horizontally on purpose. Seven vertical bars cannot carry Hindi
 * labels at 360px; seven rows can, at full size, on any screen. Connector
 * lines carry each running total down to the next row, and a bracket on the
 * right spans the whole statement with the gap — the gap is the story, not
 * any single bar.
 *
 * Every row is focusable and explains itself.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Amount } from "@/components/shared/amount";
import { ChartFrame } from "./chart-frame";
import { inr, inrSigned } from "@/lib/format";
import type { Waterfall, WaterfallBar } from "@/engine/waterfall";

function barColour(b: WaterfallBar): string {
  if (b.kind === "belief") return "var(--neutral-data)";
  if (b.kind === "reality") return b.value < 0 ? "var(--danger)" : "var(--success)";
  if (b.kind === "credit") return "var(--success)";
  return "var(--danger)";
}

export function WaterfallChart({ waterfall }: { waterfall: Waterfall }) {
  const bars = waterfall.bars;
  const [active, setActive] = useState<string | null>(null);

  // Domain across every start and end, always including zero.
  const extents = bars.flatMap((b) => [b.runningTotal, b.kind === "belief" || b.kind === "reality" ? 0 : b.runningTotal - b.value]);
  const min = Math.min(0, ...extents);
  const max = Math.max(0, ...extents);
  const range = Math.max(max - min, 1);
  const pct = (v: number) => ((v - min) / range) * 100;
  const zero = pct(0);

  const activeBar = bars.find((b) => b.key === active);
  const gapPct = Math.round(waterfall.gapPctOfPrice * 100);

  return (
    <ChartFrame
      title="What you think you earn, and what reaches you"
      titleHi="आपका हिसाब, और सच्चाई"
      description={`Per parcel shipped: you believe you earn ${inr(waterfall.believed)}; what reaches you is ${inr(waterfall.reality)}. The gap is ${inr(waterfall.gap)}.`}
      tableRows={bars.map((b) => ({
        label: `${b.labelHi} · ${b.label}`,
        value: b.kind === "belief" || b.kind === "reality" ? inr(b.value, 2) : inrSigned(b.value, 2),
        note: b.explain,
      }))}
      tableHeaders={["Step", "₹ per parcel"]}
    >
      <div className="flex gap-3">
        <ol className="min-w-0 flex-1 space-y-2">
          {bars.map((b, i) => {
            const start = b.kind === "belief" || b.kind === "reality" ? 0 : b.runningTotal - b.value;
            const end = b.runningTotal;
            const left = Math.min(pct(start), pct(end));
            const width = Math.max(Math.abs(pct(end) - pct(start)), 0.8);
            const isTotal = b.kind === "belief" || b.kind === "reality";
            const on = active === b.key;

            return (
              <li key={b.key}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(b.key)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(b.key)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(on ? null : b.key)}
                  aria-label={`${b.label}: ${inrSigned(b.value, 2)}. ${b.explain}`}
                  className={cn(
                    "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-[var(--radius-input)] px-2 py-1.5 text-left transition-colors sm:grid-cols-[minmax(150px,0.9fr)_minmax(0,1.6fr)_72px]",
                    on ? "bg-[var(--surface-sunken)]" : "hover:bg-[var(--surface-sunken)]",
                    isTotal && "py-2",
                  )}
                >
                  <span className="min-w-0 leading-tight">
                    <span className={cn("hi block truncate text-[13px] text-[var(--text)]", isTotal ? "font-semibold" : "font-medium")}>
                      {b.labelHi}
                    </span>
                    <span className="block truncate text-[11.5px] text-[var(--text-subtle)]">{b.label}</span>
                  </span>

                  {/* On a phone the value sits on the label line; the bar goes beneath. */}
                  <span className="text-right sm:order-3">
                    <Amount
                      value={b.value}
                      size={isTotal ? "md" : "sm"}
                      decimals={1}
                      signed={!isTotal}
                      tone={b.kind === "belief" ? "none" : b.value < 0 ? "danger" : "success"}
                    />
                  </span>

                  <span className="relative col-span-2 block h-6 sm:order-2 sm:col-span-1" aria-hidden>
                    <span className="absolute inset-y-0 w-px bg-[var(--border-strong)]" style={{ left: `${zero}%` }} />
                    {i > 0 ? (
                      <span
                        className="absolute -top-[18px] hidden h-[18px] border-l border-dashed border-[var(--border-strong)] sm:block"
                        style={{ left: `${pct(start)}%` }}
                      />
                    ) : null}
                    <span
                      className={cn("absolute inset-y-[3px] rounded-[3px]", isTotal ? "inset-y-0" : "")}
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: barColour(b),
                        opacity: b.kind === "belief" ? 0.55 : 0.92,
                      }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* The bracket: belief to reality, with the gap named. */}
        <div className="relative hidden w-[76px] shrink-0 py-3 sm:block" aria-hidden>
          <div className="absolute inset-y-4 left-0 w-3 rounded-r-md border-y-2 border-r-2 border-[var(--danger-line)]" />
          <div className="absolute left-5 top-1/2 -translate-y-1/2 leading-tight">
            <Amount value={waterfall.gap} size="lg" tone="danger" />
            <span className="block text-[11px] font-medium text-[var(--text-muted)]">gap · {gapPct}%</span>
          </div>
        </div>
      </div>

      <p className="type-caption mt-3 min-h-[2.5rem] rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2 text-[var(--text-muted)]">
        {activeBar ? (
          activeBar.explain
        ) : (
          <>
            You believe you earn <strong className="text-[var(--text)]">{inr(waterfall.believed)}</strong> a parcel.{" "}
            <strong className="text-[var(--danger)]">{inr(waterfall.gap)}</strong> — {gapPct}% of the price — goes
            somewhere you cannot see for 15 to 25 days. Tap any line to see where.
          </>
        )}
      </p>
    </ChartFrame>
  );
}
