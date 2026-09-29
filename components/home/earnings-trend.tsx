"use client";

/**
 * Thirty days of what each day's parcels actually earned, after every
 * deduction, from her settlement lines.
 *
 * Readable on its own: a rupee y-axis with round-number gridlines, dated
 * x-axis ticks, and a crosshair that gives the exact figure for any day —
 * with the parcel counts behind it, so a bad day explains itself. The chart
 * is keyboard-operable (arrow keys) and announces the readout to screen
 * readers, not only to a mouse.
 */

import { useState } from "react";
import { useWidth } from "@/lib/use-width";
import { ChartFrame } from "@/components/charts/chart-frame";
import { Amount } from "@/components/shared/amount";
import { formatDate, formatDateShort, inr, inrCompact } from "@/lib/format";
import type { TrendPoint } from "@/lib/selectors";

const H = 230;
const PAD_L = 58;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 30;

/** Round-number ticks spanning [min, max], always including zero. */
function niceTicks(min: number, max: number, target = 4): number[] {
  const lo = Math.min(min, 0);
  const hi = Math.max(max, 0);
  const span = Math.max(hi - lo, 1);
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + step * 0.001; v += step) ticks.push(Math.round(v));
  if (ticks[ticks.length - 1]! < hi) ticks.push(Math.round((ticks[ticks.length - 1] ?? 0) + step));
  return ticks;
}

