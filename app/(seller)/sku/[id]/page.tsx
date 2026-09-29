"use client";

/**
 * S3 · SKU detail — the signature screen.
 *
 * Five tabs: Price (the Daam Meter), Cost (the waterfall), Market (the
 * cluster), History (what actually happened), Experiment (the price ladder).
 * The tab lives in the URL hash so a deep link from an alert or from Story
 * Mode can land on exactly the right one.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Skeleton, StateGate, EmptyState } from "@/components/shared/empty-state";
import { BandChip, ScoreChip, StageChip } from "@/components/shared/status-chip";
import { ProductTile } from "@/components/shared/product-tile";
import { Amount } from "@/components/shared/amount";
import { Page } from "@/components/shared/page-header";
import { PriceTab } from "@/components/sku/price-tab";
import { CostTab } from "@/components/sku/cost-tab";
import { MarketTab } from "@/components/sku/market-tab";
import { HistoryTab } from "@/components/sku/history-tab";
import { ExperimentTab } from "@/components/sku/experiment-tab";
import { useListing } from "@/lib/use-seller";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "price", label: "Price", labelHi: "दाम" },
  { key: "cost", label: "Cost", labelHi: "लागत" },
  { key: "market", label: "Market", labelHi: "बाज़ार" },
  { key: "history", label: "History", labelHi: "इतिहास" },
  { key: "experiment", label: "Experiment", labelHi: "जाँच" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SkuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { world, analysis, status, error } = useListing(id);
  const [tab, setTab] = useState<TabKey>("price");

  /**
   * The tab lives in the hash, so deep links — from an alert, or from Story
   * Mode — land on the tab they mean to. This also listens for later hash
   * changes: a client-side navigation from #price to #market keeps the same
   * component mounted, so reading the hash only on mount would leave the tab
   * stuck on whichever one loaded first.
   */
  useEffect(() => {
    const syncFromHash = () => {
      const fromHash = window.location.hash.replace("#", "") as TabKey;
      if (TABS.some((t) => t.key === fromHash)) setTab(fromHash);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const select = (key: TabKey) => {
    setTab(key);
    window.history.replaceState(null, "", `#${key}`);
  };

  return (
    <Page>
      <Link
        href="/catalogue"
        className="-ml-1.5 inline-flex min-h-9 items-center gap-1 rounded-md px-1.5 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ChevronLeft size={15} aria-hidden />
        <span className="hi">मेरा सामान</span>
        <span className="text-[var(--text-subtle)]">· My catalogue</span>
      </Link>

      <StateGate
        status={status}
        error={error}
        skeleton={
          <div className="mt-3 space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        {!analysis || !world ? (
          <EmptyState
            title="This listing could not be found"
            description="It may have been removed, or the link may be out of date. Go back to your catalogue to pick another."
          />
        ) : (
          <>
            <header className="mb-5 mt-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                  <ProductTile
                    category={analysis.listing.category}
                    colour={analysis.listing.attributes.colourFamily}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <h1 className="type-h1 text-[var(--text)]">{analysis.listing.name}</h1>
                    <p className="type-caption mt-1 text-[var(--text-subtle)]">
                      {analysis.listing.category.replace(/-/g, " ")} · {analysis.listing.weightGrams}g ·{" "}
                      {analysis.listing.rating.toFixed(1)}★ · {analysis.listing.id}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <BandChip verdict={analysis.band.value.verdict} lang="hi" />
                      <StageChip stage={analysis.listing.stage} />
                      <ScoreChip score={analysis.score.value} showLabel />
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 pl-[70px] sm:flex-col sm:items-end sm:gap-0.5 sm:pl-0">
                  <Amount value={analysis.listing.price} size="figure" />
                  <span className="hi type-caption text-[var(--text-subtle)]">आज का दाम · today</span>
                </div>
              </div>
            </header>

            <div
              role="tablist"
              aria-label="Listing detail"
              className="scroll-quiet -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-[var(--border)] px-4 sm:mx-0 sm:px-0"
            >
              {TABS.map((t, i) => (
                <button
                  key={t.key}
                  role="tab"
                  id={`tab-${t.key}`}
                  aria-controls="sku-tabpanel"
                  aria-selected={tab === t.key}
                  // Roving tabindex: the tablist is one stop, arrows move within it.
                  tabIndex={tab === t.key ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                    e.preventDefault();
                    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
                    const target = TABS[next];
                    if (!target) return;
                    select(target.key);
                    document.getElementById(`tab-${target.key}`)?.focus();
                  }}
                  onClick={() => select(t.key)}
                  className={cn(
                    "-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[14px] transition-colors",
                    tab === t.key
                      ? "border-[var(--brand-magenta)] font-semibold text-[var(--text)]"
                      : "border-transparent font-medium text-[var(--text-muted)] hover:text-[var(--text)]",
                  )}
                >
                  <span className="hi">{t.labelHi}</span>
                  <span className="hidden text-[12px] font-normal text-[var(--text-subtle)] sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            <div role="tabpanel" id="sku-tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
              {tab === "price" ? <PriceTab analysis={analysis} /> : null}
              {tab === "cost" ? <CostTab analysis={analysis} /> : null}
              {tab === "market" ? <MarketTab analysis={analysis} world={world} /> : null}
              {tab === "history" ? <HistoryTab analysis={analysis} world={world} /> : null}
              {tab === "experiment" ? (
                <ExperimentTab
                  analysis={analysis}
                  experiment={world.experiments.find((e) => e.listingId === analysis.listing.id)}
                />
              ) : null}
            </div>
          </>
        )}
      </StateGate>
    </Page>
  );
}
