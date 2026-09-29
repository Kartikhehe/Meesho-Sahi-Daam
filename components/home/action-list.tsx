"use client";

/**
 * "Do these three things" — one ranked list, not three identical cards.
 *
 * Each row answers, in order: which listing, what is wrong with it, what it
 * costs a month, and the one thing to do. The monthly cost is the biggest type
 * in the row because it is the reason the row is ranked where it is.
 */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/shared/amount";
import { MoneyValue } from "@/components/shared/money-value";
import { BandChip } from "@/components/shared/status-chip";
import { ProductTile } from "@/components/shared/product-tile";
import type { ListingAnalysis } from "@/lib/selectors";
import { count, inr } from "@/lib/format";

export function ActionList({ actions }: { actions: ListingAnalysis[] }) {
  return (
    <Card className="divide-y divide-[var(--border)] overflow-hidden">
      {actions.map((a, i) => {
        const losing = a.monthlyRisk < 0;
        const rec = a.band.value.recommended;
        return (
          <div key={a.listing.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="tabular mt-2.5 w-4 shrink-0 text-center text-[12px] font-semibold text-[var(--text-subtle)]">
                {i + 1}
              </span>
              <ProductTile category={a.listing.category} colour={a.listing.attributes.colourFamily} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/sku/${a.listing.id}`}
                    className="truncate text-[14px] font-semibold text-[var(--text)] hover:underline"
                  >
                    {a.listing.name}
                  </Link>
                  <BandChip verdict={a.band.value.verdict} lang="hi" />
                </div>
                <p className="type-small mt-1 text-[var(--text-muted)]">
                  {losing ? (
                    <>
                      Loses{" "}
                      <MoneyValue
                        value={Math.abs(a.contribution.value)}
                        traced={a.contribution}
                        label={`What each parcel of ${a.listing.name} costs you`}
                        labelHi="हर पार्सल पर"
                        size="sm"
                        tone="danger"
                      />{" "}
                      on every parcel · {count(a.ordersLast30)} orders last month · priced {inr(a.listing.price)}
                    </>
                  ) : (
                    <>
                      Above the ceiling of {inr(a.ceiling.value)}, so buyers are not finding it — {count(a.ordersLast30)}{" "}
                      orders last month
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pl-7 sm:justify-end sm:pl-0">
              <div className="text-left sm:text-right">
                <Amount value={losing ? a.monthlyRisk : 0} size="lg" tone={losing ? "danger" : "muted"} />
                <p className="text-[11px] text-[var(--text-subtle)]">{losing ? "a month" : "earning nothing"}</p>
              </div>
              <Link
                href={`/sku/${a.listing.id}`}
                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                {rec > 0 ? `We suggest ${inr(rec)}` : "See what would help"}
                <ChevronRight size={15} aria-hidden className="text-[var(--text-subtle)]" />
              </Link>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
