"use client";

/**
 * The verdict card — step 3 of the new-listing wizard.
 *
 * Three outcomes, designed with equal care:
 *   LIST            — here is your band and a launch price
 *   DIFFERENTIATE   — the band is under 5%; price alone will not win this
 *   DON'T LIST YET  — the floor is above the ceiling; name the lever and the
 *                     exact amount it must move
 *
 * The third is the product's best idea. No other pricing tool says it, because
 * saying "don't sell this" feels like failure — but it is the only honest
 * answer when the cost floor sits above the visibility ceiling, and it is the
 * one that saves a seller from three months of quiet losses.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/shared/amount";
import { VerdictShell, GapEquation } from "./verdict-shell";
import { Button } from "@/components/ui/button";
import { DaamMeter } from "@/components/charts/daam-meter";
import { MoneyValue } from "@/components/shared/money-value";
import { survivalPrice, type CostInputs } from "@/engine/cost";
import { RTO_BY_COD } from "@/engine/constants";
import type { Traced } from "@/engine/trace";
import type { BandAnalysis } from "@/engine/types";
import { inr, pct } from "@/lib/format";

export type Verdict = "LIST" | "DIFFERENTIATE" | "DONT_LIST";

export function verdictFor(band: BandAnalysis): Verdict {
  if (band.widthRupees <= 0) return "DONT_LIST";
  if (band.widthPct < 0.05) return "DIFFERENTIATE";
  return "LIST";
}

/**
 * How far one lever must move, on its own, to close the gap.
 *
 * Solved numerically rather than algebraically: the survival price is not
 * linear in any of these inputs (they appear in both the numerator and the
 * denominator), so we walk the lever until the floor clears the ceiling. That
 * also means the answer stays correct if the cost model changes.
 */
export function leverToClose(
  inputs: CostInputs,
  ceiling: number,
  codShare: number,
): { lever: string; leverHi: string; from: string; to: string; detail: string } | null {
  const target = ceiling * 0.97; // clear it with a little room, not exactly

  // Each lever is searched only within a move a seller could plausibly make.
  // Without these bounds the search happily reports "cut your cost of goods by
  // 94%", which is arithmetically true and useless as advice — and worse, it
  // dresses up an impossible gap as an actionable one. If nothing inside the
  // bounds closes the gap, we say so instead.
  const MAX_COGS_CUT = 0.35; // a third off is already a hard renegotiation
  const MIN_RETURN_RATE = 0.04;
  const MAX_RETURN_CUT = 0.12; // 12 percentage points is a very good year
  const MIN_COD_SHARE = 0.25;

  // 1. Cost of goods.
  const cogsFloor = inputs.cogs * (1 - MAX_COGS_CUT);
  for (let c = inputs.cogs; c >= cogsFloor; c -= 1) {
    if (survivalPrice({ ...inputs, cogs: c }).value <= target) {
      return {
        lever: "What your goods cost",
        leverHi: "माल की लागत",
        from: inr(inputs.cogs),
        to: inr(c),
        detail: `Buying this design ${inr(inputs.cogs - c)} cheaper is enough on its own — that is ${pct((inputs.cogs - c) / inputs.cogs, 0)} off what you pay your supplier.`,
      };
    }
  }

  // 2. Returns.
  const returnFloor = Math.max(MIN_RETURN_RATE, inputs.returnRate - MAX_RETURN_CUT);
  for (let r = inputs.returnRate; r >= returnFloor; r -= 0.005) {
    if (survivalPrice({ ...inputs, returnRate: r }).value <= target) {
      return {
        lever: "How often things come back",
        leverHi: "कितना सामान वापस आता है",
        from: pct(inputs.returnRate),
        to: pct(r),
        detail: `Getting returns down by ${pct(inputs.returnRate - r)} would do it on its own. A real size chart usually moves this by 3 to 6 points.`,
      };
    }
  }

  // 3. Cash on delivery share, which drives the refusal rate.
  for (let cod = codShare; cod >= MIN_COD_SHARE; cod -= 0.02) {
    const rto = (cod * RTO_BY_COD.cod + (1 - cod) * RTO_BY_COD.prepaid) * RTO_BY_COD.dampening;
    if (survivalPrice({ ...inputs, rtoRate: rto }).value <= target) {
      return {
        lever: "How many pay cash on delivery",
        leverHi: "कितने ग्राहक कैश पर लेते हैं",
        from: pct(codShare, 0),
        to: pct(cod, 0),
        detail: `Shifting ${pct(codShare - cod, 0)} of your buyers to paying in advance would be enough. A small prepaid discount is the usual way.`,
      };
    }
  }

  return null;
}

