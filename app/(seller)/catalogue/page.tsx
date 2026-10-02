"use client";

/**
 * S2 · My Catalogue.
 *
 * Dense and fast: every listing with its Daam Score, floor, ceiling, band
 * position and what it earns per order. Filters, sort, and a bulk "apply
 * suggested price" that never moves a price below the seller's own floor.
 */

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FilterPills } from "@/components/shared/filter-pills";
import { PageHeader, Page } from "@/components/shared/page-header";
import { ProductTile } from "@/components/shared/product-tile";
import { CatalogueCard } from "@/components/catalogue/catalogue-card";
import { MoneyValue } from "@/components/shared/money-value";
import { BandChip, RegimeChip, ScoreChip, StageChip } from "@/components/shared/status-chip";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { useSeller } from "@/lib/use-seller";
import { useWorldStore } from "@/lib/store/world-store";
import type { ListingAnalysis } from "@/lib/selectors";
import { inr, count } from "@/lib/format";

type Filter = "all" | "below-floor" | "no-band" | "above-gate" | "healthy";

const FILTERS: { key: Filter; label: string; labelHi: string }[] = [
  { key: "all", label: "All", labelHi: "सब" },
  { key: "below-floor", label: "Below floor", labelHi: "सुरक्षा दाम से नीचे" },
  { key: "no-band", label: "No viable price", labelHi: "कोई सही दाम नहीं" },
  { key: "above-gate", label: "Not being seen", labelHi: "दिख नहीं रहे" },
  { key: "healthy", label: "Healthy", labelHi: "ठीक" },
];

function matches(a: ListingAnalysis, filter: Filter): boolean {
  const v = a.band.value.verdict;
  switch (filter) {
    case "below-floor":
      return v === "BELOW_FLOOR";
    case "no-band":
      return v === "NO_BAND";
    case "above-gate":
      return v === "ABOVE_GATE";
    case "healthy":
      return v === "HEALTHY" || v === "THIN";
    default:
      return true;
  }
}

function CatalogueInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { analyses, summary, status, error } = useSeller();
  const setPrice = useWorldStore((s) => s.setPrice);

  const [filter, setFilter] = useState<Filter>((params.get("filter") as Filter) ?? "all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState(0);

  const rows = useMemo(() => analyses.filter((a) => matches(a, filter)), [analyses, filter]);

  /** Only listings with a viable band can take a suggestion. */
  const applicable = useMemo(
    () => rows.filter((a) => selected.has(a.listing.id) && a.band.value.recommended > 0),
    [rows, selected],
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applySuggested = () => {
    for (const a of applicable) setPrice(a.listing.id, a.band.value.recommended);
    setApplied(applicable.length);
    setSelected(new Set());
  };

  const columns: Column<ListingAnalysis>[] = [
    {
      key: "select",
      header: "",
      width: "36px",
      render: (a) => (
        <input
          type="checkbox"
          checked={selected.has(a.listing.id)}
          onChange={() => toggle(a.listing.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${a.listing.name}`}
          className="h-4 w-4 accent-[var(--brand-magenta)]"
        />
      ),
    },
    {
      key: "name",
      header: "Listing",
      headerHi: "सामान",
      sortValue: (a) => a.listing.name,
      render: (a) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductTile category={a.listing.category} colour={a.listing.attributes.colourFamily} />
          <div className="min-w-0">
            <p className="max-w-[240px] truncate font-medium text-[var(--text)]">{a.listing.name}</p>
            <p className="text-[12px] text-[var(--text-subtle)]">{a.listing.category.replace(/-/g, " ")}</p>
          </div>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      headerHi: "दाम",
      numeric: true,
      sortValue: (a) => a.listing.price,
      render: (a) => <span className="font-medium">{inr(a.listing.price)}</span>,
    },
    {
      key: "floor",
      header: "Survival price",
      headerHi: "सुरक्षा दाम",
      numeric: true,
      sortValue: (a) => a.floor.value,
      render: (a) => (
        <MoneyValue
          value={a.floor.value}
          traced={a.floor}
          label={`Survival price — ${a.listing.name}`}
          labelHi="सुरक्षा दाम"
          size="sm"
        />
      ),
    },
    {
      key: "ceiling",
      header: "Ceiling",
      headerHi: "सीमा",
      numeric: true,
      hideOnMobile: true,
      sortValue: (a) => a.ceiling.value,
      render: (a) => (
        <MoneyValue
          value={a.ceiling.value}
          traced={a.ceiling}
          label={`Visibility ceiling — ${a.listing.name}`}
          labelHi="दिखने की सीमा"
          size="sm"
        />
      ),
    },
    {
      key: "band",
      header: "Band",
      sortValue: (a) => a.band.value.verdict,
      render: (a) => <BandChip verdict={a.band.value.verdict} lang="hi" />,
    },
    {
      key: "perOrder",
      header: "Per order",
      headerHi: "हर ऑर्डर",
      numeric: true,
      sortValue: (a) => a.contribution.value,
      render: (a) => (
        <MoneyValue
          value={a.contribution.value}
          traced={a.contribution}
          label={`What you earn per parcel — ${a.listing.name}`}
          labelHi="हर पार्सल पर"
          size="sm"
          tone="auto"
        />
      ),
    },
    {
      key: "orders",
      header: "30d orders",
      numeric: true,
      hideOnMobile: true,
      sortValue: (a) => a.ordersLast30,
      render: (a) => count(a.ordersLast30),
    },
    {
      key: "score",
      header: "Score",
      headerHi: "स्कोर",
      numeric: true,
      sortValue: (a) => a.score.value,
      render: (a) => <ScoreChip score={a.score.value} />,
    },
    {
      key: "regime",
      header: "Market",
      hideOnMobile: true,
      sortValue: (a) => a.regime.value,
      render: (a) => <RegimeChip regime={a.regime.value} />,
    },
    {
      key: "stage",
      header: "Stage",
      hideOnMobile: true,
      sortValue: (a) => a.listing.stage,
      render: (a) => <StageChip stage={a.listing.stage} />,
    },
  ];

  return (
    <Page width="wide">
      <PageHeader
        titleHi="मेरा सामान"
        title="My catalogue"
        description={`${count(summary.listingCount)} listings — ${count(summary.belowFloorCount + summary.noBandCount)} are priced below what they cost you to ship.`}
        actions={
          <Link href="/new-listing">
            <Button variant="secondary">
              <Plus size={16} aria-hidden />
              <span className="hi">नया सामान</span>
            </Button>
          </Link>
        }
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {analyses.length === 0 ? (
          <EmptyState
            title="Nothing listed yet"
            description="Your listings will appear here with their survival price, their ceiling, and what each one earns you per parcel."
          />
        ) : (
          <>
            <FilterPills
              className="mb-4"
              label="Filter listings"
              value={filter}
              onChange={(key) => {
                setFilter(key);
                router.replace(key === "all" ? "/catalogue" : `/catalogue?filter=${key}`);
              }}
              pills={FILTERS.map((f) => ({ ...f, count: analyses.filter((a) => matches(a, f.key)).length }))}
            />

            {selected.size > 0 ? (
              <Card className="mb-3 flex flex-wrap items-center gap-3 p-3">
                <span className="text-[13px] text-[var(--text)]">
                  {count(selected.size)} selected
                  {applicable.length < selected.size ? (
                    <span className="text-[var(--text-muted)]">
                      {" "}
                      · {count(selected.size - applicable.length)} have no viable price, so they are
                      left alone
                    </span>
                  ) : null}
                </span>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={applicable.length === 0}
                    onClick={applySuggested}
                  >
                    Apply suggested price to {count(applicable.length)}
                  </Button>
                </div>
              </Card>
            ) : null}

            {applied > 0 ? (
              <Card className="mb-3 flex items-center gap-2 border-[var(--success)]/30 bg-[var(--success-bg)] p-3">
                <Check size={15} aria-hidden className="text-[var(--success)]" />
                <p className="text-[13px] text-[var(--text)]">
                  Updated {count(applied)} prices. You can change any of them back at any time.
                </p>
                <button
                  type="button"
                  onClick={() => setApplied(0)}
                  className="ml-auto text-[12px] text-[var(--text-muted)] hover:underline"
                >
                  Dismiss
                </button>
              </Card>
            ) : null}

            <DataTable
              rows={rows}
              columns={columns}
              getRowKey={(a) => a.listing.id}
              onRowClick={(a) => router.push(`/sku/${a.listing.id}`)}
              initialSort={{ key: "perOrder", direction: "asc" }}
              emptyTitle="Nothing matches this filter"
              emptyDescription="Try another filter, or clear it to see your whole catalogue."
              caption="Your listings with their survival price, ceiling and what each earns"
              mobileCard={(a) => <CatalogueCard a={a} />}
            />
          </>
        )}
      </StateGate>
    </Page>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <CatalogueInner />
    </Suspense>
  );
}
