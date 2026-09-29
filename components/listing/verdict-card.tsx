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
      <Card className="p-4">
        <DaamMeter band={band} />
      </Card>

      {verdict === "LIST" ? (
        <Card className="border-l-[3px] border-l-[var(--success)] p-5">
          <p className="hi text-lg font-semibold text-[var(--success)]">यह सामान डाल सकते हैं</p>
          <p className="text-[13px] font-medium text-[var(--text-muted)]">
            You can list this — there is real room between your costs and the ceiling
          </p>

          <p className="mt-3 text-[14px] leading-relaxed text-[var(--text)]">
            Any price between{" "}
            <MoneyValue
              value={floor.value}
              traced={floor}
              label="Your survival price"
              labelHi="सुरक्षा दाम"
              size="md"
              className="font-semibold"
            />{" "}
            and <strong>{inr(ceiling)}</strong> covers what it costs you to ship and still gets you
            found. We suggest <strong>{inr(band.recommended)}</strong> — low enough to be seen while
            you have no reviews yet, high enough that a small cost change will not sink it.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onList(band.recommended)}>
              List at {inr(band.recommended)}
            </Button>
            <Button variant="secondary" onClick={onBack}>
              Change my numbers
            </Button>
          </div>
        </Card>
      ) : null}

      {verdict === "DIFFERENTIATE" ? (
        <Card className="border-l-[3px] border-l-[var(--warning)] p-5">
          <p className="hi text-lg font-semibold text-[var(--warning)]">
            दाम से नहीं जीत पाएँगे
          </p>
          <p className="text-[13px] font-medium text-[var(--text-muted)]">
            Price alone will not win this one
          </p>

          <p className="mt-3 text-[14px] leading-relaxed text-[var(--text)]">
            There is a band, but it is only <strong>{inr(band.widthRupees)}</strong> wide — about{" "}
            {pct(band.widthPct, 0)} of the price. That is not enough room to compete on price: one
            rival dropping {inr(Math.ceil(band.widthRupees))} closes it entirely, and a single
            freight change wipes it out.
          </p>

          <div className="mt-3 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-3">
            <p className="text-[12px] font-semibold text-[var(--text)]">What would change this</p>
            <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-[var(--text-muted)]">
              <li>
                · Something buyers can see in the photo — a better fabric, a fuller flare, a
                genuinely different print. That moves you out of this cluster.
              </li>
              <li>
                · Lower cost, which widens the band from below. Try the cost simulator.
              </li>
              <li>
                · A bundle or a set, which is not directly comparable to a single piece.
              </li>
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onList(band.recommended)}>
              List anyway at {inr(band.recommended)}
            </Button>
            <Link href="/unlock">
              <Button variant="secondary">Try the cost simulator</Button>
            </Link>
            <Button variant="ghost" onClick={onBack}>
              Change my numbers
            </Button>
          </div>
        </Card>
      ) : null}

      {verdict === "DONT_LIST" ? (
        <DontListCard
          floor={floor}
          inputs={inputs}
          ceiling={ceiling}
          codShare={codShare}
          onBack={onBack}
          onList={onList}
        />
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
    <Card className="border-l-[3px] border-l-[var(--danger)] p-5">
      <p className="hi text-lg font-semibold text-[var(--danger)]">अभी यह सामान मत डालें</p>
      <p className="text-[13px] font-medium text-[var(--text-muted)]">
        Don&rsquo;t list this one yet — and here is exactly why
      </p>

      <p className="mt-3 text-[14px] leading-relaxed text-[var(--text)]">
        It costs you{" "}
        <MoneyValue
          value={floor.value}
          traced={floor}
          label="What this listing costs you to serve"
          labelHi="सुरक्षा दाम"
          size="md"
          className="font-semibold"
        />{" "}
        to ship one of these and break even. But buyers stop finding listings in this design above{" "}
        <strong>{inr(ceiling)}</strong>. There is no price in between — the gap is{" "}
        <strong className="text-[var(--danger)]">{inr(gap)}</strong>.
      </p>

      <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
        This is not a pricing problem, so no price fixes it. If you list at a price that gets seen,
        you lose about {inr(gap)} on every parcel. If you list at a price that pays, almost nobody
        sees it.
      </p>

      {lever ? (
        <div className="mt-4 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3.5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
            What would have to change
          </p>
          <p className="hi mt-1.5 text-[14px] font-semibold text-[var(--text)]">{lever.leverHi}</p>
          <p className="text-[12px] text-[var(--text-muted)]">{lever.lever}</p>
          <p className="tabular mt-2 text-[15px] font-semibold text-[var(--text)]">
            {lever.from} <span className="text-[var(--text-subtle)]">→</span>{" "}
            <span className="text-[var(--success)]">{lever.to}</span>
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
            {lever.detail}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3.5">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
            No single change closes this gap on its own — it would take a combination. The cost
            simulator lets you move all four together and see what it would take.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/unlock">
          <Button variant="primary">Show me what would open a band</Button>
        </Link>
        <Button variant="secondary" onClick={onBack}>
          Change my numbers
        </Button>
      </div>

      <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12px] leading-relaxed text-[var(--text-subtle)]">
        We will not stop you listing it. If you want to go ahead anyway,{" "}
        <button
          type="button"
          onClick={() => onList(Math.round(ceiling))}
          className="font-medium text-[var(--brand-magenta)] hover:underline"
        >
          list at {inr(Math.round(ceiling))}
        </button>{" "}
        — just go in knowing what each parcel will cost you.
      </p>
    </Card>
  );
}
