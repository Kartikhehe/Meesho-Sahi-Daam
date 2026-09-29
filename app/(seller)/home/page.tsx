"use client";

/**
 * S1 · आज का हिसाब — today's reckoning.
 *
 * Not a dashboard. Three zones in the order a seller needs them at 6am: what
 * is bleeding right now, the three things worth doing about it, and only then
 * the pulse of the business.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, SectionHeading } from "@/components/shared/page-header";
import { MetricCard, Figure } from "@/components/shared/metric-card";
import { Amount } from "@/components/shared/amount";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { LeakageFunnel } from "@/components/charts/leakage-funnel";
import { CatalogueSplit } from "@/components/home/catalogue-split";
import { ActionList } from "@/components/home/action-list";
import { EarningsTrend } from "@/components/home/earnings-trend";
import { useSeller } from "@/lib/use-seller";
import { contributionTrend, funnelFromLedger, settlementsFor, topActions } from "@/lib/selectors";
import { count } from "@/lib/format";

export default function HomePage() {
  const { world, seller, analyses, summary, status, error } = useSeller();

  const actions = topActions(analyses, 3);
  const settlements30 = world && seller ? settlementsFor(world, seller.id, 30) : [];
  const trend = world && seller ? contributionTrend(world, seller.id, 30) : [];

  const atRisk = summary.belowFloorCount + summary.noBandCount;
  // What actually landed, from her settlement lines — the same source the
  // trend chart draws. One fact, one number, everywhere on the screen.
  const earned = trend.reduce((acc, p) => acc + p.value, 0);
  const losing = atRisk > 0;

  return (
    <Page className="seller-flow">
      <PageHeader
        titleHi="आज का हिसाब"
        title="Today's reckoning"
        eyebrow={seller ? `${seller.businessName} · ${seller.city}` : undefined}
      />

      <StateGate
        status={status}
        error={error}
        skeleton={
          <div className="space-y-4">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        {analyses.length === 0 ? (
          <EmptyState
            title="Nothing listed yet"
            description="List your first product and this screen will show what it costs you to ship, and the price that keeps you safe."
            action={
              <Link href="/new-listing">
                <Button variant="primary">List your first product</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-8">
            {/* Zone 1 — money at risk right now. */}
            {losing ? (
              <Card className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.25fr_1fr] lg:gap-10">
                <div>
                  <p className="hi text-[14px] font-semibold text-[var(--text)]">अभी खतरे में</p>
                  <p className="type-caption text-[var(--text-subtle)]">Money at risk right now</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <Amount value={summary.monthlyBleed} size="display" compact tone="danger" />
                    <span className="text-[15px] font-medium text-[var(--text-muted)]">a month</span>
                  </div>
                  <p className="type-body mt-3 max-w-md text-[var(--text-muted)]">
                    <strong className="font-semibold text-[var(--text)]">
                      {count(atRisk)} of your {count(summary.listingCount)} listings
                    </strong>{" "}
                    are priced below what it costs you to ship them. Every order on those takes money out of your
                    pocket.
                  </p>
                  <Link href="/catalogue?filter=below-floor" className="mt-5 inline-block">
                    <Button variant="primary">
                      Show me which ones
                      <ArrowRight size={16} aria-hidden />
                    </Button>
                  </Link>
                </div>
                <div className="border-t border-[var(--border)] pt-5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
                  <p className="type-overline mb-3 text-[var(--text-subtle)]">Your catalogue today</p>
                  <CatalogueSplit summary={summary} />
                </div>
              </Card>
            ) : (
              <EmptyState
                tone="success"
                title="Nothing is below its floor today"
                description={`All ${count(summary.listingCount)} of your listings are priced above what they cost you to ship. Costs move, so we will tell you when that changes.`}
              />
            )}

            {/* Zone 2 — the three things worth doing. */}
            {actions.length > 0 ? (
              <section>
                <SectionHeading
                  titleHi="ये काम करें"
                  title={`Do these ${actions.length} things — most expensive first`}
                />
                <ActionList actions={actions} />
              </section>
            ) : null}

            {/* Zone 3 — the pulse. */}
            <section>
              <SectionHeading titleHi="कारोबार की नब्ज़" title="Your business pulse" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MetricCard
                  className="col-span-2 sm:col-span-1"
                  labelHi="पिछले 30 दिन की कमाई"
                  label="Earned in the last 30 days"
                  tone={earned >= 0 ? "success" : "danger"}
                  value={<Amount value={earned} size="figure" compact tone="auto" />}
                  caption={`From your settlement lines: ${count(settlements30.length)} parcels, after every deduction.`}
                />
                <MetricCard
                  labelHi="ठीक दाम वाले सामान"
                  label="Listings priced healthily"
                  value={<Figure value={count(summary.healthyCount)} of={count(summary.listingCount)} />}
                  caption={
                    atRisk > 0
                      ? `${count(atRisk)} lose money on every parcel${summary.aboveGateCount ? `; ${count(summary.aboveGateCount)} are priced above what buyers look at` : ""}.`
                      : summary.aboveGateCount > 0
                        ? `${count(summary.aboveGateCount)} are priced above what buyers look at.`
                        : "Every listing is inside its band."
                  }
                />
                <MetricCard
                  labelHi="औसत दाम स्कोर"
                  label="Average Daam Score"
                  value={
                    <div>
                      <Figure
                        value={summary.averageScore}
                        of={100}
                        tone={summary.averageScore < 40 ? "danger" : summary.averageScore < 70 ? "warning" : "success"}
                      />
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)]" aria-hidden>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(3, summary.averageScore)}%`,
                            background:
                              summary.averageScore < 40 ? "var(--danger)" : summary.averageScore < 70 ? "var(--warning)" : "var(--success)",
                          }}
                        />
                      </div>
                    </div>
                  }
                  caption="Where your prices sit, what you earn, and how often buyers see you." 
                />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <Card className="p-4 sm:p-5">
                  <LeakageFunnel data={funnelFromLedger(settlements30)} />
                  <Link href="/settlements" className="link mt-4 inline-flex items-center gap-1 text-[13px]">
                    See every parcel and what it paid
                    <ArrowRight size={14} aria-hidden />
                  </Link>
                </Card>
                <Card className="p-4 sm:p-5">
                  <EarningsTrend points={trend} />
                </Card>
              </div>
            </section>
          </div>
        )}
      </StateGate>
    </Page>
  );
}
