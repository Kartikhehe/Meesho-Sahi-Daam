"use client";

/**
 * How sure we are of her floor, and how that changes as her own orders arrive.
 * The band is the floor's 80% range at each order count; the dot is where she
 * is today. Computed from engine/uncertainty.ts, never drawn by hand.
 */

import { useId } from "react";
import { floorBand } from "@/engine/uncertainty";
import type { CostInputs } from "@/engine/cost";
import { useWidth } from "@/lib/use-width";
import { inr } from "@/lib/format";
import { ChartFrame } from "./chart-frame";

const H = 150;
const PAD_L = 46;
const PAD_R = 12;
const PAD_T = 10;
const PAD_B = 28;
const N_MAX = 300;

export function FloorRangeChart({ inputs, n, codShare, k, confidence }: { inputs: CostInputs; n: number; codShare: number; k?: number; confidence?: number }) {
  const id = useId();
  const { ref, width } = useWidth(520);
  const W = Math.max(280, width);

  const ns = Array.from({ length: 31 }, (_, i) => (i * N_MAX) / 30);
  const bands = ns.map((x) => floorBand(inputs, x, codShare, confidence, k).value);
  const now = floorBand(inputs, Math.min(n, N_MAX), codShare, confidence, k).value;
  const floor = now.floor;
  const lo = Math.min(...bands.map((b) => b.low));
  const hi = Math.max(...bands.map((b) => b.high));

  const x = (v: number) => PAD_L + (v / N_MAX) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - (v - lo) / Math.max(hi - lo, 1));
  const area = [...bands.map((b, i) => `${i ? "L" : "M"}${x(ns[i] ?? 0)},${y(b.high)}`), ...[...bands].reverse().map((b, i) => `L${x(ns[bands.length - 1 - i] ?? 0)},${y(b.low)}`), "Z"].join(" ");

  return (
    <ChartFrame
      title="How sure we are of your floor"
      titleHi="सुरक्षा दाम कितना पक्का"
      description={`At ${n} own orders your floor is ${inr(now.low)} to ${inr(now.high)}; it narrows as orders arrive.`}
      tableRows={[0, 30, 90, 270].map((v) => {
        const b = floorBand(inputs, v, codShare, confidence, k).value;
        return { label: `${v} own orders`, value: `${inr(b.low)} – ${inr(b.high)}` };
      })}
      tableHeaders={["Your orders", "Floor range"]}
    >
      <div ref={ref}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-labelledby={id}>
          <title id={id}>Floor range narrowing from {inr(bands[0]?.low ?? 0)}–{inr(bands[0]?.high ?? 0)} with more orders</title>
          <path d={area} fill="var(--info)" fillOpacity="0.14" />
          <line x1={PAD_L} x2={W - PAD_R} y1={y(floor)} y2={y(floor)} stroke="var(--info)" strokeWidth="1.5" />
          {[lo, floor, hi].map((v) => (
            <text key={v} x={PAD_L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-subtle)">{inr(v)}</text>
          ))}
          {[0, 30, 90, 270].map((v) => (
            <text key={v} x={x(v)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-subtle)">{v}</text>
          ))}
          <line x1={x(Math.min(n, N_MAX))} x2={x(Math.min(n, N_MAX))} y1={y(now.high)} y2={y(now.low)} stroke="var(--text)" strokeWidth="2" />
          <circle cx={x(Math.min(n, N_MAX))} cy={y(floor)} r="4.5" fill="var(--text)" stroke="var(--surface)" strokeWidth="2" />
        </svg>
      </div>
      <p className="type-caption mt-1 text-[var(--text-subtle)]">Own delivered orders →. The dark bar is you today.</p>
    </ChartFrame>
  );
}