export function VerdictCard({
  band,
  floor,
  inputs,
  ceiling,
  codShare,
  onList,
  onBack,
}: {
  band: BandAnalysis;
  floor: Traced<number>;
  inputs: CostInputs;
  ceiling: number;
  codShare: number;
  onList: (price: number) => void;
  onBack: () => void;
}) {
  const verdict = verdictFor(band);

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <DaamMeter band={band} />
      </Card>

      {verdict === "LIST" ? (
        <VerdictShell tone="success" verdictHi="यह सामान डाल सकते हैं" verdict="You can list this — there is real room to work with">
          <p className="type-body text-[var(--text)]">
            Any price between{" "}
            <MoneyValue value={floor.value} traced={floor} label="Your survival price" labelHi="सुरक्षा दाम" size="md" />{" "}
            and <strong className="font-semibold">{inr(ceiling)}</strong> covers what it costs you to ship and still
            gets you found.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-4 py-3">
            <div>
              <p className="hi text-[12.5px] font-medium text-[var(--text-muted)]">सुझाया दाम · Launch at</p>
              <Amount value={band.recommended} size="figure" />
            </div>
            <p className="type-caption min-w-[12rem] flex-1 text-[var(--text-muted)]">
              Low enough to be seen while you have no reviews yet; high enough that a small cost change will not sink it.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onList(band.recommended)}>
              List at {inr(band.recommended)}
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Change my numbers
            </Button>
          </div>
        </VerdictShell>
      ) : null}

      {verdict === "DIFFERENTIATE" ? (
        <VerdictShell tone="warning" verdictHi="सिर्फ़ दाम से नहीं जीत पाएँगे" verdict="Price alone will not win this one">
          <p className="type-body text-[var(--text)]">
            There is a band, but it is only <strong className="font-semibold">{inr(band.widthRupees)}</strong> wide —
            about {pct(band.widthPct, 0)} of the price. One rival dropping {inr(Math.ceil(band.widthRupees))} closes it,
            and a single freight change wipes it out.
          </p>
          <p className="type-overline mt-5 text-[var(--text-subtle)]">What would change this</p>
          <ul className="mt-2 space-y-2">
            {[
              ["Make it look different", "A better fabric, a fuller flare, a genuinely different print — something buyers can see in the photo. That moves you out of this crowd."],
              ["Bring the cost down", "Lower cost widens the band from below. The cost simulator shows by how much."],
              ["Sell it as a set", "A bundle is not directly comparable to a single piece, so it escapes the price grid."],
            ].map(([t, d]) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning)]" />
                <p className="type-small text-[var(--text-muted)]">
                  <strong className="font-semibold text-[var(--text)]">{t}.</strong> {d}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/unlock">
              <Button variant="primary">Try the cost simulator</Button>
            </Link>
            <Button variant="secondary" onClick={() => onList(band.recommended)}>
              List anyway at {inr(band.recommended)}
            </Button>
            <Button variant="ghost" onClick={onBack}>
              Change my numbers
            </Button>
          </div>
        </VerdictShell>
      ) : null}

      {verdict === "DONT_LIST" ? (
        <DontListCard floor={floor} inputs={inputs} ceiling={ceiling} codShare={codShare} onBack={onBack} onList={onList} />
      ) : null}
    </div>
  );
}

function DontListCard({
  floor,
  inputs,
  ceiling,
  codShare,
  onBack,
  onList,
}: {
  floor: Traced<number>;
  inputs: CostInputs;
  ceiling: number;
  codShare: number;
  onBack: () => void;
  onList: (price: number) => void;
}) {
  const gap = floor.value - ceiling;
  const lever = leverToClose(inputs, ceiling, codShare);

  return (
    <VerdictShell tone="danger" verdictHi="अभी यह सामान मत डालें" verdict="Don't list this one yet — here is exactly why">
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
        This is not a pricing problem, so no price fixes it. List at a price buyers will see and you lose about{" "}
        <strong className="font-semibold text-[var(--danger)]">{inr(gap)}</strong> on every parcel. List at a price
        that pays, and almost nobody sees it.
      </p>

      <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
        <p className="type-overline text-[var(--text-subtle)]">What would have to change</p>
        {lever ? (
          <>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="hi text-[15px] font-semibold text-[var(--text)]">{lever.leverHi}</p>
                <p className="type-caption text-[var(--text-muted)]">{lever.lever}</p>
              </div>
              <p className="tabular flex items-baseline gap-2 text-[20px] font-semibold">
                <span className="text-[var(--text-muted)] line-through decoration-[1.5px]">{lever.from}</span>
                <span aria-hidden className="text-[var(--text-subtle)]">→</span>
                <span className="text-[var(--success)]">{lever.to}</span>
              </p>
            </div>
            <p className="type-small mt-2 text-[var(--text-muted)]">{lever.detail}</p>
          </>
        ) : (
          <p className="type-small mt-2 text-[var(--text-muted)]">
            No single change closes a gap this wide on its own — it would take several at once. The cost simulator lets
            you move all four together and see what it would take.
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/unlock">
          <Button variant="primary">Show me what would open a band</Button>
        </Link>
        <Button variant="secondary" onClick={onBack}>
          Change my numbers
        </Button>
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
