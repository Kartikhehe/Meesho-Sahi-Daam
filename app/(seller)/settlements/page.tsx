"use client";

/**
 * S7 · Settlement Explorer — the truth-teller.
 *
 * Order by order, every deduction between the sale and the bank. The summary
 * band at the top is the sentence a seller would read out to a sceptical
 * family member: "of 100 parcels I shipped, 66 paid me, and here is where the
 * rest of the money went."
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { StatusChip } from "@/components/shared/status-chip";
import { useSeller } from "@/lib/use-seller";
import { ordersFor, settlementsFor, summariseSettlements } from "@/lib/selectors";
import { inr, count, formatDateShort, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SettlementLine, OrderOutcome } from "@/engine/types";

type Filter = "all" | "delivered" | "rto" | "returned";

const FILTERS: { key: Filter; label: string; labelHi: string }[] = [
  { key: "all", label: "All parcels", labelHi: "सब पार्सल" },
  { key: "delivered", label: "Paid you", labelHi: "पैसा मिला" },
  { key: "rto", label: "Refused", labelHi: "मना किया" },
  { key: "returned", label: "Returned", labelHi: "वापस आया" },
];

const OUTCOME_COPY: Record<OrderOutcome, { label: string; labelHi: string; tone: "success" | "danger" | "warning" }> = {
  delivered: { label: "Paid", labelHi: "पैसा मिला", tone: "success" },
  rto: { label: "Refused", labelHi: "मना किया", tone: "danger" },
  returned: { label: "Returned", labelHi: "वापस आया", tone: "warning" },
};

export default function SettlementsPage() {
  const { world, seller, status, error } = useSeller();
  const [filter, setFilter] = useState<Filter>("all");

  const settlements = useMemo(
    () => (world && seller ? settlementsFor(world, seller.id, 30) : []),
    [world, seller],
  );
  const orders = useMemo(
    () => (world && seller ? ordersFor(world, seller.id, 30) : []),
    [world, seller],
  );
  const summary = useMemo(() => summariseSettlements(settlements, orders), [settlements, orders]);

  const rows = useMemo(
    () => (filter === "all" ? settlements : settlements.filter((s) => s.outcome === filter)),
    [settlements, filter],
  );

  const listingName = (id: string) => world?.listings.find((l) => l.id === id)?.name ?? id;

  const columns: Column<SettlementLine>[] = [
    {
      key: "day",
      header: "Shipped",
      headerHi: "भेजा",
      sortValue: (s) => s.dispatchedDay,
      render: (s) => (
        <div>
          <p className="tabular text-[var(--text)]">{formatDateShort(s.dispatchedDay)}</p>
          <p className="text-[11px] text-[var(--text-subtle)]">
            paid {formatDateShort(s.creditedDay)}
          </p>
        </div>
      ),
    },
    {
      key: "listing",
      header: "Listing",
      headerHi: "सामान",
      sortValue: (s) => listingName(s.listingId),
      render: (s) => (
        <Link href={`/sku/${s.listingId}`} className="truncate hover:underline">
          {listingName(s.listingId)}
        </Link>
      ),
    },
    {
      key: "outcome",
      header: "What happened",
      sortValue: (s) => s.outcome,
      render: (s) => (
        <StatusChip tone={OUTCOME_COPY[s.outcome].tone}>
          <span className="hi">{OUTCOME_COPY[s.outcome].labelHi}</span>
        </StatusChip>
      ),
    },
    {
      key: "sale",
      header: "Sale",
      headerHi: "बिक्री",
      numeric: true,
      sortValue: (s) => s.saleValue,
      render: (s) => (s.saleValue > 0 ? inr(s.saleValue) : <span className="text-[var(--text-subtle)]">—</span>),
    },
    {
      key: "freight",
      header: "Shipping",
      numeric: true,
      hideOnMobile: true,
      sortValue: (s) => s.forwardFreight - s.forwardFreightReversed + s.reverseFreight,
      render: (s) => (
        <span className="text-[var(--danger)]">
          −{inr(s.forwardFreight - s.forwardFreightReversed + s.reverseFreight, 2)}
        </span>
      ),
    },
    {
      key: "ads",
      header: "Ads",
      numeric: true,
      hideOnMobile: true,
      sortValue: (s) => s.adCost,
      render: (s) => <span className="text-[var(--danger)]">−{inr(s.adCost, 2)}</span>,
    },
    {
      key: "gst",
      header: "GST",
      numeric: true,
      hideOnMobile: true,
      sortValue: (s) => s.gstOnFees,
      render: (s) => <span className="text-[var(--danger)]">−{inr(s.gstOnFees, 2)}</span>,
    },
    {
      key: "net",
      header: "Reached you",
      headerHi: "आपको मिला",
      numeric: true,
      sortValue: (s) => s.netCredit,
      render: (s) => (
        <span className={cn("font-medium", s.netCredit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
          {inr(s.netCredit, 2)}
        </span>
      ),
    },
  ];

  const paidPct = summary.dispatched > 0 ? summary.paid / summary.dispatched : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-6">
      <header className="mb-4">
        <h1 className="hi text-2xl font-semibold text-[var(--text)]">पैसा मिला</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Settlement explorer — every parcel you shipped in the last 30 days, and what it paid
        </p>
      </header>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {settlements.length === 0 ? (
          <EmptyState
            title="No parcels shipped in the last 30 days"
            description="Once orders start moving, every one of them will appear here with each deduction shown separately."
          />
        ) : (
          <>
            <Card className="mb-4 p-5">
              <p className="text-base leading-relaxed text-[var(--text)]">
                Of the{" "}
                <strong className="tabular">{count(summary.dispatched)}</strong> parcels you shipped
                last month,{" "}
                <strong className="tabular text-[var(--success)]">{count(summary.paid)}</strong>{" "}
                paid you — that is {pct(paidPct, 0)}. Here is where the rest of the money went.
              </p>

              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Sales that stuck", inr(summary.grossSales), "success"],
                  ["Shipping, both ways", `−${inr(summary.forwardFreight + summary.reverseFreight)}`, "danger"],
                  ["Ads", `−${inr(summary.adCost)}`, "danger"],
                  ["GST on fees", `−${inr(summary.gst)}`, "danger"],
                  ["Packaging", `−${inr(summary.packaging)}`, "danger"],
                  ["Reached your bank", inr(summary.netCredited), summary.netCredited >= 0 ? "success" : "danger"],
                ].map(([label, value, tone]) => (
                  <div key={label as string}>
                    <dt className="text-[12px] text-[var(--text-subtle)]">{label}</dt>
                    <dd
                      className={cn(
                        "tabular mt-0.5 text-sm font-semibold",
                        tone === "success" ? "text-[var(--success)]" : "text-[var(--danger)]",
                      )}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 border-t border-[var(--border)] pt-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Money reaches you about 15 days after you ship. That delay is why a problem can run
                for two or three weeks before it shows up in your bank.
              </p>
            </Card>

            <div className="mb-3 flex flex-wrap gap-2">
              {FILTERS.map((f) => {
                const n =
                  f.key === "all"
                    ? settlements.length
                    : settlements.filter((s) => s.outcome === f.key).length;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "rounded-[var(--radius-chip)] border px-3 py-1.5 text-[12px] font-medium",
                      filter === f.key
                        ? "border-[var(--brand-magenta)] bg-[var(--brand-magenta-50)] text-[var(--text)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]",
                    )}
                  >
                    <span className="hi">{f.labelHi}</span>
                    <span className="tabular ml-1.5 text-[var(--text-subtle)]">{n}</span>
                  </button>
                );
              })}
            </div>

            <DataTable
              rows={rows.slice(0, 300)}
              columns={columns}
              getRowKey={(s) => s.orderId}
              initialSort={{ key: "day", direction: "desc" }}
              emptyTitle="No parcels match this filter"
              emptyDescription="Try another filter to see the rest of your parcels."
              caption="Settlement lines for the last 30 days"
            />

            {rows.length > 300 ? (
              <p className="mt-2 text-[12px] text-[var(--text-subtle)]">
                Showing the 300 most recent of {count(rows.length)} parcels.
              </p>
            ) : null}
          </>
        )}
      </StateGate>
    </div>
  );
}
