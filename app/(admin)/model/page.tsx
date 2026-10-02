"use client";

/**
 * A8 · Model settings.
 *
 * The settings that change what every seller is told: the band margin m, the
 * credibility constant K, the confidence of the floor range, and the regime
 * thresholds. Each draft shows a computed blast radius, applying requires a
 * confirmation, and every change is written to the audit log.
 */

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Page, PageHeader } from "@/components/shared/page-header";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { useWorld } from "@/lib/use-seller";
import { useConfigStore } from "@/lib/store/config-store";
import { useAudit } from "@/lib/audit";
import { marginBlast, rangeBlast, regimeBlast } from "@/lib/blast";
import { count, inr, pct } from "@/lib/format";

export default function ModelSettingsPage() {
  const { world, status, error } = useWorld();
  const cfg = useConfigStore();
  const audit = useAudit();

  const [margin, setMargin] = useState(cfg.margin);
  const [k, setK] = useState(cfg.credibilityK);
  const [confidence, setConfidence] = useState(cfg.bandConfidence);
  const [crowdedAt, setCrowdedAt] = useState(cfg.regime.crowdedAt);
  const [dispersedAt, setDispersedAt] = useState(cfg.regime.dispersedAt);
  const [confirming, setConfirming] = useState(false);

  const draftRegime = { ...cfg.regime, crowdedAt, dispersedAt };
  const dirty = margin !== cfg.margin || k !== cfg.credibilityK || confidence !== cfg.bandConfidence || crowdedAt !== cfg.regime.crowdedAt || dispersedAt !== cfg.regime.dispersedAt;

  const blast = useMemo(() => {
    if (!world || !dirty) return null;
    const m = marginBlast(world, cfg.margin, margin);
    const before = rangeBlast(world, cfg.credibilityK, cfg.bandConfidence);
    const after = rangeBlast(world, k, confidence);
    const r = regimeBlast(world, cfg.regime, draftRegime);
    return { m, before, after, r };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, dirty, margin, k, confidence, crowdedAt, dispersedAt]);

  const summary = blast
    ? `Launch verdict changes for ${count(blast.m.changed)} listings (${count(blast.m.newlyNoBand)} newly DON'T LIST); ${count(blast.after.shown)} listings would show a floor range (was ${count(blast.before.shown)}), average range ${inr(blast.after.avgWidth)} (was ${inr(blast.before.avgWidth)}); ${count(blast.r.changed)} of ${blast.r.total} designs change regime.`
    : "";

  const apply = () => {
    audit({
      capability: "admin.modelSettings",
      action: "Changed model settings",
      subject: "Band margin, credibility, range confidence, regime thresholds",
      before: `m ${pct(cfg.margin)}, K ${cfg.credibilityK}, confidence ${pct(cfg.bandConfidence, 0)}, crowded at ${cfg.regime.crowdedAt}, dispersed at ${pct(cfg.regime.dispersedAt)}`,
      after: `m ${pct(margin)}, K ${k}, confidence ${pct(confidence, 0)}, crowded at ${crowdedAt}, dispersed at ${pct(dispersedAt)}`,
      blastRadius: summary,
    });
    cfg.set({ margin, credibilityK: k, bandConfidence: confidence, regime: draftRegime });
    setConfirming(false);
  };

  const reset = () => {
    setMargin(cfg.margin); setK(cfg.credibilityK); setConfidence(cfg.bandConfidence);
    setCrowdedAt(cfg.regime.crowdedAt); setDispersedAt(cfg.regime.dispersedAt);
  };

  return (
    <Page>
      <PageHeader title="Model settings" description="These change what every seller is told. Each draft shows its blast radius before it is applied, and every change is audited." />
      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {blast ? (
          <Card tone="warning" className="sticky top-16 z-20 mb-4 p-4 shadow-[var(--shadow-pop)]">
            <div className="flex gap-2">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--warning)]" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text)]">Blast radius</p>
                <p className="type-small mt-1 text-[var(--text-muted)]">{summary}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {confirming ? (
                <>
                  <Button variant="primary" onClick={apply}>Yes, apply for every seller</Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setConfirming(true)}>Apply these settings</Button>
                  <Button variant="ghost" onClick={reset}>Reset</Button>
                </>
              )}
            </div>
          </Card>
        ) : null}

        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <CardHead title="The band" description="Band = [floor × (1 + m), ceiling]. The width then picks DON'T LIST / DIFFERENTIATE / launch at profit-max / PRICE FOR MARGIN." />
            <Slider className="mt-4" label="Safety margin above break-even (m)" labelHi="सुरक्षा गुंजाइश" value={margin} ghost={cfg.margin} min={0} max={0.1} step={0.005} format={(v) => pct(v)} onChange={setMargin} />
          </Card>
          <Card className="p-4 sm:p-5">
            <CardHead title="Day-zero data" description="Own data is blended with the prior as (n·own + K·prior) ÷ (n + K); the floor shows as a range while n < K." />
            <Slider className="mt-4" label="Credibility constant (K)" labelHi="भरोसे का स्थिरांक" value={k} ghost={cfg.credibilityK} min={5} max={100} step={1} format={(v) => String(v)} onChange={setK} />
            <Slider className="mt-4" label="Floor range confidence" labelHi="सीमा का भरोसा" value={confidence} ghost={cfg.bandConfidence} min={0.5} max={0.95} step={0.05} format={(v) => pct(v, 0)} onChange={setConfidence} />
          </Card>
          <Card className="p-4 sm:p-5">
            <CardHead title="Market regimes" description="Credible rivals (4.0★+, ≥ 2.5% of orders) × price spread decide RED OCEAN / CONTESTED / NICHE / NEW-THIN, and with them each design's pricing tempo." />
            <Slider className="mt-4" label="Crowded at this many credible rivals" labelHi="भीड़ की सीमा" value={crowdedAt} ghost={cfg.regime.crowdedAt} min={4} max={20} step={1} format={(v) => String(v)} onChange={setCrowdedAt} />
            <Slider className="mt-4" label="Prices dispersed at this spread (CV)" labelHi="दामों का फैलाव" value={dispersedAt} ghost={cfg.regime.dispersedAt} min={0.01} max={0.08} step={0.005} format={(v) => pct(v)} onChange={setDispersedAt} />
          </Card>
        </div>
      </StateGate>
    </Page>
  );
}
