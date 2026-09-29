"use client";

/**
 * S3 · Price tab — the Daam Meter, the four numbers behind it, then the
 * decision.
 *
 * "Accept" is the primary action, but "Set my own" never disappears: the tool
 * advises, the seller decides. That is both a trust decision and a
 * competition-law one.
 */

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DaamMeter } from "@/components/charts/daam-meter";
import { MoneyValue } from "@/components/shared/money-value";
import { Amount } from "@/components/shared/amount";
import { Callout } from "@/components/shared/callout";
import { StatStrip } from "@/components/shared/stat-strip";
import { VERDICT_COPY } from "@/engine/band";
import { contributionPerOrder } from "@/engine/cost";
import { useWorldStore } from "@/lib/store/world-store";
import type { ListingAnalysis } from "@/lib/selectors";
import { count, inr } from "@/lib/format";

export function PriceTab({ analysis }: { analysis: ListingAnalysis }) {
  const setPrice = useWorldStore((s) => s.setPrice);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const { listing, band, floor, ceiling, contribution, ordersLast30 } = analysis;
  const verdict = band.value.verdict;
  const recommended = band.value.recommended;
  const atRecommended = recommended > 0 ? contributionPerOrder(recommended, analysis.inputs) : null;

  const apply = (price: number) => {
    setPrice(listing.id, price);
    setSaved(price);
    setShowCustom(false);
  };

  const customValue = Number(custom);
  const customValid = Number.isFinite(customValue) && customValue > 0;
  const customBelowFloor = customValid && customValue < floor.value;

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5">
        <DaamMeter band={band.value} />
      </Card>

      <StatStrip
        stats={[
          { labelHi: "आपका दाम", label: "Your price", value: <Amount value={listing.price} size="lg" /> },
          {
            labelHi: "सुरक्षा दाम",
            label: "Survival price",
            value: (
              <MoneyValue value={floor.value} traced={floor} label={`Survival price — ${listing.name}`} labelHi="सुरक्षा दाम" size="lg" />
            ),
          },
          {
            labelHi: "दिखने की सीमा",
            label: "Visibility ceiling",
            value: (
              <MoneyValue value={ceiling.value} traced={ceiling} label={`Visibility ceiling — ${listing.name}`} labelHi="दिखने की सीमा" size="lg" />
            ),
          },
          {
            labelHi: "हर पार्सल पर",
            label: "Per parcel shipped",
            value: (
              <MoneyValue
                value={contribution.value}
                traced={contribution}
                label="What you earn per parcel shipped"
                labelHi="हर पार्सल पर कमाई"
                size="lg"
                tone="auto"
              />
            ),
          },
        ]}
      />
      <p className="type-caption -mt-1 px-1 text-[var(--text-subtle)]">
        Tap any underlined figure to see exactly how it is worked out.
      </p>

      {saved !== null ? (
        <Callout tone="success" title={`Price set to ${inr(saved)}`}>
          You can change it back at any time. The new price shows up in your next settlement.
        </Callout>
      ) : null}

      {verdict === "NO_BAND" ? (
        <Callout
          tone="danger"
          titleHi="कोई सही दाम नहीं"
          title="No price works for this listing yet"
          actions={
            <Link href={`/unlock?sku=${listing.id}`}>
              <Button variant="primary">Show me what would open a band</Button>
            </Link>
          }
        >
          Your survival price is <strong>{inr(floor.value - ceiling.value)}</strong> above the ceiling. Any price
          buyers will see loses you money on every parcel — the cost has to move before the price can.
        </Callout>
      ) : (
        <Card className="p-4 sm:p-5">
          <CardHead
            titleHi="क्या करें"
            title="What we suggest"
            description={VERDICT_COPY[verdict].meaning}
          />

          {atRecommended && recommended !== listing.price ? (
            <p className="type-body mt-4 text-[var(--text)]">
              At <strong className="font-semibold">{inr(recommended)}</strong> you would earn{" "}
              <Amount value={atRecommended.value} size="md" tone="auto" decimals={atRecommended.value < 10 ? 2 : 0} /> a
              parcel, against <Amount value={contribution.value} size="md" tone="auto" /> today
              {ordersLast30 > 0 ? (
                <>
                  {" "}— about{" "}
                  <strong className="font-semibold">
                    {inr((atRecommended.value - contribution.value) * ordersLast30)}
                  </strong>{" "}
                  more a month at last month&rsquo;s {count(ordersLast30)} orders
                </>
              ) : null}
              .
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {recommended > 0 && recommended !== listing.price ? (
              <Button variant="primary" onClick={() => apply(recommended)}>
                <Check size={16} aria-hidden />
                Accept {inr(recommended)}
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setShowCustom((v) => !v)} aria-expanded={showCustom}>
              Set my own price
            </Button>
          </div>

          {showCustom ? (
            <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-3.5">
              <label htmlFor="custom-price" className="text-[13px] font-medium text-[var(--text)]">
                Your price
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="flex h-11 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-within:border-[var(--brand-magenta)]">
                  <span className="text-[var(--text-subtle)]">₹</span>
                  <input
                    id="custom-price"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder={String(listing.price)}
                    className="tabular w-24 bg-transparent text-[15px] font-medium text-[var(--text)] outline-none"
                  />
                </div>
                <Button variant="secondary" disabled={!customValid} onClick={() => apply(Math.round(customValue))}>
                  Set this price
                </Button>
              </div>
              {customBelowFloor ? (
                <p className="type-caption mt-2.5 text-[var(--warning)]">
                  That is below your survival price of {inr(floor.value)} — you would lose about{" "}
                  {inr(Math.abs(contributionPerOrder(customValue, analysis.inputs).value))} on every parcel. We will
                  still set it if that is what you want.
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>
      )}

      <StatStrip
        stats={[
          { label: "Orders, last 30 days", value: <span className="type-h2 tabular">{count(ordersLast30)}</span> },
          { label: "Earned, last 30 days", value: <Amount value={analysis.monthlyContribution} size="lg" tone="auto" /> },
          { label: "Rating", value: <span className="type-h2 tabular">{listing.rating.toFixed(1)} ★</span> },
          { label: "In stock", value: <span className="type-h2 tabular">{count(listing.inventory)}</span> },
        ]}
      />
    </div>
  );
}
