"use client";

/**
 * Thirty days of what each day's parcels actually earned, after every
 * deduction. Drawn at its real width, with the zero line kept — for most of
 * these sellers the whole point is that the line lives below it.
 */

import { useId } from "react";
import { useWidth } from "@/lib/use-width";
import { ChartFrame } from "@/components/charts/chart-frame";
import { formatDateShort, inr } from "@/lib/format";

const H = 132;
const PAD_T = 10;
const PAD_B = 24;

export function EarningsTrend({ points }: { points: { day: number; value: number }[] }) {
  const id = useId();
  const { ref, width } = useWidth(560);
  const W = Math.max(260, width);

  const values = points.map((p) => p.value);
  const total = values.reduce((a, b) => a + b, 0);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const plotH = H - PAD_T - PAD_B;

  const x = (i: number) => (i / Math.max(points.length - 1, 1)) * (W - 2) + 1;
  const y = (v: number) => PAD_T + plotH - ((v - min) / range) * plotH;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const colour = total >= 0 ? "var(--success)" : "var(--danger)";

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <ChartFrame
      title="What each day's parcels earned you"
      titleHi="पिछले 30 दिन"
      description={`Daily earnings over ${points.length} days, totalling ${inr(total)}.`}
      tableRows={points.map((p) => ({ label: formatDateShort(p.day), value: inr(p.value) }))}
      tableHeaders={["Day", "Earned"]}
      isEmpty={points.length < 2}
      emptyTitle="No parcels in the last 30 days"
      emptyDescription="Once orders move, each day's earnings after every deduction appear here."
    >
      <div ref={ref}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-labelledby={id}>
          <title id={id}>Daily earnings, totalling {inr(total)}</title>
          <path d={area} fill={colour} fillOpacity="0.1" />
          <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--border-strong)" strokeDasharray="3 3" />
          <path d={line} fill="none" stroke={colour} strokeWidth="2" strokeLinejoin="round" />
          <text x={W - 2} y={y(0) < PAD_T + 14 ? y(0) + 14 : y(0) - 5} textAnchor="end" fill="var(--text-subtle)" fontSize="11">
            ₹0
          </text>
          {first ? (
            <text x={1} y={H - 6} fill="var(--text-subtle)" fontSize="11">
              {formatDateShort(first.day)}
            </text>
          ) : null}
          {last ? (
            <text x={W - 1} y={H - 6} textAnchor="end" fill="var(--text-subtle)" fontSize="11">
              {formatDateShort(last.day)}
            </text>
          ) : null}
        </svg>
      </div>
    </ChartFrame>
  );
}
