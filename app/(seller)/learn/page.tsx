"use client";

/**
 * S8 · Learn — the glossary, Hindi first.
 *
 * Each term gets one plain sentence, why it costs her money, and her own
 * number beside it. Abstract definitions do not change behaviour; "your
 * refused-parcel rate is 17%" does.
 */

import { Card } from "@/components/ui/card";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { useSeller } from "@/lib/use-seller";
import { GLOSSARY, type GlossaryEntry } from "@/content/glossary";
import { GST_ON_FEES, ELASTICITY_BY_CATEGORY } from "@/engine/constants";
import { inr, pct } from "@/lib/format";
import type { ListingAnalysis } from "@/lib/selectors";

/** Her own figure for a term — averaged across her catalogue where needed. */
function yoursFor(entry: GlossaryEntry, analyses: ListingAnalysis[]): { value: string; note: string } | null {
  if (analyses.length === 0) return null;
  const avg = (f: (a: ListingAnalysis) => number) =>
    analyses.reduce((acc, a) => acc + f(a), 0) / analyses.length;

  switch (entry.yours) {
    case "rtoRate":
      return {
        value: pct(avg((a) => a.inputs.rtoRate)),
        note: "of your parcels are refused, based on how many of your orders are cash on delivery",
      };
    case "returnRate":
      return {
        value: pct(avg((a) => a.inputs.returnRate)),
        note: "of delivered parcels come back, averaged across the things you sell",
      };
    case "reverseFreight":
      return {
        value: inr(avg((a) => a.inputs.reverseFreight), 2),
        note: "is what it costs to bring one of your parcels back, on average",
      };
    case "gst":
      return {
        value: pct(GST_ON_FEES, 0),
        note: "on your shipping and ads — on a typical parcel of yours, about ₹14",
      };
    case "contribution": {
      const v = avg((a) => a.contribution.value);
      return {
        value: inr(v, 2),
        note: v >= 0 ? "is what an average parcel of yours earns you" : "is what an average parcel of yours costs you",
      };
    }
    case "floor":
      return {
        value: inr(avg((a) => a.floor.value)),
        note: "is your average survival price across your catalogue",
      };
    case "ceiling":
      return {
        value: inr(avg((a) => a.ceiling.value)),
        note: "is your average visibility ceiling across your catalogue",
      };
    case "elasticity": {
      const first = analyses[0];
      const e = first ? (ELASTICITY_BY_CATEGORY[first.listing.category] ?? 3) : 3;
      return {
        value: e.toFixed(1),
        note: `for ${first?.listing.category ?? "your category"} — higher means price matters more to buyers`,
      };
    }
    default:
      return null;
  }
}

export default function LearnPage() {
  const { analyses, status, error } = useSeller();

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 md:px-6">
      <header className="mb-5">
        <h1 className="hi text-2xl font-semibold text-[var(--text)]">सीखें</h1>
        <p className="text-sm text-[var(--text-muted)]">
          The words that decide whether a sale makes you money — each in one plain sentence, with
          your own numbers beside it
        </p>
      </header>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        <ul className="space-y-3">
          {GLOSSARY.map((entry) => {
            const yours = yoursFor(entry, analyses);
            return (
              <li key={entry.key}>
                <Card className="p-4">
                  <h2 className="hi text-base font-semibold text-[var(--text)]">{entry.termHi}</h2>
                  <p className="text-[12px] text-[var(--text-muted)]">{entry.term}</p>

                  <p className="hi mt-2.5 text-[14px] leading-relaxed text-[var(--text)]">
                    {entry.plainHi}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {entry.plain}
                  </p>

                  <p className="mt-2.5 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                    {entry.why}
                  </p>

                  {yours ? (
                    <p className="mt-2.5 flex flex-wrap items-baseline gap-2 border-t border-[var(--border)] pt-2.5">
                      <span className="hi text-[12px] font-medium text-[var(--text-subtle)]">
                        आपका आँकड़ा
                      </span>
                      <span className="tabular text-lg font-semibold text-[var(--text)]">
                        {yours.value}
                      </span>
                      <span className="text-[12px] text-[var(--text-muted)]">{yours.note}</span>
                    </p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      </StateGate>
    </div>
  );
}
