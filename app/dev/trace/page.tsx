"use client";

/**
 * The Phase 4 gate.
 *
 * Renders a survival price whose drawer shows the full derivation, plus every
 * shared component in each of its states. This is an internal page — it exists
 * so the primitives can be checked in isolation before screens depend on them.
 */

import { useState } from "react";
import { classifyBand } from "@/engine/band";
import { contributionPerOrder, survivalPrice, type CostInputs } from "@/engine/cost";
import { buildWaterfall } from "@/engine/waterfall";
import { daamScore } from "@/engine/score";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoneyValue, TraceLink } from "@/components/shared/money-value";
import { BandChip, ScoreChip, StageChip, StatusChip } from "@/components/shared/status-chip";
import { MetricCard } from "@/components/shared/metric-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import type { BandVerdict, LifecycleStage } from "@/engine/types";
import { inr } from "@/lib/format";

const CASE_1: CostInputs = {
  cogs: 180,
  rtoRate: 0.17,
  returnRate: 0.2,
  adSpendRate: 0.05,
  forwardFreight: 65,
  reverseFreight: 153,
  packaging: 8,
};

const CASE_2: CostInputs = { ...CASE_1, cogs: 158, rtoRate: 0.12, returnRate: 0.13 };
const CEILING = 352;

type Row = { id: string; name: string; price: number; floor: number; verdict: BandVerdict };

export default function TraceDevPage() {
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");

  const floor1 = survivalPrice(CASE_1);
  const floor2 = survivalPrice(CASE_2);
  const contribution = contributionPerOrder(334, CASE_2);
  const waterfall = buildWaterfall(305, CASE_1);
  const band1 = classifyBand(floor1.value, CEILING, 305);
  const band2 = classifyBand(floor2.value, CEILING, 334);
  const score = daamScore({
    band: band2.value,
    contributionPerOrder: contribution.value,
    visibilityGate: 0.86,
    daysSincePriceChange: 12,
  });

  /** Re-solve with one assumption moved, for the drawer's sensitivity row. */
  const probe = (key: string, multiplier: number): number | null => {
    if (key === "recovery")
      return survivalPrice({ ...CASE_1, recovery: 1 - 0.17 * multiplier }).value;
    if (key === "gstOnFees") return survivalPrice({ ...CASE_1, gstOnFees: 0.18 * multiplier }).value;
    return null;
  };

  const rows: Row[] = [
    { id: "a", name: "Cotton Straight Kurti", price: 334, floor: floor2.value, verdict: band2.value.verdict },
    { id: "b", name: "Embroidered Anarkali", price: 305, floor: floor1.value, verdict: band1.value.verdict },
    { id: "c", name: "Rayon Printed Kurti", price: 289, floor: floor2.value, verdict: "BELOW_FLOOR" },
  ];

  const columns: Column<Row>[] = [
    { key: "name", header: "Listing", render: (r) => r.name, sortValue: (r) => r.name },
    {
      key: "price",
      header: "Price",
      numeric: true,
      sortValue: (r) => r.price,
      render: (r) => inr(r.price),
    },
    {
      key: "floor",
      header: "Survival price",
      headerHi: "सुरक्षा दाम",
      numeric: true,
      sortValue: (r) => r.floor,
      render: (r) => (
        <MoneyValue
          value={r.floor}
          traced={r.id === "b" ? floor1 : floor2}
          label="Survival price"
          labelHi="सुरक्षा दाम"
          size="sm"
        />
      ),
    },
    { key: "verdict", header: "Band", render: (r) => <BandChip verdict={r.verdict} /> },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
      <header className="mb-5">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          Dev
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Trace system</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
          Every figure below is computed by the engine and carries its own derivation. Tap any
          underlined number to open the drawer and read the maths behind it, line by line.
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">The two reference cases</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Survival price · case 1"
            labelHi="सुरक्षा दाम"
            tone="danger"
            value={
              <MoneyValue
                value={floor1.value}
                traced={floor1}
                label="Survival price — COGS ₹180, RTO 17%, returns 20%"
                labelHi="सुरक्षा दाम"
                size="xl"
                onProbe={probe}
              />
            }
            caption="Below this price, every parcel shipped costs money."
          />
          <MetricCard
            label="Survival price · case 2"
            labelHi="सुरक्षा दाम"
            value={
              <MoneyValue
                value={floor2.value}
                traced={floor2}
                label="Survival price — COGS ₹158, RTO 12%, returns 13%"
                labelHi="सुरक्षा दाम"
                size="xl"
              />
            }
            caption="Lower cost and fewer refusals open a band."
          />
          <MetricCard
            label="You earn, per parcel shipped"
            labelHi="हर पार्सल पर कमाई"
            tone="success"
            value={
              <MoneyValue
                value={contribution.value}
                traced={contribution}
                label="Contribution per dispatched order at ₹334"
                labelHi="हर पार्सल पर कमाई"
                size="xl"
                tone="auto"
              />
            }
            caption="Counted across every parcel, not only the ones that pay."
          />
          <MetricCard
            label="What actually reaches you"
            labelHi="सच में क्या मिला"
            tone="danger"
            value={
              <MoneyValue
                value={waterfall.value.reality}
                traced={{ value: waterfall.value.reality, trace: waterfall.trace, assumptions: waterfall.assumptions }}
                label="Reality per parcel at ₹305"
                labelHi="सच में क्या मिला"
                size="xl"
                tone="auto"
              />
            }
            caption={`She believes she earns ${inr(waterfall.value.believed)}. The gap is ${inr(waterfall.value.gap)}.`}
            footer={
              <TraceLink
                traced={{ value: waterfall.value.gap, trace: waterfall.trace, assumptions: waterfall.assumptions }}
                label="The gap between belief and reality"
                labelHi="अंतर"
              />
            }
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">Chips, in every state</h2>
        <Card className="flex flex-wrap items-center gap-2 p-4">
          {(["BELOW_FLOOR", "THIN", "HEALTHY", "ABOVE_GATE", "NO_BAND"] as BandVerdict[]).map((v) => (
            <BandChip key={v} verdict={v} />
          ))}
          {(["S0_LIST", "S1_DISCOVER", "S2_CLIMB", "S3_HARVEST", "S4_DEFEND", "S5_EXIT"] as LifecycleStage[]).map(
            (s) => (
              <StageChip key={s} stage={s} />
            ),
          )}
          <ScoreChip score={score.value} />
          <ScoreChip score={34} />
          <ScoreChip score={58} />
          <StatusChip tone="info">Audited access</StatusChip>
        </Card>
        <p className="mt-2 text-[12px] text-[var(--text-subtle)]">
          The Daam Score above ({score.value}) is computed, not chosen —{" "}
          <TraceLink traced={score} label="Daam Score" labelHi="दाम स्कोर" className="inline" />
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">Table</h2>
        <DataTable
          rows={rows}
          columns={columns}
          getRowKey={(r) => r.id}
          emptyTitle="Nothing here yet"
          emptyDescription="Add your first listing and it will appear here."
          caption="Reference listings with their survival prices"
        />
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-[var(--text)]">Loading, empty and error</h2>
        <div className="mb-3 flex gap-2">
          {(["ready", "loading", "error"] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "primary" : "secondary"}
              onClick={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <StateGate
          status={status}
          error="The settlement file for this month has not arrived yet."
          skeleton={
            <div className="space-y-2">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          }
        >
          <EmptyState
            title="Nothing is below its floor today"
            description="Every listing in your catalogue is priced above what it costs you to ship. Check back after your next settlement."
            tone="success"
          />
        </StateGate>
      </section>
    </div>
  );
}
