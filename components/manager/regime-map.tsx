"use client";

/**
 * The 2×2 regime map: every design placed by credible-rival crowding and price
 * spread, with the regime it falls in. The quadrant counts are the regime
 * distribution; the dots show how close each design sits to a line.
 */

import { Card, CardHead } from "@/components/ui/card";
import { REGIME_TEMPO, classifyRegime, regimeSignals, type Regime, type RegimeThresholds } from "@/engine/regime";
import type { World } from "@/engine/types";
import { pct } from "@/lib/format";

const QUADS: { r: Regime; pos: string; tone: string }[] = [
  { r: "RED_OCEAN", pos: "col-start-1 row-start-1", tone: "bg-[var(--danger-bg)]" },
  { r: "CONTESTED", pos: "col-start-2 row-start-1", tone: "bg-[var(--warning-bg)]" },
  { r: "NEW_THIN", pos: "col-start-1 row-start-2", tone: "bg-[var(--info-bg)]" },
  { r: "NICHE", pos: "col-start-2 row-start-2", tone: "bg-[var(--success-bg)]" },
];

export function RegimeMap({ world, thresholds }: { world: World; thresholds: RegimeThresholds }) {
  const rows = world.clusters.map((c) => {
    const rivals = world.competitors.filter((x) => x.clusterId === c.id);
    return { c, ...regimeSignals(rivals, thresholds), regime: classifyRegime(rivals, thresholds, world.clusterRegimes?.[c.id]).value };
  });
  const maxCred = Math.max(thresholds.crowdedAt * 2, ...rows.map((r) => r.credible));
  const maxCv = Math.max(thresholds.dispersedAt * 2, ...rows.map((r) => r.cv));

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <CardHead title="Market regimes across the category" description={`Crowded at ${thresholds.crowdedAt}+ credible rivals; dispersed at a ${pct(thresholds.dispersedAt)} price spread. Each regime sets its own pricing tempo.`} />
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-2 grid-rows-2 gap-2">
          {QUADS.map((q) => {
            const n = rows.filter((r) => r.regime === q.r).length;
            const t = REGIME_TEMPO[q.r];
            return (
              <div key={q.r} className={`${q.pos} ${q.tone} rounded-[var(--radius-input)] p-3`}>
                <p className="text-[13px] font-semibold text-[var(--text)]">{t.label}</p>
                <p className="tabular text-[22px] font-semibold text-[var(--text)]">{n}</p>
                <p className="text-[11.5px] leading-snug text-[var(--text-muted)]">ladder ±{Math.round(t.ladder * 100)}% · +{Math.round(t.harvestStep * 100)}% every {t.harvestDays} d</p>
              </div>
            );
          })}
        </div>
        <div>
          <svg viewBox="0 0 300 220" className="w-full" role="img" aria-label="Designs by credible rivals and price spread">
            <rect x="30" y="10" width="260" height="180" fill="var(--surface-sunken)" rx="6" />
            <line x1={30 + (thresholds.dispersedAt / maxCv) * 260} x2={30 + (thresholds.dispersedAt / maxCv) * 260} y1="10" y2="190" stroke="var(--border-strong)" strokeDasharray="4 3" />
            <line x1="30" x2="290" y1={190 - (thresholds.crowdedAt / maxCred) * 180} y2={190 - (thresholds.crowdedAt / maxCred) * 180} stroke="var(--border-strong)" strokeDasharray="4 3" />
            {rows.map((r) => (
              <circle key={r.c.id} cx={30 + (r.cv / maxCv) * 260} cy={190 - (r.credible / maxCred) * 180} r="3.5" fill={r.regime === "RED_OCEAN" ? "var(--danger)" : r.regime === "CONTESTED" ? "var(--warning)" : r.regime === "NICHE" ? "var(--success)" : "var(--info)"} opacity="0.8">
                <title>{`${r.c.name}: ${r.credible} credible rivals, ${pct(r.cv)} spread`}</title>
              </circle>
            ))}
            <text x="160" y="214" textAnchor="middle" fontSize="11" fill="var(--text-subtle)">price spread →</text>
            <text x="12" y="100" textAnchor="middle" fontSize="11" fill="var(--text-subtle)" transform="rotate(-90 12 100)">credible rivals →</text>
          </svg>
        </div>
      </div>
    </Card>
  );
}
