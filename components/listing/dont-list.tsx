"use client";

/**
 * DON'T LIST YET — the product's best idea, given its own file and its own
 * care. Names the gap as an equation, then the lever that moves the floor
 * most and whether it alone is enough. Never blocks: she can still list.
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Amount } from "@/components/shared/amount";
import { MoneyValue } from "@/components/shared/money-value";
import { VerdictShell, GapEquation } from "./verdict-shell";
import type { LeverAdvice } from "./levers";
import type { NewListingMarket } from "@/lib/new-listing-market";
import { inr } from "@/lib/format";

export function DontListBody({
  market,
  levers,
  plannedPrice,
  onBack,
  onList,
}: {
  market: NewListingMarket;
  levers: LeverAdvice[];
  plannedPrice?: number;
  onBack: () => void;
  onList: (price: number) => void;
}) {
  const floor = market.floor;
  const ceiling = market.ceiling.value;
  const gap = floor.value - ceiling;
  const top = levers[0];
  const anyCloses = levers.some((l) => l.closes);

  return (
    <VerdictShell tone="danger" verdictHi="अभी यह सामान मत डालें" verdict="Don't list this one yet — here is exactly why">
      {plannedPrice ? (
        <p className="type-small mb-3 text-[var(--text-muted)]">
          You were planning to list at <strong className="font-semibold text-[var(--text)]">{inr(plannedPrice)}</strong>.
          {plannedPrice > ceiling ? " Buyers would not find it there." : ""}
        </p>
      ) : null}
      <GapEquation
        items={[
          {
            labelHi: "आपकी लागत",
            label: "What it costs you to break even",
            value: <MoneyValue value={floor.value} traced={floor} label="What this listing costs you to serve" labelHi="सुरक्षा दाम" size="lg" />,
          },
          { labelHi: "ग्राहक यहाँ तक देखते हैं", label: "Where buyers stop looking", value: <Amount value={ceiling} size="lg" /> },
          { labelHi: "फ़ासला", label: "The gap", value: <Amount value={gap} size="lg" tone="danger" /> },
        ]}
      />

      <p className="type-body mt-4 text-[var(--text)]">
        This is not a pricing problem, so no price fixes it. List at a price buyers will see and you lose money on
        every parcel; list at a price that pays, and almost nobody sees it.
      </p>

      {top ? (
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          <p className="type-overline text-[var(--text-subtle)]">The lever that moves your floor most</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="hi text-[15px] font-semibold text-[var(--text)]">{top.leverHi}</p>
              <p className="type-caption text-[var(--text-muted)]">{top.lever}</p>
            </div>
            <p className="tabular flex items-baseline gap-2 text-[20px] font-semibold">
              <span className="text-[var(--text-muted)] line-through decoration-[1.5px]">{top.from}</span>
              <span aria-hidden className="text-[var(--text-subtle)]">→</span>
              <span className={top.closes ? "text-[var(--success)]" : "text-[var(--warning)]"}>{top.to}</span>
            </p>
          </div>
          <p className="type-small mt-2 text-[var(--text-muted)]">{top.detail}</p>

          <ul className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-3">
            {levers.slice(1).map((l) => (
              <li key={l.key} className="flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                <span className="text-[var(--text-muted)]">
                  <span className="hi">{l.leverHi}</span> · {l.lever}: {l.from} → {l.to}
                </span>
                <span className="tabular text-[var(--text-subtle)]">floor {inr(l.floorAfter)}</span>
              </li>
            ))}
          </ul>
          {!anyCloses ? (
            <p className="type-caption mt-3 text-[var(--text-muted)]">
              No single lever closes a gap this wide — it takes several together. The cost simulator shows the combination.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/unlock?preset=deck">
          <Button variant="primary">Show me what would open a band</Button>
        </Link>
        <Button variant="secondary" onClick={onBack}>Change my numbers</Button>
      </div>

      <p className="type-caption mt-4 border-t border-[var(--border)] pt-3 text-[var(--text-subtle)]">
        We will not stop you. If you want to go ahead anyway,{" "}
        <button type="button" onClick={() => onList(Math.round(ceiling))} className="link">
          list at {inr(Math.round(ceiling))}
        </button>{" "}
        — just go in knowing what each parcel will cost you.
      </p>
    </VerdictShell>
  );
}
