"use client";

/** Listing survival, treated against control, with 95% bands. */

import { useId } from "react";
import { ChartFrame } from "@/components/charts/chart-frame";
import { useWidth } from "@/lib/use-width";
import { listingSurvival, type SurvivalPoint } from "@/lib/survival";
import type { World } from "@/engine/types";
import { pct } from "@/lib/format";

const H = 220, PL = 40, PR = 12, PT = 10, PB = 28, HORIZON = 180;

export function SurvivalChart({ world }: { world: World }) {
  const id = useId();
  const { ref, width } = useWidth(560);
  const W = Math.max(280, width);
  const { treated, control, nTreated, nControl } = listingSurvival(world, HORIZON);
  const x = (t: number) => PL + (t / HORIZON) * (W - PL - PR);
  const y = (s: number) => PT + (1 - s) * (H - PT - PB);
  const step = (pts: SurvivalPoint[], key: "s" | "lo" | "hi") =>
    pts.map((p, i) => (i ? `H${x(p.t).toFixed(1)}V${y(p[key]).toFixed(1)}` : `M${x(p.t).toFixed(1)},${y(p[key]).toFixed(1)}`)).join("");
  const band = (pts: SurvivalPoint[]) => `${step(pts, "hi")} ${[...pts].reverse().map((p) => `L${x(p.t).toFixed(1)},${y(p.lo).toFixed(1)}`).join(" ")} Z`;
  const at90 = (pts: SurvivalPoint[]) => [...pts].reverse().find((p) => p.t <= 90)?.s ?? 1;

  return (
    <ChartFrame
      title="Listing survival — treated against control"
      description={`Share of listings still live after 90 days: treated ${pct(at90(treated), 0)}, control ${pct(at90(control), 0)}.`}
      tableRows={[30, 60, 90, 180].map((d) => ({ label: `${d} days`, value: `treated ${pct([...treated].reverse().find((p) => p.t <= d)?.s ?? 1, 0)} · control ${pct([...control].reverse().find((p) => p.t <= d)?.s ?? 1, 0)}` }))}
      tableHeaders={["After", "Still live"]}
      footer={<p className="type-caption text-[var(--text-subtle)]">Kaplan–Meier over {nTreated} treated and {nControl} control listings; shaded bands are 95% confidence. They overlap — at this size that is the honest read.</p>}
    >
      <div ref={ref}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-labelledby={id}>
          <title id={id}>Listing survival curves with confidence bands</title>
          {[0, 0.5, 1].map((v) => (
            <g key={v}><line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} stroke="var(--border)" /><text x={PL - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--text-subtle)">{pct(v, 0)}</text></g>
          ))}
          <path d={band(control)} fill="var(--neutral-data)" fillOpacity="0.15" />
          <path d={band(treated)} fill="var(--info)" fillOpacity="0.15" />
          <path d={step(control, "s")} fill="none" stroke="var(--neutral-data)" strokeWidth="2" strokeDasharray="5 3" />
          <path d={step(treated, "s")} fill="none" stroke="var(--info)" strokeWidth="2.5" />
          {[0, 90, 180].map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor={t === 0 ? "start" : t === 180 ? "end" : "middle"} fontSize="11" fill="var(--text-subtle)">{t} days</text>)}
        </svg>
      </div>
      <ul className="mt-2 flex gap-4 text-[12px] text-[var(--text-muted)]">
        <li className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded bg-[var(--info)]" /> Treated</li>
        <li className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-2 border-dashed border-[var(--neutral-data)]" /> Control</li>
      </ul>
    </ChartFrame>
  );
}
