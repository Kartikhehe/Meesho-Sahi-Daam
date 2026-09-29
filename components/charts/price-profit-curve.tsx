"use client";

/**
 * Price against orders and contribution — the "aha" chart.
 *
 * X is price. Left Y is orders per month (falling as price rises). Right Y is
 * contribution ₹ per month, which rises then collapses: below the floor every
 * order loses money, above the ceiling nobody sees the listing. The peak sits
 * inside the band, and seeing that peak is what makes the band feel real
 * rather than asserted.
 *
 * Both series come from the demand model and the cost model — this curve is
 * computed, never drawn by hand.
 */

import { useId } from "react";
import { inr, inrCompact } from "@/lib/format";
import { ChartFrame } from "./chart-frame";

const W = 720;
const H = 300;
const PAD_L = 48;
const PAD_R = 56;
const PAD_T = 22;
const PAD_B = 48;

export type CurvePoint = { price: number; ordersPerMonth: number; contributionPerMonth: number };

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

  const prices = points.map((p) => p.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const maxOrders = Math.max(...points.map((p) => p.ordersPerMonth), 1);
  const contributions = points.map((p) => p.contributionPerMonth);
  const maxC = Math.max(...contributions, 1);
  const minC = Math.min(...contributions, 0);

  const x = (price: number) => PAD_L + ((price - minP) / Math.max(maxP - minP, 1)) * (W - PAD_L - PAD_R);
  const yOrders = (n: number) => H - PAD_B - (n / maxOrders) * (H - PAD_T - PAD_B);
  const yContrib = (c: number) =>
    H - PAD_B - ((c - minC) / Math.max(maxC - minC, 1)) * (H - PAD_T - PAD_B);

  const ordersPath = points.map((p, i) => `${i ? "L" : "M"}${x(p.price)},${yOrders(p.ordersPerMonth)}`).join(" ");
  const contribPath = points
    .map((p, i) => `${i ? "L" : "M"}${x(p.price)},${yContrib(p.contributionPerMonth)}`)
    .join(" ");

  const peak = points.reduce((a, b) => (b.contributionPerMonth > a.contributionPerMonth ? b : a));
  const zeroY = yContrib(0);

  const rules = [
    { value: floor, label: "सुरक्षा दाम", colour: "var(--danger)" },
    { value: ceiling, label: "दिखने की सीमा", colour: "var(--info)" },
    { value: current, label: "आपका दाम", colour: "var(--text)" },
    ...(recommended > 0 ? [{ value: recommended, label: "सुझाया", colour: "var(--success)" }] : []),
  ].filter((r) => r.value >= minP && r.value <= maxP);

  const tableRows = points
    .filter((_, i) => i % Math.ceil(points.length / 8) === 0)
    .map((p) => ({
      label: inr(p.price),
      value: `${p.ordersPerMonth.toFixed(0)} orders · ${inr(p.contributionPerMonth)}`,
    }));

  return (
    <ChartFrame
      title="Price against orders and earnings, per month"
      titleHi="दाम, ऑर्डर और कमाई"
      description={`Earnings peak at ${inr(peak.price)}, where roughly ${peak.ordersPerMonth.toFixed(0)} orders a month bring in ${inr(peak.contributionPerMonth)}.`}
      tableRows={tableRows}
      tableHeaders={["Price", "Orders and earnings per month"]}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
        <title id={`${id}-t`}>Price against orders and monthly earnings</title>
        <desc id={`${id}-d`}>
          As price rises orders fall. Earnings peak at {inr(peak.price)} —{" "}
          {inr(peak.contributionPerMonth)} a month — then fall away above the visibility ceiling of{" "}
          {inr(ceiling)}.
        </desc>

        {/* Axes */}
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border-strong)" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border-strong)" />
        <line x1={W - PAD_R} y1={PAD_T} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border-strong)" />

        {/* Zero contribution line — below it she is paying to sell. */}
        {minC < 0 ? (
          <line x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY} stroke="var(--danger)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
        ) : null}

        {/* The band, shaded */}
        {ceiling > floor ? (
          <rect
            x={x(Math.max(floor, minP))}
            y={PAD_T}
            width={Math.max(0, x(Math.min(ceiling, maxP)) - x(Math.max(floor, minP)))}
            height={H - PAD_T - PAD_B}
            fill="var(--success)"
            opacity="0.06"
          />
        ) : null}

        {rules.map((r) => (
          <g key={r.label}>
            <line x1={x(r.value)} y1={PAD_T} x2={x(r.value)} y2={H - PAD_B} stroke={r.colour} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
            <text x={x(r.value)} y={PAD_T - 6} textAnchor="middle" className="hi" fill={r.colour} fontSize="9.5">
              {r.label}
            </text>
          </g>
        ))}

        {/* Orders: the quieter of the two series. */}
        <path d={ordersPath} fill="none" stroke="var(--neutral-data)" strokeWidth="2" strokeDasharray="5 3" />

        {/* Contribution: the one the seller is here for. */}
        <path d={contribPath} fill="none" stroke="var(--success)" strokeWidth="2.5" />

        {/* The peak */}
        <circle cx={x(peak.price)} cy={yContrib(peak.contributionPerMonth)} r="5" fill="var(--success)" stroke="var(--surface)" strokeWidth="2" />
        <text
          x={x(peak.price)}
          y={yContrib(peak.contributionPerMonth) - 10}
          textAnchor="middle"
          className="tabular"
          fill="var(--success)"
          fontSize="11"
          fontWeight="700"
        >
          {inr(peak.contributionPerMonth)}/mo
        </text>

        {/* Axis labels */}
        <text x={PAD_L - 8} y={PAD_T + 8} textAnchor="end" fill="var(--neutral-data)" fontSize="9.5">
          {maxOrders.toFixed(0)}
        </text>
        <text x={PAD_L - 8} y={H - PAD_B} textAnchor="end" fill="var(--neutral-data)" fontSize="9.5">
          0
        </text>
        <text x={12} y={H / 2} fill="var(--neutral-data)" fontSize="10" transform={`rotate(-90 12 ${H / 2})`} textAnchor="middle">
          orders / month
        </text>

        <text x={W - PAD_R + 8} y={PAD_T + 8} fill="var(--success)" fontSize="9.5" className="tabular">
          {inrCompact(maxC)}
        </text>
        <text x={W - PAD_R + 8} y={zeroY + 3} fill="var(--success)" fontSize="9.5" className="tabular">
          ₹0
        </text>
        <text
          x={W - 10}
          y={H / 2}
          fill="var(--success)"
          fontSize="10"
          transform={`rotate(90 ${W - 10} ${H / 2})`}
          textAnchor="middle"
        >
          earnings ₹ / month
        </text>

        <text x={(W - PAD_R + PAD_L) / 2} y={H - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
          your price (₹)
        </text>
        <text x={PAD_L} y={H - PAD_B + 16} textAnchor="middle" className="tabular" fill="var(--text-subtle)" fontSize="9.5">
          {inr(minP)}
        </text>
        <text x={W - PAD_R} y={H - PAD_B + 16} textAnchor="middle" className="tabular" fill="var(--text-subtle)" fontSize="9.5">
          {inr(maxP)}
        </text>
      </svg>

      <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
        The dashed grey line is orders; the solid green line is what you actually keep. More orders
        is not more money — earnings peak at <strong>{inr(peak.price)}</strong>, inside your band.
      </p>
    </ChartFrame>
  );
}
