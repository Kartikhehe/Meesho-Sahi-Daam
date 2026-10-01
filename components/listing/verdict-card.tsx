"use client";

/**
 * The verdict — step 3 of the new-listing wizard. Four outcomes, chosen by how
 * wide the band [floor × (1 + m), ceiling] is, all designed with equal care:
 *
 *   DON'T LIST YET     no price both pays and gets seen — name the lever
 *   DIFFERENTIATE      a band under 5%; price alone will not win it
 *   LAUNCH             5–15%: launch at the profit-maximising price
 *   PRICE FOR MARGIN   over 15%: plenty of room, and a design for sourcing (C2M)
 *
 * On day zero every rate is borrowed, so the floor is shown as a range and the
 * verdict carries its own confidence.
 */

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DaamMeter } from "@/components/charts/daam-meter";
import { MoneyValue, TraceLink } from "@/components/shared/money-value";
import { Callout } from "@/components/shared/callout";
import { MeeshoScope } from "@/components/shared/meesho-scope";
import { VoicePreview } from "@/components/shared/voice-preview";
import { VerdictShell } from "./verdict-shell";
import { DontListBody } from "./dont-list";
import { rankLevers } from "./levers";
import { verdictScript } from "@/content/voice";
import type { NewListingMarket } from "@/lib/new-listing-market";
import { inr, pct } from "@/lib/format";

export function VerdictCard({
  market,
  codShare,
  plannedPrice,
  onList,
  onBack,
}: {
  market: NewListingMarket;
  codShare: number;
  /** The price she had in mind, if any — shown against the verdict. */
  plannedPrice?: number;
  onList: (price: number) => void;
  onBack: () => void;
}) {
  const band = market.band.value;
  const range = market.range.value;
  const launch = market.launch?.value ?? 0;
  const ceiling = market.ceiling.value;
  const levers = rankLevers(market.inputs, ceiling, codShare, band.margin);
  const script = verdictScript(band.launch, { floor: band.floor, ceiling, launch, lever: levers[0]?.leverHi });
  const listAt = launch || Math.round(band.bandLow);

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <DaamMeter band={{ ...band, price: plannedPrice ?? listAt, recommended: launch }} />
      </Card>

      {market.route === "CATEGORY_PRIOR" ? (
        <Callout tone="info" titleHi="कोई मिलता-जुलता सामान नहीं" title="No close look-alikes — so this is a wider guess">
          Nothing in the catalogue is close enough to this product, so the ceiling is borrowed from related categories
          at a similar parcel weight and shown as a range:{" "}
          <strong className="font-semibold">
            {inr(market.ceilingRange?.low ?? ceiling)} – {inr(market.ceilingRange?.high ?? ceiling)}
          </strong>
          . Tagged <strong className="font-semibold">NEW / THIN</strong>: the price ladder tests ±10% instead of the
          usual ±6% until real orders arrive.
        </Callout>
      ) : null}

      <Card tone="sunken" className="p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[13px] font-medium text-[var(--text)]">
            <span className="hi">आपका सुरक्षा दाम</span>
            <span className="text-[var(--text-muted)]"> · your floor, {Math.round(range.confidence * 100)}% range</span>
          </p>
          <p className="tabular text-[17px] font-semibold text-[var(--text)]">
            {inr(range.low)} – {inr(range.high)}
          </p>
        </div>
        <p className="type-caption mt-1.5 text-[var(--text-muted)]">
          You have no orders yet, so return and refusal rates are borrowed from{" "}
          {market.route === "TWINS" ? "look-alike listings" : "related categories"} and the floor is a range that
          narrows as your own orders arrive.{" "}
          {band.launch === "DONT_LIST" ? (
            <strong className="text-[var(--danger)]">{pct(market.pNoBand, 0)} likely no viable price.</strong>
          ) : market.pNoBand > 0.05 ? (
            <strong className="text-[var(--warning)]">{pct(market.pNoBand, 0)} chance there is no viable price after all.</strong>
          ) : null}{" "}
          <TraceLink traced={{ value: range.halfWidth, trace: market.range.trace, assumptions: [] }} label="Why a range" labelHi="सीमा क्यों" />
        </p>
      </Card>

      {band.launch === "DONT_LIST" ? (
        <DontListBody market={market} levers={levers} plannedPrice={plannedPrice} onBack={onBack} onList={onList} />
      ) : null}

      {band.launch === "DIFFERENTIATE" ? (
        <VerdictShell tone="warning" verdictHi="पहले अलग बनाइए" verdict="Differentiate first — price alone will not win this one">
          <p className="type-body text-[var(--text)]">
            There is a band, but it is only <strong className="font-semibold">{inr(band.widthRupees)}</strong> wide —
            about {pct(band.widthPct, 0)} of the ceiling. One rival dropping {inr(Math.ceil(band.widthRupees))} closes
            it, and a single freight change wipes it out.
          </p>
          <p className="type-small mt-3 text-[var(--text-muted)]">
            Change something buyers can see in the photo (fabric, cut, print), bring the cost down to widen the band
            from below, or sell it as a set so it escapes the price grid.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/unlock"><Button variant="primary">Try the cost simulator</Button></Link>
            <Button variant="secondary" onClick={() => onList(listAt)}>List anyway at {inr(listAt)}</Button>
            <Button variant="ghost" onClick={onBack}>Change my numbers</Button>
          </div>
        </VerdictShell>
      ) : null}

      {band.launch === "PROFIT_MAX" || band.launch === "PRICE_FOR_MARGIN" ? (
        <VerdictShell
          tone="success"
          verdictHi={band.launch === "PROFIT_MAX" ? "यह सामान डाल सकते हैं" : "मुनाफ़े के लिए दाम रखिए"}
          verdict={band.launch === "PROFIT_MAX" ? "List it — at the price that earns most" : "Price for margin — there is plenty of room"}
        >
          <p className="type-body text-[var(--text)]">
            Any price from <strong className="font-semibold">{inr(band.bandLow)}</strong> to{" "}
            <strong className="font-semibold">{inr(ceiling)}</strong> covers your cost with a {pct(band.margin, 0)} cushion
            and still gets you found.
          </p>
          {market.launch ? (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-4 py-3">
              <div>
                <p className="hi text-[12.5px] font-medium text-[var(--text-muted)]">शुरुआती दाम · Launch at</p>
                <MoneyValue value={launch} traced={market.launch} label="Launch price" labelHi="शुरुआती दाम" size="xl" />
              </div>
              <p className="type-caption min-w-[12rem] flex-1 text-[var(--text-muted)]">
                The price that earns most inside the band, under the look-alikes&rsquo; demand. Your price ladder then
                tests a rung either side with real orders and settles it.
              </p>
            </div>
          ) : null}
          {band.launch === "PRICE_FOR_MARGIN" ? (
            <Callout tone="info" className="mt-4" title="Flagged to sourcing (C2M)">
              A band over 15% wide is unusual — this design earns well at most prices, so it has been flagged to the
              sourcing team as one to make more of. Expect rivals to notice and the band to narrow.
            </Callout>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => onList(listAt)}>List at {inr(listAt)}</Button>
            <Button variant="secondary" onClick={onBack}>Change my numbers</Button>
          </div>
        </VerdictShell>
      ) : null}

      <VoicePreview script={script} />
      <MeeshoScope />
    </div>
  );
}
