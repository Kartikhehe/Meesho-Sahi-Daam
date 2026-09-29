"use client";

/**
 * The unit-economics waterfall: +₹52 believed → −₹43 real.
 *
 * Connector lines between bars, a running subtotal, and a bracket spanning the
 * whole chart labelled with the gap — because the gap is the story, not any
 * single bar. Hover any bar for its explanation.
 */

import { useId, useState } from "react";
import { inr, inrSigned } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import type { Waterfall } from "@/engine/waterfall";

const W = 720;
const H = 300;
const PAD_X = 40;
const PAD_TOP = 46;
const PAD_BOTTOM = 76;

export function WaterfallChart({ waterfall }: { waterfall: Waterfall }) {
  const id = useId();
  const [hovered, setHovered] = useState<string | null>(null);
  const bars = waterfall.bars;

  const values = bars.flatMap((b) => [b.runningTotal, b.runningTotal - b.value, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1);

  const plotH = H - PAD_TOP - PAD_BOTTOM;
  const y = (v: number) => PAD_TOP + ((max - v) / range) * plotH;
  const bandW = (W - PAD_X * 2) / bars.length;
  const barW = Math.min(bandW * 0.56, 58);

  const zeroY = y(0);

  const tableRows = bars.map((b) => ({
    label: b.label,
    value: b.kind === "belief" || b.kind === "reality" ? inr(b.value, 2) : inrSigned(b.value, 2),
    note: b.explain,
  }));

  return (
    <ChartFrame
      title="What you think you earn, against what reaches you"
      titleHi="आपका हिसाब, और सच्चाई"
      description={`Per parcel shipped: you believe you earn ${inr(waterfall.believed)}, but ${inr(Math.abs(waterfall.reality))} ${waterfall.reality < 0 ? "leaves your pocket" : "reaches you"}. The gap is ${inr(waterfall.gap)}.`}
      tableRows={tableRows}
      tableHeaders={["Step", "₹ per parcel"]}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
        <title id={`${id}-t`}>Unit economics per parcel shipped</title>
        <desc id={`${id}-d`}>
          Belief {inr(waterfall.believed)}, reality {inr(waterfall.reality)}, a gap of{" "}
          {inr(waterfall.gap)} — {(waterfall.gapPctOfPrice * 100).toFixed(0)}% of the list price.
        </desc>

        {/* Zero line: the break-even a seller thinks she is above. */}
        <line x1={PAD_X} y1={zeroY} x2={W - PAD_X} y2={zeroY} stroke="var(--border-strong)" strokeWidth="1" />
        <text x={PAD_X - 6} y={zeroY + 3} textAnchor="end" fill="var(--text-subtle)" fontSize="10" className="tabular">
          ₹0
        </text>

        {bars.map((bar, i) => {
          const cx = PAD_X + bandW * i + bandW / 2;
          const start = bar.kind === "belief" || bar.kind === "reality" ? 0 : bar.runningTotal - bar.value;
          const end = bar.runningTotal;
          const top = y(Math.max(start, end));
          const height = Math.max(Math.abs(y(start) - y(end)), 2);

          const fill =
            bar.kind === "belief"
              ? "var(--neutral-data)"
              : bar.kind === "reality"
                ? bar.value < 0
                  ? "var(--danger)"
                  : "var(--success)"
                : bar.kind === "credit"
                  ? "var(--success)"
                  : "var(--danger)";

          const isHovered = hovered === bar.key;
          const next = bars[i + 1];

          return (
            <g key={bar.key}>
              {/* Connector to the next bar's starting height. */}
              {next && next.kind !== "reality" ? (
                <line
                  x1={cx + barW / 2}
                  y1={y(end)}
                  x2={PAD_X + bandW * (i + 1) + bandW / 2 - barW / 2}
                  y2={y(end)}
                  stroke="var(--border-strong)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              ) : null}

              <rect
                x={cx - barW / 2}
                y={top}
                width={barW}
                height={height}
                rx="2"
                fill={fill}
                opacity={isHovered ? 1 : 0.88}
                onMouseEnter={() => setHovered(bar.key)}
                onMouseLeave={() => setHovered(null)}
                tabIndex={0}
                role="button"
                aria-label={`${bar.label}: ${inrSigned(bar.value)}. ${bar.explain}`}
                onFocus={() => setHovered(bar.key)}
                onBlur={() => setHovered(null)}
              />

              <text
                x={cx}
                y={end >= start ? top - 5 : top + height + 13}
                textAnchor="middle"
                className="tabular"
                fill={bar.value < 0 ? "var(--danger)" : "var(--text)"}
                fontSize="11"
                fontWeight="600"
              >
                {bar.kind === "belief" || bar.kind === "reality"
                  ? inr(bar.value)
                  : inrSigned(bar.value)}
              </text>

              <text
                x={cx}
                y={H - PAD_BOTTOM + 18}
                textAnchor="middle"
                fill="var(--text-muted)"
                fontSize="9.5"
              >
                {wrapLabel(bar.labelHi)}
              </text>
            </g>
          );
        })}

        {/* The bracket spanning belief to reality — the gap is the headline. */}
        <g>
          <line x1={PAD_X + bandW / 2} y1={26} x2={W - PAD_X - bandW / 2} y2={26} stroke="var(--text-subtle)" strokeWidth="1" />
          <line x1={PAD_X + bandW / 2} y1={26} x2={PAD_X + bandW / 2} y2={34} stroke="var(--text-subtle)" strokeWidth="1" />
          <line x1={W - PAD_X - bandW / 2} y1={26} x2={W - PAD_X - bandW / 2} y2={34} stroke="var(--text-subtle)" strokeWidth="1" />
          <rect x={W / 2 - 92} y={14} width="184" height="22" rx="11" fill="var(--danger-bg)" />
          <text x={W / 2} y={29} textAnchor="middle" fill="var(--danger)" fontSize="11.5" fontWeight="700" className="tabular">
            {inr(waterfall.gap)} gap · {(waterfall.gapPctOfPrice * 100).toFixed(0)}% of price
          </text>
        </g>
      </svg>

      <p className="mt-1 min-h-[34px] text-[12px] leading-relaxed text-[var(--text-muted)]">
        {hovered
          ? bars.find((b) => b.key === hovered)?.explain
          : "Hover or tab through any bar to see what it is and where the number comes from."}
      </p>
    </ChartFrame>
  );
}

/** Keep x-axis labels to a readable width. */
function wrapLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 13)}…` : label;
}
