"use client";

/**
 * M5 · Intervention queue.
 *
 * Sellers the tool alone cannot help. Each row carries a reason code, because
 * "call this seller" without a reason produces a call that wastes both
 * people's time. The queue deliberately excludes sellers a price change would
 * fix — those get an alert, not a phone call.
 */

import { useMemo } from "react";
import Link from "next/link";
import { PhoneCall } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { useWorld } from "@/lib/use-seller";
import { cohortHealth, clusterHealth, type SellerHealth } from "@/lib/cohort";
import { analyseSeller } from "@/lib/selectors";
import { inr, count, pct } from "@/lib/format";
import type { World } from "@/engine/types";
import { Page, PageHeader } from "@/components/shared/page-header";

type ReasonCode =
  | "STRUCTURAL_NO_BAND"
  | "CHURN_IMMINENT"
  | "CATALOGUE_WIDE_LOSS"
  | "NEVER_ENGAGED";

const REASONS: Record<
  ReasonCode,
  { label: string; tone: "danger" | "warning" | "neutral"; script: string }
> = {
  STRUCTURAL_NO_BAND: {
    label: "No viable band",
    tone: "danger",
    script:
      "Most of her catalogue sits in designs where cost to serve already exceeds what buyers pay. Pricing advice cannot help. Talk about sourcing, packaging weight, or moving her into a different design entirely.",
  },
  CHURN_IMMINENT: {
    label: "Weeks from stopping",
    tone: "danger",
    script:
      "Losing money fast enough that she will likely stop trading within a quarter. Call before she goes quiet — a seller who leaves rarely comes back.",
  },
  CATALOGUE_WIDE_LOSS: {
    label: "Losing across the catalogue",
    tone: "warning",
    script:
      "Not one bad listing but a pricing habit applied everywhere. One conversation about how she sets prices is worth more than eighty alerts.",
  },
  NEVER_ENGAGED: {
    label: "Never opened an alert",
    tone: "neutral",
    script:
      "She is getting alerts and not acting on them. Worth finding out whether they reach her at all, and in which language.",
  },
};

type QueueRow = { health: SellerHealth; reasons: ReasonCode[] };

function buildQueue(world: World, health: SellerHealth[]): QueueRow[] {
  const clusters = clusterHealth(world);
  const brokenClusters = new Set(
    clusters.filter((c) => c.structurallyBroken).map((c) => c.clusterId),
  );

  return health
    .map((h) => {
      const reasons: ReasonCode[] = [];
      const analyses = analyseSeller(world, h.seller.id);

      const inBroken = analyses.filter((a) => brokenClusters.has(a.listing.clusterId)).length;
      if (analyses.length > 0 && inBroken / analyses.length > 0.4) {
        reasons.push("STRUCTURAL_NO_BAND");
      }
      if (h.weeksToChurn !== null && h.weeksToChurn <= 13) reasons.push("CHURN_IMMINENT");
      if (h.monthlyContribution < 0 && h.belowFloorShare > 0.35) {
        reasons.push("CATALOGUE_WIDE_LOSS");
      }
      if (h.adoption === "aware") reasons.push("NEVER_ENGAGED");

      return { health: h, reasons };
    })
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => a.health.monthlyContribution - b.health.monthlyContribution);
}

export default function QueuePage() {
  const { world, status, error } = useWorld();
  const health = useMemo(() => (world ? cohortHealth(world) : []), [world]);
  const queue = useMemo(() => (world ? buildQueue(world, health) : []), [world, health]);

  return (
    <Page>
      <PageHeader
        title="Intervention queue"
        description={<>Sellers a price recommendation cannot help. These need a person.</>}
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-80 w-full" />}>
        {world ? <StructuralDesigns world={world} /> : null}
        {queue.length === 0 ? (
          <EmptyState
            tone="success"
            title="Nobody needs a call right now"
            description="Every seller in this cohort is either healthy or has a problem the tool can fix on its own. This list fills up when that stops being true."
          />
        ) : (
          <ul className="space-y-3">
            {queue.map(({ health: h, reasons }) => (
              <li key={h.seller.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-semibold text-[var(--text)]">
                        {h.seller.businessName}
                      </h2>
                      <p className="text-[12px] text-[var(--text-subtle)]">
                        {h.seller.name} · {h.seller.city} · {count(h.listingCount)} listings ·{" "}
                        {pct(h.belowFloorShare, 0)} below floor
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-semibold text-[var(--danger)]">
                      {inr(h.monthlyContribution)}/mo
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {reasons.map((r) => (
                      <StatusChip key={r} tone={REASONS[r].tone}>
                        {REASONS[r].label}
                      </StatusChip>
                    ))}
                    {h.weeksToChurn !== null ? (
                      <StatusChip tone="neutral">~{h.weeksToChurn} weeks left</StatusChip>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {reasons.map((r) => (
                      <p
                        key={r}
                        className="rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-muted)]"
                      >
                        <strong className="text-[var(--text)]">{REASONS[r].label}:</strong>{" "}
                        {REASONS[r].script}
                      </p>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary">
                      <PhoneCall size={13} aria-hidden />
                      Mark as called
                    </Button>
                    <Link href={`/sellers?focus=${h.seller.id}`}>
                      <Button size="sm" variant="ghost">
                        Open her catalogue (audited)
                      </Button>
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </StateGate>
    </Page>
  );
}

/** Designs where the median seller has no viable band — routed here because no price fixes them. */
function StructuralDesigns({ world }: { world: World }) {
  const broken = clusterHealth(world).filter((c) => c.structurallyBroken);
  if (!broken.length) return null;
  return (
    <Card className="mb-4 p-4">
      <h2 className="type-h3 text-[var(--text)]">Designs with no viable band — {count(broken.length)}</h2>
      <p className="type-small mt-1 text-[var(--text-muted)]">
        Reason code <strong>STRUCTURAL COST</strong>: the median seller&rsquo;s cost to serve already exceeds what buyers pay to find
        these designs. That is a freight, returns or ad-load problem for the marketplace, not a pricing one for the seller.
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {broken.slice(0, 16).map((c) => (
          <li key={c.clusterId}><StatusChip tone="danger" dot={false}>{c.name} · {inr(c.medianBandWidth)}</StatusChip></li>
        ))}
      </ul>
    </Card>
  );
}
