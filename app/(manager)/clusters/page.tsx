"use client";

/**
 * M3 · Category and cluster health.
 *
 * The screen carries one genuine supply-side insight: where the MEDIAN seller
 * has no viable band, the problem is not that sellers price badly. It is that
 * the cost to serve that design exceeds what buyers will pay to find it — a
 * marketplace cost-structure problem, which no amount of seller education
 * fixes.
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/shared/metric-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { useWorld } from "@/lib/use-seller";
import { clusterHealth, type ClusterHealth } from "@/lib/cohort";
import { inr, count, pct } from "@/lib/format";

export default function ClustersPage() {
  const { world, status, error } = useWorld();
  const clusters = useMemo(() => (world ? clusterHealth(world) : []), [world]);

  const broken = clusters.filter((c) => c.structurallyBroken);
  const brokenShare = clusters.length ? broken.length / clusters.length : 0;

  const columns: Column<ClusterHealth>[] = [
    {
      key: "name",
      header: "Design",
      sortValue: (c) => c.name,
      render: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--text)]">{c.name}</p>
          <p className="text-[11px] text-[var(--text-subtle)]">{c.category}</p>
        </div>
      ),
    },
    {
      key: "listings",
      header: "Listings",
      numeric: true,
      sortValue: (c) => c.listings,
      render: (c) => count(c.listings),
    },
    {
      key: "floor",
      header: "Median floor",
      numeric: true,
      sortValue: (c) => c.medianFloor,
      render: (c) => inr(c.medianFloor),
    },
    {
      key: "ceiling",
      header: "Ceiling",
      numeric: true,
      sortValue: (c) => c.ceiling,
      render: (c) => inr(c.ceiling),
    },
    {
      key: "width",
      header: "Room for the median seller",
      numeric: true,
      sortValue: (c) => c.medianBandWidth,
      render: (c) => (
        <span
          className={`font-medium ${c.medianBandWidth <= 0 ? "text-[var(--danger)]" : "text-[var(--success)]"}`}
        >
          {inr(c.medianBandWidth)}
        </span>
      ),
    },
    {
      key: "noband",
      header: "No viable price",
      numeric: true,
      hideOnMobile: true,
      sortValue: (c) => c.noBandShare,
      render: (c) => pct(c.noBandShare, 0),
    },
    {
      key: "verdict",
      header: "",
      render: (c) =>
        c.structurallyBroken ? (
          <StatusChip tone="danger" title="The median seller cannot make this design work at any price">
            Cost structure
          </StatusChip>
        ) : c.medianBandWidth < c.ceiling * 0.05 ? (
          <StatusChip tone="warning">Very tight</StatusChip>
        ) : (
          <StatusChip tone="success">Workable</StatusChip>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
      <header className="mb-4">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          M3
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">
          Category and cluster health
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Which designs a typical seller can actually make money on — and which ones no seller can
        </p>
      </header>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Designs where the median seller has no viable band"
            tone="danger"
            value={
              <span className="tabular text-[28px] font-semibold text-[var(--danger)]">
                {count(broken.length)}
                <span className="text-base font-normal text-[var(--text-subtle)]">
                  {" "}
                  / {count(clusters.length)}
                </span>
              </span>
            }
            caption={`${pct(brokenShare, 0)} of designs in this category`}
          />
          <MetricCard
            label="Listings sitting in those designs"
            value={
              <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                {count(broken.reduce((a, c) => a + c.listings, 0))}
              </span>
            }
            caption="No pricing advice helps these sellers"
          />
          <MetricCard
            label="Widest room available"
            tone="success"
            value={
              <span className="tabular text-[28px] font-semibold text-[var(--success)]">
                {inr(Math.max(...clusters.map((c) => c.medianBandWidth), 0))}
              </span>
            }
            caption="In the healthiest design in the category"
          />
        </div>

        {broken.length > 0 ? (
          <Card className="mb-4 border-l-[3px] border-l-[var(--danger)] p-4">
            <h2 className="text-[13px] font-semibold text-[var(--text)]">
              This is a cost-structure finding, not a seller-education one
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
              In {count(broken.length)} designs the median seller&rsquo;s cost to serve already sits
              above what buyers will pay to find her. Teaching those sellers to price better cannot
              work, because there is no price that works. What would move these is freight rates,
              return rates, or the ad load — levers the marketplace holds, not the seller.
            </p>
          </Card>
        ) : null}

        <DataTable
          rows={clusters}
          columns={columns}
          getRowKey={(c) => c.clusterId}
          initialSort={{ key: "width", direction: "asc" }}
          emptyTitle="No clusters to show"
          emptyDescription="Cluster health appears once sellers have listings in this category."
          caption="Design clusters ranked by how much room the median seller has"
        />
      </StateGate>
    </div>
  );
}
