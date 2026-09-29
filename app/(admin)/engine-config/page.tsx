"use client";

/**
 * A1 · Engine configuration.
 *
 * The seven cost-model inputs, their defaults and their sources. Changing one
 * shows a live blast radius — "this moves the floor for N listings by an
 * average of ₹X" — which is COMPUTED by re-running the cost model over every
 * listing in the world, not stated. Changes require confirmation and are
 * audited, because changing a cost model changes what sellers are told about
 * their own businesses.
 */

import { useMemo, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { useWorld } from "@/lib/use-seller";
import { useAudit } from "@/lib/audit";
import { costInputsFor } from "@/engine/clock";
import { survivalPrice } from "@/engine/cost";
import { Page, PageHeader } from "@/components/shared/page-header";
import {
  AD_SPEND_RATE_DEFAULT,
  GST_ON_FEES,
  PACKAGING_COST_DEFAULT,
  RETURN_WRITEDOWN,
  REVERSE_FREIGHT_MULTIPLIER,
  RTO_BY_COD,
} from "@/engine/constants";
import { inr, count, pct } from "@/lib/format";
import type { World } from "@/engine/types";

type ConfigKey =
  | "returnWritedown"
  | "gstOnFees"
  | "reverseFreightMultiplier"
  | "adSpendRate"
  | "packaging"
  | "codRto"
  | "prepaidRto";

type ConfigField = {
  key: ConfigKey;
  label: string;
  labelHi: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  source: string;
  kind: "benchmark" | "assumption";
};

const FIELDS: ConfigField[] = [
  {
    key: "returnWritedown",
    label: "Write-down on returned goods",
    labelHi: "वापस आए माल पर नुकसान",
    value: RETURN_WRITEDOWN,
    min: 0,
    max: 0.4,
    step: 0.01,
    format: (v) => pct(v, 0),
    source: "Seller-reported range is 10-20%. We use 15%.",
    kind: "assumption",
  },
  {
    key: "gstOnFees",
    label: "GST on platform fees",
    labelHi: "फीस पर जीएसटी",
    value: GST_ON_FEES,
    min: 0,
    max: 0.28,
    step: 0.01,
    format: (v) => pct(v, 0),
    source: "Statutory 18% on services. Changing this is a tax assumption, not a lever.",
    kind: "benchmark",
  },
  {
    key: "reverseFreightMultiplier",
    label: "Return shipping vs forward",
    labelHi: "वापसी का भाड़ा",
    value: REVERSE_FREIGHT_MULTIPLIER,
    min: 1,
    max: 1.6,
    step: 0.01,
    format: (v) => `${v.toFixed(2)}×`,
    source: "Reverse legs cost more: customer-address pickup and repeat attempts.",
    kind: "assumption",
  },
  {
    key: "adSpendRate",
    label: "Default ad spend",
    labelHi: "विज्ञापन का डिफ़ॉल्ट",
    value: AD_SPEND_RATE_DEFAULT,
    min: 0,
    max: 0.15,
    step: 0.005,
    format: (v) => pct(v),
    source: "Mid-range for an actively promoted listing. Enters the floor's denominator.",
    kind: "assumption",
  },
  {
    key: "packaging",
    label: "Default packaging cost",
    labelHi: "पैकिंग की लागत",
    value: PACKAGING_COST_DEFAULT,
    min: 0,
    max: 30,
    step: 1,
    format: (v) => inr(v),
    source: "Polybag, tape and label per parcel.",
    kind: "assumption",
  },
  {
    key: "codRto",
    label: "Refusal rate on cash-on-delivery",
    labelHi: "कैश ऑर्डर पर मना",
    value: RTO_BY_COD.cod,
    min: 0.05,
    max: 0.45,
    step: 0.01,
    format: (v) => pct(v, 0),
    source: "GoKwik India RTO report (2023): ~26% across 180M+ shoppers.",
    kind: "benchmark",
  },
  {
    key: "prepaidRto",
    label: "Refusal rate on prepaid",
    labelHi: "पहले भुगतान पर मना",
    value: RTO_BY_COD.prepaid,
    min: 0,
    max: 0.12,
    step: 0.005,
    format: (v) => pct(v),
    source: "GoKwik: prepaid RTO is under 2%.",
    kind: "benchmark",
  },
];

/**
 * Re-run the cost model over every listing under the proposed settings.
 * This is what makes the blast radius a fact rather than a claim.
 */
function blastRadius(world: World, overrides: Partial<Record<ConfigKey, number>>) {
  let moved = 0;
  let totalDelta = 0;
  let newlyBelowFloor = 0;
  let newlyAboveFloor = 0;

  for (const listing of world.listings) {
    const seller = world.sellers.find((s) => s.id === listing.sellerId);
    if (!seller) continue;

    const base = costInputsFor(listing, seller);
    const before = survivalPrice(base).value;

    const codRto = overrides.codRto ?? RTO_BY_COD.cod;
    const prepaidRto = overrides.prepaidRto ?? RTO_BY_COD.prepaid;
    const rto =
      (seller.codShare * codRto + (1 - seller.codShare) * prepaidRto) * RTO_BY_COD.dampening;

    const after = survivalPrice({
      ...base,
      rtoRate: rto,
      returnWritedown: overrides.returnWritedown ?? RETURN_WRITEDOWN,
      gstOnFees: overrides.gstOnFees ?? GST_ON_FEES,
      reverseFreight:
        base.forwardFreight * (overrides.reverseFreightMultiplier ?? REVERSE_FREIGHT_MULTIPLIER),
      adSpendRate: overrides.adSpendRate ?? base.adSpendRate,
      packaging: overrides.packaging ?? base.packaging,
    }).value;

    if (Math.abs(after - before) > 0.005) {
      moved += 1;
      totalDelta += after - before;
      if (listing.price >= before && listing.price < after) newlyBelowFloor += 1;
      if (listing.price < before && listing.price >= after) newlyAboveFloor += 1;
    }
  }

  return {
    moved,
    averageDelta: moved > 0 ? totalDelta / moved : 0,
    newlyBelowFloor,
    newlyAboveFloor,
  };
}

export default function EngineConfigPage() {
  const { world, status, error } = useWorld();
  const audit = useAudit();

  const [draft, setDraft] = useState<Partial<Record<ConfigKey, number>>>({});
  const [confirming, setConfirming] = useState(false);
  const [applied, setApplied] = useState<string | null>(null);

  const dirty = Object.keys(draft).length > 0;

  const radius = useMemo(
    () => (world && dirty ? blastRadius(world, draft) : null),
    [world, draft, dirty],
  );

  const radiusText = radius
    ? `Moves the floor for ${count(radius.moved)} listings by an average of ${inr(Math.abs(radius.averageDelta), 2)}${radius.averageDelta >= 0 ? " upward" : " downward"}`
    : "";

  const apply = () => {
    if (!radius) return;
    const changed = FIELDS.filter((f) => draft[f.key] !== undefined);
    audit({
      capability: "admin.engineConfig",
      action: "Changed the cost model",
      subject: changed.map((f) => f.label).join(", "),
      before: changed.map((f) => `${f.label}: ${f.format(f.value)}`).join("; "),
      after: changed.map((f) => `${f.label}: ${f.format(draft[f.key] as number)}`).join("; "),
      blastRadius: `${radiusText}. ${count(radius.newlyBelowFloor)} listings newly below floor, ${count(radius.newlyAboveFloor)} newly above.`,
    });
    setApplied(radiusText);
    setConfirming(false);
    setDraft({});
  };

  return (
    <Page>
      <PageHeader
        title="Engine configuration"
        description={<>The inputs behind every survival price. Changing one changes what sellers are told about their own businesses, so every change shows its blast radius and is written to the audit log.</>}
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {applied ? (
          <Card className="mb-4 flex items-start gap-2 border-[var(--success)]/30 bg-[var(--success-bg)] p-3">
            <Check size={15} aria-hidden className="mt-0.5 shrink-0 text-[var(--success)]" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[var(--text)]">Configuration applied</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{applied}</p>
            </div>
            <button
              type="button"
              onClick={() => setApplied(null)}
              className="text-[12px] text-[var(--text-muted)] hover:underline"
            >
              Dismiss
            </button>
          </Card>
        ) : null}

        {radius ? (
          <Card tone="warning" className="sticky top-16 z-20 mb-4 p-4 shadow-[var(--shadow-pop)]">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--warning)]" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--text)]">Blast radius</p>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                  {radiusText}.
                </p>
                {radius.newlyBelowFloor > 0 || radius.newlyAboveFloor > 0 ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    <strong className="text-[var(--danger)]">
                      {count(radius.newlyBelowFloor)}
                    </strong>{" "}
                    listings would be newly told they are below their floor;{" "}
                    <strong className="text-[var(--success)]">
                      {count(radius.newlyAboveFloor)}
                    </strong>{" "}
                    would be newly told they are safe.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {confirming ? (
                <>
                  <Button variant="primary" onClick={apply}>
                    Yes, apply to {count(radius.moved)} listings
                  </Button>
                  <Button variant="ghost" onClick={() => setConfirming(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => setConfirming(true)}>
                    Apply these changes
                  </Button>
                  <Button variant="ghost" onClick={() => setDraft({})}>
                    Reset
                  </Button>
                </>
              )}
            </div>
          </Card>
        ) : null}

        <div className="space-y-4">
          {FIELDS.map((f) => (
            <Card key={f.key} className="p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <StatusChip tone={f.kind === "benchmark" ? "success" : "warning"}>
                  {f.kind === "benchmark" ? "Published benchmark" : "Our assumption"}
                </StatusChip>
              </div>
              <Slider
                label={f.label}
                labelHi={f.labelHi}
                value={draft[f.key] ?? f.value}
                ghost={f.value}
                min={f.min}
                max={f.max}
                step={f.step}
                format={f.format}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                help={<p className="text-[11px] leading-relaxed text-[var(--text-subtle)]">{f.source}</p>}
              />
            </Card>
          ))}
        </div>

        <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-subtle)]">
          These sliders show what a change would do. In this prototype they do not persist to the
          engine defaults — the blast radius, the confirmation and the audit entry are the parts
          worth demonstrating, and all three are real.
        </p>
      </StateGate>
    </Page>
  );
}
