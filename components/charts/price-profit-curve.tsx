"use client";

/**
 * Price against orders and earnings — the "aha" chart.
 *
 * Orders fall as price rises. Earnings rise, peak, then collapse: below the
 * floor every order loses money, above the ceiling nobody sees the listing.
 * The peak sits inside the band, and seeing it is what makes the band feel
 * real rather than asserted. Both series come from the demand and cost
 * models — computed, never drawn.
 *
 * The vertical rules (floor, ceiling, today, suggested) are keyed in a legend
 * beneath rather than labelled along the top edge, where four labels within a
 * few rupees of each other would overprint.
 */

import { useId } from "react";
import { inr, inrCompact } from "@/lib/format";
import { useWidth } from "@/lib/use-width";
import { ChartFrame } from "./chart-frame";

const H = 260;
const PAD_L = 44;
const PAD_R = 52;
const PAD_T = 18;
const PAD_B = 34;

export type CurvePoint = { price: number; ordersPerMonth: number; contributionPerMonth: number };

type Rule = { key: string; value: number; label: string; colour: string; dash: string };

export function PriceProfitCurve({
  points,
  floor,
  ceiling,
  current,
  recommended,
}: {
  points: CurvePoint[];
  floor: number;
  ceiling: number;
  current: number;
  recommended: number;
}) {
  const id = useId();
  const { ref, width } = useWidth(640);
  const W = Math.max(300, width);

  if (points.length < 2) {
    return (
      <ChartFrame
        title="Price against orders and earnings"
        titleHi="दाम, ऑर्डर और कमाई"
        description="Not enough data to draw this curve."
        tableRows={[]}
        isEmpty
        emptyTitle="Not enough market data yet"
        emptyDescription="This fills in once there are competing listings to compare against."
      >
        <span />
      </ChartFrame>
    );
  }

  const minP = Math.min(...points.map((p) => p.price));
  const maxP = Math.max(...points.map((p) => p.price));
  const maxOrders = Math.max(...points.map((p) => p.ordersPerMonth), 1);
  const maxC = Math.max(...points.map((p) => p.contributionPerMonth), 1);
  const minC = Math.min(...points.map((p) => p.contributionPerMonth), 0);

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const x = (p: number) => PAD_L + ((p - minP) / Math.max(maxP - minP, 1)) * plotW;
  const yO = (n: number) => PAD_T + plotH - (n / maxOrders) * plotH;
  const yC = (c: number) => PAD_T + plotH - ((c - minC) / Math.max(maxC - minC, 1)) * plotH;

  const ordersPath = points.map((p, i) => `${i ? "L" : "M"}${x(p.price).toFixed(1)},${yO(p.ordersPerMonth).toFixed(1)}`).join(" ");
  const contribPath = points.map((p, i) => `${i ? "L" : "M"}${x(p.price).toFixed(1)},${yC(p.contributionPerMonth).toFixed(1)}`).join(" ");
  const areaPath = `${contribPath} L${x(maxP).toFixed(1)},${yC(Math.max(minC, 0)).toFixed(1)} L${x(minP).toFixed(1)},${yC(Math.max(minC, 0)).toFixed(1)} Z`;

  const peak = points.reduce((a, b) => (b.contributionPerMonth > a.contributionPerMonth ? b : a));
  const zeroY = yC(0);

  const rules: Rule[] = (
    [
      { key: "floor", value: floor, label: "सुरक्षा दाम · floor", colour: "var(--danger)", dash: "4 3" },
      { key: "ceiling", value: ceiling, label: "दिखने की सीमा · ceiling", colour: "var(--info)", dash: "4 3" },
      { key: "current", value: current, label: "आपका दाम · today", colour: "var(--text)", dash: "1.5 3" },
      ...(recommended > 0
        ? [{ key: "rec", value: recommended, label: "सुझाया · suggested", colour: "var(--success)", dash: "0" }]
        : []),
    ] as Rule[]
  ).filter((r) => r.value >= minP && r.value <= maxP);

  const ticks = W < 440 ? 3 : 5;
  const xTicks = Array.from({ length: ticks }, (_, i) => minP + ((maxP - minP) * i) / (ticks - 1));

  return (
    <ChartFrame
      title="Price against orders and earnings, per month"
      titleHi="दाम, ऑर्डर और कमाई"
      description={`Earnings peak at ${inr(peak.price)}, where about ${peak.ordersPerMonth.toFixed(0)} orders a month bring in ${inr(peak.contributionPerMonth)}.`}
      tableRows={points
        .filter((_, i) => i % Math.ceil(points.length / 8) === 0)
        .map((p) => ({ label: inr(p.price), value: `${p.ordersPerMonth.toFixed(0)} orders · ${inr(p.contributionPerMonth)}` }))}
      tableHeaders={["Price", "Orders and earnings a month"]}
      footer={
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--text-muted)]">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-[3px] w-4 rounded-full bg-[var(--success)]" /> Earnings ₹ / month
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-[var(--neutral-data)]" /> Orders / month
          </li>
          {rules.map((r) => (
            <li key={r.key} className="hi flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-0 border-l-2" style={{ borderColor: r.colour, borderLeftStyle: r.dash === "0" ? "solid" : "dashed" }} />
              {r.label}
            </li>
          ))}
        </ul>
      }
    >
      <div ref={ref}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
          <title id={`${id}-t`}>Price against orders and monthly earnings</title>
          <desc id={`${id}-d`}>
            Earnings peak at {inr(peak.price)} — {inr(peak.contributionPerMonth)} a month — and fall away above the
            ceiling of {inr(ceiling)}.
          </desc>

          {/* Band */}
          {ceiling > floor ? (
            <rect
              x={x(Math.max(floor, minP))}
              y={PAD_T}
              width={Math.max(0, x(Math.min(ceiling, maxP)) - x(Math.max(floor, minP)))}
              height={plotH}
              fill="var(--success-bg)"
            />
          ) : null}

          {/* Grid */}
          {[0, 0.5, 1].map((f) => (
            <line key={f} x1={PAD_L} x2={W - PAD_R} y1={PAD_T + plotH * f} y2={PAD_T + plotH * f} stroke="var(--border)" />
          ))}
          {minC < 0 ? <line x1={PAD_L} x2={W - PAD_R} y1={zeroY} y2={zeroY} stroke="var(--danger)" strokeOpacity="0.45" strokeDasharray="3 3" /> : null}

          {rules.map((r) => (
            <line key={r.key} x1={x(r.value)} x2={x(r.value)} y1={PAD_T} y2={PAD_T + plotH} stroke={r.colour} strokeWidth="1.5" strokeDasharray={r.dash === "0" ? undefined : r.dash} strokeOpacity="0.85" />
          ))}

          <path d={areaPath} fill="var(--success)" fillOpacity="0.08" />
          <path d={ordersPath} fill="none" stroke="var(--neutral-data)" strokeWidth="1.75" strokeDasharray="5 4" />
          <path d={contribPath} fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinejoin="round" />

          <circle cx={x(peak.price)} cy={yC(peak.contributionPerMonth)} r="5" fill="var(--success)" stroke="var(--surface)" strokeWidth="2.5" />
          <text
            x={Math.min(W - PAD_R - 4, Math.max(PAD_L + 4, x(peak.price)))}
            y={Math.max(PAD_T + 12, yC(peak.contributionPerMonth) - 10)}
            textAnchor="middle"
            fill="var(--success)"
            fontSize="12"
            fontWeight="650"
          >
            {inr(peak.contributionPerMonth)} at {inr(peak.price)}
          </text>

          {/* Axes */}
          <text x={PAD_L - 8} y={PAD_T + 4} textAnchor="end" fill="var(--text-subtle)" fontSize="11">{maxOrders.toFixed(0)}</text>
          <text x={PAD_L - 8} y={PAD_T + plotH + 4} textAnchor="end" fill="var(--text-subtle)" fontSize="11">0</text>
          <text x={W - PAD_R + 8} y={PAD_T + 4} fill="var(--success)" fontSize="11">{inrCompact(maxC)}</text>
          {minC < 0 ? <text x={W - PAD_R + 8} y={zeroY + 4} fill="var(--success)" fontSize="11">₹0</text> : null}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - 12} textAnchor="middle" fill="var(--text-subtle)" fontSize="11">
              {inr(t)}
            </text>
          ))}
        </svg>
      </div>
    </ChartFrame>
  );
}