export function EarningsTrend({ points }: { points: TrendPoint[] }) {
  const { ref, width } = useWidth(560);
  const W = Math.max(280, width);
  const [active, setActive] = useState<number | null>(null);

  const values = points.map((p) => p.value);
  const total = values.reduce((a, b) => a + b, 0);
  const ticks = niceTicks(Math.min(...values, 0), Math.max(...values, 0));
  const yMin = ticks[0] ?? 0;
  const yMax = ticks[ticks.length - 1] ?? 1;

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (i / Math.max(points.length - 1, 1)) * plotW;
  const y = (v: number) => PAD_T + plotH - ((v - yMin) / Math.max(yMax - yMin, 1)) * plotH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const colour = total >= 0 ? "var(--success)" : "var(--danger)";

  // Date ticks: fewer on a phone so they never collide.
  const xTickCount = W < 420 ? 3 : W < 640 ? 4 : 6;
  const xTicks = Array.from({ length: xTickCount }, (_, k) =>
    Math.round((k * (points.length - 1)) / Math.max(xTickCount - 1, 1)),
  );

  const worst = points.reduce((a, b) => (b.value < a.value ? b : a), points[0] ?? { day: 0, value: 0, parcels: 0, paid: 0 });
  const best = points.reduce((a, b) => (b.value > a.value ? b : a), points[0] ?? { day: 0, value: 0, parcels: 0, paid: 0 });

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const i = Math.round(((px - PAD_L) / plotW) * (points.length - 1));
    setActive(Math.max(0, Math.min(points.length - 1, i)));
  };

  const a = active !== null ? points[active] : null;
  const ax = active !== null ? x(active) : 0;
  // Keep the tooltip inside the chart: flip to the left of the cursor near the right edge.
  const tipLeft = ax > W - 200 ? ax - 188 : ax + 12;

  return (
    <ChartFrame
      title="What each day's parcels earned you"
      titleHi="पिछले 30 दिन"
      description={`Daily earnings over ${points.length} days, totalling ${inr(total)}.`}
      tableRows={points.map((p) => ({
        label: formatDateShort(p.day),
        value: `${inr(p.value)} · ${p.parcels} parcels, ${p.paid} paid`,
      }))}
      tableHeaders={["Day", "Earned"]}
      isEmpty={points.length < 2}
      emptyTitle="No parcels in the last 30 days"
      emptyDescription="Once orders move, each day's earnings after every deduction appear here."
    >
      <dl className="mb-3 grid grid-cols-3 gap-2">
        {[
          { label: "30-day total", v: total, note: `${points.reduce((s, p) => s + p.parcels, 0)} parcels` },
          { label: "Worst day", v: worst.value, note: formatDateShort(worst.day) },
          { label: "Best day", v: best.value, note: formatDateShort(best.day) },
        ].map((s) => (
          <div key={s.label} className="rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2">
            <dt className="text-[11.5px] text-[var(--text-subtle)]">{s.label}</dt>
            <dd>
              <Amount value={s.v} size="md" tone="auto" />
            </dd>
            <dd className="text-[11px] text-[var(--text-subtle)]">{s.note}</dd>
          </div>
        ))}
      </dl>

      <div
        ref={ref}
        className="relative outline-none focus-visible:rounded-[var(--radius-input)] focus-visible:ring-2 focus-visible:ring-[var(--brand-magenta)]"
        tabIndex={0}
        role="group"
        aria-label="Daily earnings chart. Use the left and right arrow keys to read each day."
        onFocus={() => setActive((v) => v ?? points.length - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((v) => Math.max(0, (v ?? points.length) - 1));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setActive((v) => Math.min(points.length - 1, (v ?? -1) + 1));
          } else if (e.key === "Escape") setActive(null);
        }}
      >
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          className="block max-w-full touch-pan-y"
          aria-hidden
          onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
          onPointerLeave={() => setActive(null)}
        >
          {/* Y axis: gridlines at round rupee values, zero emphasised. */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--border-strong)" : "var(--border)"}
                strokeDasharray={t === 0 ? undefined : "2 4"}
              />
              <text x={PAD_L - 8} y={y(t) + 4} textAnchor="end" fill="var(--text-subtle)" fontSize="11">
                {t === 0 ? "₹0" : inrCompact(t).replace(".0", "")}
              </text>
            </g>
          ))}

          {/* X axis: dates. */}
          {xTicks.map((i) => {
            const p = points[i];
            if (!p) return null;
            const anchor = i === 0 ? "start" : i === points.length - 1 ? "end" : "middle";
            return (
              <g key={i}>
                <line x1={x(i)} x2={x(i)} y1={PAD_T + plotH} y2={PAD_T + plotH + 4} stroke="var(--border-strong)" />
                <text x={x(i)} y={H - 8} textAnchor={anchor} fill="var(--text-subtle)" fontSize="11">
                  {formatDateShort(p.day)}
                </text>
              </g>
            );
          })}

          <path d={area} fill={colour} fillOpacity="0.1" />
          <path d={line} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" />

          {a ? (
            <g>
              <line x1={ax} x2={ax} y1={PAD_T} y2={PAD_T + plotH} stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={ax} cy={y(a.value)} r="5" fill={a.value < 0 ? "var(--danger)" : "var(--success)"} stroke="var(--surface)" strokeWidth="2.5" />
            </g>
          ) : null}

          {/* Invisible hit area over the plot, so hovering anywhere in a column works. */}
          <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} fill="transparent" />
        </svg>

        {a ? (
          <div
            className="pointer-events-none absolute z-10 w-[176px] rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow-pop)]"
            style={{ left: tipLeft, top: Math.max(4, Math.min(y(a.value) - 40, H - 110)) }}
          >
            <p className="text-[11.5px] font-medium text-[var(--text-muted)]">{formatDate(a.day)}</p>
            <p className="mt-0.5">
              <Amount value={a.value} size="lg" tone="auto" />
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-[var(--text-muted)]">
              {a.parcels} parcels shipped
              <br />
              {a.paid} paid you
              {a.parcels > 0 ? (
                <>
                  <br />
                  {inr(a.value / a.parcels)} per parcel
                </>
              ) : null}
            </p>
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {a ? `${formatDate(a.day)}: ${inr(a.value)}, ${a.parcels} parcels shipped, ${a.paid} paid.` : ""}
        </p>
      </div>
      <p className="type-caption mt-2 text-[var(--text-subtle)]">
        Hover or tap the chart for any day&rsquo;s exact figure. Money reaches you about 15 days after each day shown.
      </p>
    </ChartFrame>
  );
}
