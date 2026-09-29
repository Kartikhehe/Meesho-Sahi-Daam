"use client";

/**
 * M2 · Sellers, ranked by risk.
 *
 * The list is aggregate health. Opening a seller is a deliberate act with a
 * privacy cost, so it shows a visible "audited access" banner and writes an
 * audit entry — and the drill-in is read-only.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, ShieldAlert, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusChip, BandChip } from "@/components/shared/status-chip";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { MoneyValue } from "@/components/shared/money-value";
import { useWorld } from "@/lib/use-seller";
import { useAudit } from "@/lib/audit";
import { cohortHealth, type SellerHealth } from "@/lib/cohort";
import { analyseSeller } from "@/lib/selectors";
import { inr, count, pct, formatDateShort } from "@/lib/format";
import { Page, PageHeader } from "@/components/shared/page-header";

const ADOPTION_COPY = {
  active: { label: "Acting on alerts", tone: "success" as const },
  aware: { label: "Getting alerts", tone: "warning" as const },
  untouched: { label: "Not reached yet", tone: "neutral" as const },
};

function SellersInner() {
  const params = useSearchParams();
  const { world, status, error } = useWorld();
  const audit = useAudit();
  const [focusId, setFocusId] = useState<string | null>(params.get("focus"));

  const health = useMemo(() => (world ? cohortHealth(world) : []), [world]);
  const focused = health.find((h) => h.seller.id === focusId) ?? null;

  /**
   * Opening a seller's detail is the audited event.
   *
   * This keys on the RESOLVED seller, not on `focusId`: when the page is
   * deep-linked with ?focus=, the id is set before the world has finished
   * loading, so `focused` is still null on the first run and the entry would
   * be silently dropped. `auditedRef` keeps it to one entry per seller opened.
   */
  const auditedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focused || auditedRef.current === focused.seller.id) return;
    auditedRef.current = focused.seller.id;
    audit({
      capability: "manager.drillIntoSeller",
      action: "Opened a seller's cost detail",
      subject: `${focused.seller.businessName} (${focused.seller.id})`,
      blastRadius: `${count(focused.listingCount)} listings visible for this support case`,
    });
  }, [focused, audit]);

  // Reset the guard when the drill-in is closed, so re-opening audits again.
  useEffect(() => {
    if (!focusId) auditedRef.current = null;
  }, [focusId]);

  const columns: Column<SellerHealth>[] = [
    {
      key: "name",
      header: "Seller",
      sortValue: (h) => h.seller.businessName,
      render: (h) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-[var(--text)]">{h.seller.businessName}</p>
          <p className="text-[11px] text-[var(--text-subtle)]">
            {h.seller.name} · {h.seller.city}
          </p>
        </div>
      ),
    },
    {
      key: "archetype",
      header: "How they price",
      sortValue: (h) => h.archetype,
      render: (h) => (
        <StatusChip tone="neutral" title="Derived from their actual pricing behaviour, not assigned">
          {h.archetype.replace(/-/g, " ")}
        </StatusChip>
      ),
    },
    {
      key: "below",
      header: "Below floor",
      numeric: true,
      sortValue: (h) => h.belowFloorShare,
      render: (h) => (
        <span className={h.belowFloorShare > 0.3 ? "text-[var(--danger)]" : ""}>
          {count(h.belowFloorCount + h.noBandCount)}
          <span className="text-[var(--text-subtle)]"> / {count(h.listingCount)}</span>
        </span>
      ),
    },
    {
      key: "bleed",
      header: "Per month",
      numeric: true,
      sortValue: (h) => h.monthlyContribution,
      render: (h) => (
        <span
          className={`font-medium ${h.monthlyContribution >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
        >
          {inr(h.monthlyContribution)}
        </span>
      ),
    },
    {
      key: "churn",
      header: "Weeks to churn",
      numeric: true,
      hideOnMobile: true,
      sortValue: (h) => h.weeksToChurn ?? 999,
      render: (h) =>
        h.weeksToChurn === null ? (
          <span className="text-[var(--text-subtle)]">—</span>
        ) : (
          <span className={h.weeksToChurn < 12 ? "text-[var(--danger)]" : ""}>
            ~{h.weeksToChurn}
          </span>
        ),
    },
    {
      key: "adoption",
      header: "Tool use",
      hideOnMobile: true,
      sortValue: (h) => h.adoption,
      render: (h) => (
        <StatusChip tone={ADOPTION_COPY[h.adoption].tone}>{ADOPTION_COPY[h.adoption].label}</StatusChip>
      ),
    },
    {
      key: "active",
      header: "Last active",
      numeric: true,
      hideOnMobile: true,
      sortValue: (h) => h.lastActiveDay,
      render: (h) => formatDateShort(h.lastActiveDay),
    },
    {
      key: "open",
      header: "",
      render: (h) => (
        <Button size="sm" variant="ghost" onClick={() => setFocusId(h.seller.id)}>
          <Eye size={13} aria-hidden />
          Open
        </Button>
      ),
    },
  ];

  return (
    <Page width="wide">
      <PageHeader
        title="Sellers"
        description={<>Ranked by risk. Opening a seller shows her cost detail for a support case, and is written to the audit log.</>}
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {focused && world ? (
          <SellerDrillIn health={focused} world={world} onClose={() => setFocusId(null)} />
        ) : (
          <DataTable
            rows={health}
            columns={columns}
            getRowKey={(h) => h.seller.id}
            onRowClick={(h) => setFocusId(h.seller.id)}
            initialSort={{ key: "bleed", direction: "asc" }}
            emptyTitle="No sellers in this cohort"
            emptyDescription="Sellers appear here once they are onboarded into your category."
            caption="Sellers ranked by monthly contribution"
          />
        )}
      </StateGate>
    </Page>
  );
}

function SellerDrillIn({
  health,
  world,
  onClose,
}: {
  health: SellerHealth;
  world: NonNullable<ReturnType<typeof useWorld>["world"]>;
  onClose: () => void;
}) {
  const analyses = useMemo(() => analyseSeller(world, health.seller.id), [world, health.seller.id]);
  const worst = [...analyses].sort((a, b) => a.monthlyRisk - b.monthlyRisk).slice(0, 8);

  return (
    <div>
      <Card className="mb-4 flex flex-wrap items-center gap-3 border-[var(--warning)]/40 bg-[var(--warning-bg)] p-3">
        <ShieldAlert size={16} aria-hidden className="shrink-0 text-[var(--warning)]" />
        <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--text)]">
          <strong>Audited access.</strong> You are viewing one seller&rsquo;s cost detail for a
          support case. This has been recorded in the audit log with your role and the time. It is
          read-only — you cannot change her prices.
        </p>
        <Button size="sm" variant="secondary" onClick={onClose}>
          <X size={13} aria-hidden />
          Close
        </Button>
      </Card>

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">
              {health.seller.businessName}
            </h2>
            <p className="text-[12px] text-[var(--text-subtle)]">
              {health.seller.name} · {health.seller.city} ·{" "}
              {health.seller.treatment === "treated" ? "treated" : "control"} group
            </p>
          </div>
          <StatusChip tone="neutral">{health.archetype.replace(/-/g, " ")}</StatusChip>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4">
          {[
            ["Listings", count(health.listingCount)],
            ["Below their floor", `${count(health.belowFloorCount + health.noBandCount)} (${pct(health.belowFloorShare, 0)})`],
            ["Per month", inr(health.monthlyContribution)],
            ["Orders, 30 days", count(health.ordersLast30)],
            ["Average Daam Score", String(health.averageScore)],
            ["Cash on delivery", pct(health.seller.codShare, 0)],
            ["Ad spend", pct(health.seller.adSpendRate)],
            ["Weeks to churn", health.weeksToChurn ? `~${health.weeksToChurn}` : "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] text-[var(--text-subtle)]">{label}</dt>
              <dd className="tabular mt-0.5 text-sm font-medium text-[var(--text)]">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="p-4">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">
          Her worst listings, and why
        </h3>
        <ul className="mt-3 space-y-2">
          {worst.map((a) => (
            <li
              key={a.listing.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[var(--text)]">{a.listing.name}</p>
                <p className="text-[11px] text-[var(--text-subtle)]">
                  priced {inr(a.listing.price)} · floor{" "}
                  <MoneyValue
                    value={a.floor.value}
                    traced={a.floor}
                    label={`Survival price — ${a.listing.name}`}
                    labelHi="सुरक्षा दाम"
                    size="sm"
                  />{" "}
                  · ceiling {inr(a.ceiling.value)}
                </p>
              </div>
              <BandChip verdict={a.band.value.verdict} />
              <span className="tabular shrink-0 text-[13px] font-medium text-[var(--danger)]">
                {inr(a.monthlyRisk)}/mo
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-3 text-[12px] text-[var(--text-subtle)]">
        Every drill-in appears in the{" "}
        <Link href="/audit" className="text-[var(--brand-magenta)] hover:underline">
          audit log
        </Link>
        .
      </p>
    </div>
  );
}

export default function SellersPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <SellersInner />
    </Suspense>
  );
}
