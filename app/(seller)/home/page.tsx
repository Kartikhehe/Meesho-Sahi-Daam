"use client";

/**
 * S1 · आज का हिसाब — today's reckoning.
 *
 * Not a vanity dashboard. Three zones, in the order a seller needs them:
 * what is bleeding right now, the three things worth doing about it, and only
 * then the pulse of the business.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/metric-card";
import { MoneyValue } from "@/components/shared/money-value";
import { BandChip, ScoreChip } from "@/components/shared/status-chip";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { LeakageFunnel } from "@/components/charts/leakage-funnel";
import { useSeller } from "@/lib/use-seller";
import { contributionTrend, ordersFor, settlementsFor, summariseSettlements, topActions } from "@/lib/selectors";
import { inr, inrCompact, count } from "@/lib/format";

export default function HomePage() {
  const { world, seller, analyses, summary, status, error } = useSeller();

  const actions = topActions(analyses, 3);
  const orders30 = world && seller ? ordersFor(world, seller.id, 30) : [];
  const settlements30 = world && seller ? settlementsFor(world, seller.id, 30) : [];
  const settlementSummary = summariseSettlements(settlements30, orders30);
  const trend = world && seller ? contributionTrend(world, seller.id, 30) : [];

  const bleed = Math.abs(summary.monthlyBleed);
  const atRisk = summary.belowFloorCount + summary.noBandCount;

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">
      <header className="mb-5">
        <h1 className="hi text-2xl font-semibold text-[var(--text)]">आज का हिसाब</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Today&rsquo;s reckoning{seller ? ` · ${seller.businessName}, ${seller.city}` : ""}
        </p>
      </header>

      <StateGate
        status={status}
        error={error}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        }
      >
        {analyses.length === 0 ? (
          <EmptyState
            title="Nothing listed yet"
            description="Once you list your first product, this screen shows what it costs you to ship it and what price keeps you safe."
            action={
              <Link href="/new-listing">
                <Button variant="primary">List your first product</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/* Zone 1 — money at risk right now. One number, large, in rupees. */}
            <section className="mb-6">
              {atRisk > 0 ? (
                <Card className="border-l-[3px] border-l-[var(--danger)] p-5">
                  <p className="hi text-[13px] font-medium text-[var(--text)]">अभी खतरे में</p>
                  <p className="text-[12px] text-[var(--text-muted)]">Money at risk right now</p>
                  <p className="tabular mt-2 text-[44px] font-semibold leading-none text-[var(--danger)]">
                    {inrCompact(bleed)}
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                    a month, from{" "}
                    <strong className="text-[var(--text)]">
                      {count(atRisk)} of your {count(summary.listingCount)}
                    </strong>{" "}
                    listings priced below what they cost you to ship.
                  </p>
                  <Link href="/catalogue?filter=below-floor">
                    <Button variant="primary" className="mt-4">
                      Show me which ones
                      <ArrowRight size={14} aria-hidden />
                    </Button>
                  </Link>
                </Card>
              ) : (
                <EmptyState
                  tone="success"
                  title="Nothing is below its floor today"
                  description={`All ${count(summary.listingCount)} of your listings are priced above what they cost you to ship. Check back after your next settlement — costs move.`}
                />
              )}
            </section>

            {/* Zone 2 — the three things worth doing. */}
            {actions.length > 0 ? (
              <section className="mb-6">
                <h2 className="hi mb-1 text-base font-semibold text-[var(--text)]">ये काम करें</h2>
                <p className="mb-3 text-[12px] text-[var(--text-muted)]">
                  Do these {actions.length} things — ranked by what they cost you, most expensive first
                </p>
                <ul className="space-y-2">
                  {actions.map((a, i) => {
                    const losing = a.monthlyRisk < 0;
                    return (
                      <li key={a.listing.id}>
                        <Card className="p-4">
                          <div className="flex items-start gap-3">
                            <span className="tabular mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[12px] font-semibold text-[var(--text-muted)]">
                              {i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/sku/${a.listing.id}`}
                                  className="truncate text-sm font-medium text-[var(--text)] hover:underline"
                                >
                                  {a.listing.name}
                                </Link>
                                <BandChip verdict={a.band.value.verdict} />
                              </div>

                              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
                                {losing ? (
                                  <>
                                    Every parcel loses you{" "}
                                    <MoneyValue
                                      value={a.contribution.value}
                                      traced={a.contribution}
                                      label={`What you earn on ${a.listing.name}`}
                                      labelHi="हर पार्सल पर"
                                      tone="danger"
                                      size="sm"
                                    />
                                    . At {count(a.ordersLast30)} orders last month, that is{" "}
                                    <strong className="text-[var(--danger)]">
                                      {inr(Math.abs(a.monthlyRisk))}
                                    </strong>
                                    .
                                  </>
                                ) : (
                                  <>
                                    Priced above the visibility ceiling of{" "}
                                    <MoneyValue
                                      value={a.ceiling.value}
                                      traced={a.ceiling}
                                      label="Visibility ceiling"
                                      labelHi="दिखने की सीमा"
                                      size="sm"
                                    />
                                    , so buyers are not finding it — only {count(a.ordersLast30)}{" "}
                                    orders last month.
                                  </>
                                )}
                              </p>

                              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                <Link href={`/sku/${a.listing.id}`}>
                                  <Button size="sm" variant="secondary">
                                    {a.band.value.recommended > 0
                                      ? `We suggest ${inr(a.band.value.recommended)}`
                                      : "See what would help"}
                                  </Button>
                                </Link>
                                <span className="text-[12px] text-[var(--text-subtle)]">
                                  now {inr(a.listing.price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {/* Zone 3 — the pulse. */}
            <section>
              <h2 className="mb-3 text-base font-semibold text-[var(--text)]">Your business pulse</h2>

              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <MetricCard
                  label="Earned in the last 30 days"
                  labelHi="पिछले 30 दिन की कमाई"
                  tone={summary.monthlyContribution >= 0 ? "success" : "danger"}
                  value={
                    <span
                      className={`tabular text-[28px] font-semibold ${summary.monthlyContribution >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                    >
                      {inrCompact(summary.monthlyContribution)}
                    </span>
                  }
                  caption={`Across ${count(summary.ordersLast30)} orders, after every deduction.`}
                />
                <MetricCard
                  label="Listings priced healthily"
                  labelHi="ठीक दाम वाले सामान"
                  value={
                    <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                      {count(summary.healthyCount)}
                      <span className="text-base font-normal text-[var(--text-subtle)]">
                        {" "}
                        / {count(summary.listingCount)}
                      </span>
                    </span>
                  }
                  caption={
                    summary.aboveGateCount > 0
                      ? `${count(summary.aboveGateCount)} are priced above the ceiling, so buyers cannot find them.`
                      : "Every listing is inside its band."
                  }
                />
                <MetricCard
                  label="Average Daam Score"
                  labelHi="औसत दाम स्कोर"
                  value={
                    <div className="flex items-baseline gap-2">
                      <span className="tabular text-[28px] font-semibold text-[var(--text)]">
                        {summary.averageScore}
                      </span>
                      <ScoreChip score={summary.averageScore} />
                    </div>
                  }
                  caption="Where your prices sit, what you earn, and how often you are seen."
                />
              </div>

              <Card className="p-4">
                <LeakageFunnel
                  data={{
                    dispatched: settlementSummary.dispatched,
                    delivered: settlementSummary.delivered,
                    paid: settlementSummary.paid,
                    rtoCost: settlementSummary.reverseFreight * 0.5,
                    returnCost: settlementSummary.reverseFreight * 0.5,
                    netPerPaid: settlementSummary.netCredited / Math.max(settlementSummary.paid, 1),
                  }}
                />
                <div className="mt-3 border-t border-[var(--border)] pt-3">
                  <Link
                    href="/settlements"
                    className="inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-[var(--brand-magenta)] hover:underline"
                  >
                    See every parcel and what it paid
                    <ArrowRight size={13} aria-hidden />
                  </Link>
                </div>
              </Card>

              {trend.length > 0 ? (
                <Card className="mt-4 p-4">
                  <h3 className="hi text-[13px] font-semibold text-[var(--text)]">
                    पिछले 30 दिन
                  </h3>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    What each day&rsquo;s parcels earned you, after every deduction
                  </p>
                  <Sparkline points={trend} />
                </Card>
              ) : null}
            </section>
          </>
        )}
      </StateGate>
    </div>
  );
}

/** A small inline trend. Deliberately unlabelled — the numbers are elsewhere. */
function Sparkline({ points }: { points: { day: number; value: number }[] }) {
  const values = points.map((p) => p.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const w = 640;
  const h = 72;

  const path = points
    .map((p, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * w;
      const y = h - ((p.value - min) / range) * h;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const zeroY = h - ((0 - min) / range) * h;
  const total = values.reduce((a, b) => a + b, 0);

  return (
    <figure className="m-0 mt-2">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={`Daily earnings over ${points.length} days, totalling ${inr(total)}`}>
        {min < 0 ? (
          <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="var(--border-strong)" strokeDasharray="3 3" />
        ) : null}
        <path d={path} fill="none" stroke={total >= 0 ? "var(--success)" : "var(--danger)"} strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 text-[12px] text-[var(--text-muted)]">
        Total for the period:{" "}
        <strong className={total >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
          {inr(total)}
        </strong>
      </figcaption>
    </figure>
  );
}
