"use client";

/**
 * S3 · Price tab — the Daam Meter as the hero, then the decision.
 *
 * "Accept ₹334" is the primary action, but "Set my own" never disappears: the
 * tool advises, the seller decides. That is both a trust decision and a
 * competition-law one.
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DaamMeter } from "@/components/charts/daam-meter";
import { MoneyValue } from "@/components/shared/money-value";
import { BandChip } from "@/components/shared/status-chip";
import { VERDICT_COPY } from "@/engine/band";
import { contributionPerOrder } from "@/engine/cost";
import { useWorldStore } from "@/lib/store/world-store";
import type { ListingAnalysis } from "@/lib/selectors";
import { inr, count } from "@/lib/format";
import Link from "next/link";

export function PriceTab({ analysis }: { analysis: ListingAnalysis }) {
  const setPrice = useWorldStore((s) => s.setPrice);
  const [custom, setCustom] = useState<string>("");
  const [showCustom, setShowCustom] = useState(false);
  const [saved, setSaved] = useState<number | null>(null);

  const { listing, band, floor, ceiling, contribution, ordersLast30 } = analysis;
  const verdict = band.value.verdict;
  const copy = VERDICT_COPY[verdict];
  const recommended = band.value.recommended;

  /** What she would earn per parcel at the suggested price. */
  const atRecommended =
    recommended > 0 ? contributionPerOrder(recommended, analysis.inputs) : null;

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
      <Card className="p-4">
        <DaamMeter band={band.value} />
      </Card>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <BandChip verdict={verdict} />
          <span className="text-[13px] text-[var(--text-muted)]">{copy.meaning}</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div>
            <dt className="hi text-[12px] text-[var(--text-muted)]">आपका दाम</dt>
            <dd className="tabular mt-0.5 text-lg font-semibold text-[var(--text)]">
              {inr(listing.price)}
            </dd>
          </div>
          <div>
            <dt className="hi text-[12px] text-[var(--text-muted)]">सुरक्षा दाम</dt>
            <dd className="mt-0.5">
              <MoneyValue
                value={floor.value}
                traced={floor}
                label={`Survival price — ${listing.name}`}
                labelHi="सुरक्षा दाम"
                size="lg"
              />
            </dd>
          </div>
          <div>
            <dt className="hi text-[12px] text-[var(--text-muted)]">दिखने की सीमा</dt>
            <dd className="mt-0.5">
              <MoneyValue
                value={ceiling.value}
                traced={ceiling}
                label={`Visibility ceiling — ${listing.name}`}
                labelHi="दिखने की सीमा"
                size="lg"
              />
            </dd>
          </div>
          <div>
            <dt className="hi text-[12px] text-[var(--text-muted)]">हर पार्सल पर</dt>
            <dd className="mt-0.5">
              <MoneyValue
                value={contribution.value}
                traced={contribution}
                label="What you earn per parcel shipped"
                labelHi="हर पार्सल पर कमाई"
                size="lg"
                tone="auto"
              />
            </dd>
          </div>
        </dl>

        {saved !== null ? (
          <p className="mt-4 rounded-[var(--radius-input)] border border-[var(--success)]/30 bg-[var(--success-bg)] px-3 py-2 text-[13px] text-[var(--text)]">
            Price set to <strong>{inr(saved)}</strong>. You can change it back at any time.
          </p>
        ) : null}

        <div className="mt-4 border-t border-[var(--border)] pt-4">
          {verdict === "NO_BAND" ? (
            <div>
              <p className="text-[13px] leading-relaxed text-[var(--text)]">
                There is no price that both covers your costs and gets this listing seen. Your
                survival price is{" "}
                <strong className="text-[var(--danger)]">
                  {inr(floor.value - ceiling.value)}
                </strong>{" "}
                above the ceiling. The cost has to move before the price can.
              </p>
              <Link href={`/unlock?sku=${listing.id}`}>
                <Button variant="primary" className="mt-3">
                  Show me what would open a band
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              {recommended > 0 && recommended !== listing.price ? (
                <Button variant="primary" onClick={() => apply(recommended)}>
                  Accept {inr(recommended)}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setShowCustom((v) => !v)}>
                Set my own
              </Button>
              {atRecommended && recommended !== listing.price ? (
                <span className="text-[12px] text-[var(--text-muted)]">
                  We suggest {inr(recommended)} — that would earn you{" "}
                  <strong className="text-[var(--success)]">
                    {inr(atRecommended.value)}
                  </strong>{" "}
                  a parcel, against {inr(contribution.value)} now.
                </span>
              ) : null}
            </div>
          )}

          {showCustom ? (
            <div className="mt-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3">
              <label htmlFor="custom-price" className="text-[12px] font-medium text-[var(--text)]">
                Your price
              </label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <input
                  id="custom-price"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  inputMode="numeric"
                  placeholder={String(listing.price)}
                  className="tabular h-11 w-32 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
                />
                <Button
                  variant="secondary"
                  disabled={!customValid}
                  onClick={() => apply(Math.round(customValue))}
                >
                  Set this price
                </Button>
              </div>
              {customBelowFloor ? (
                <p className="mt-2 text-[12px] leading-relaxed text-[var(--warning)]">
                  That is below your survival price of {inr(floor.value)} — you would lose about{" "}
                  {inr(Math.abs(contributionPerOrder(customValue, analysis.inputs).value))} on every
                  parcel. We will still set it if that is what you want.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">What this listing did</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
          {[
            ["Orders, last 30 days", count(ordersLast30)],
            ["Earned, last 30 days", inr(analysis.monthlyContribution)],
            ["Rating", `${listing.rating.toFixed(1)} ★`],
            ["In stock", count(listing.inventory)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[12px] text-[var(--text-subtle)]">{label}</dt>
              <dd className="tabular mt-0.5 text-sm font-medium text-[var(--text)]">{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
