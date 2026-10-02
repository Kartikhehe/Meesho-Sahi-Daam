"use client";

/**
 * S5 · Cost Unlock Simulator.
 *
 * Four levers, live recompute of floor, band and earnings, with a ghost marker
 * holding the current state so the delta is always visible. This screen is the
 * answer to the DON'T LIST verdict: it exists to show that the way out is
 * through cost, not through price.
 */

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { DaamMeter } from "@/components/charts/daam-meter";
import { MoneyValue } from "@/components/shared/money-value";
import { BandChip } from "@/components/shared/status-chip";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { classifyBand } from "@/engine/band";
import { contributionPerOrder, survivalPrice } from "@/engine/cost";
import { RTO_BY_COD } from "@/engine/constants";
import { useSeller } from "@/lib/use-seller";
import { TACTICS, type Lever } from "@/content/tactics";
import { inr, pct, count } from "@/lib/format";
import { Page, PageHeader } from "@/components/shared/page-header";
import { Callout } from "@/components/shared/callout";

/** RTO is a consequence of COD share, so the slider moves the cause. */
function rtoFromCod(codShare: number): number {
  return (
    (codShare * RTO_BY_COD.cod + (1 - codShare) * RTO_BY_COD.prepaid) * RTO_BY_COD.dampening
  );
}

function UnlockInner() {
  const params = useSearchParams();
  const skuParam = params.get("sku");
  const { analyses, seller, status, error } = useSeller();

  // Default to the listing with the worst gap — the one worth fixing first.
  const base = useMemo(() => {
    if (!analyses.length) return null;
    if (skuParam) {
      const found = analyses.find((a) => a.listing.id === skuParam);
      if (found) return found;
    }
    return [...analyses].sort(
      (a, b) =>
        b.floor.value - b.ceiling.value - (a.floor.value - a.ceiling.value),
    )[0] ?? null;
  }, [analyses, skuParam]);

  const startCod = base?.listing.measured?.codShare ?? seller?.codShare ?? 0.8;

  // ?preset=deck applies the deck's three unlocks: COGS 180→158, returns
  // 20%→13%, cash on delivery 80%→55%.
  const deck = params.get("preset") === "deck";
  const [cogs, setCogs] = useState<number | null>(deck ? 158 : null);
  const [returnRate, setReturnRate] = useState<number | null>(deck ? 0.13 : null);
  const [codShare, setCodShare] = useState<number | null>(deck ? 0.55 : null);
  const [adRate, setAdRate] = useState<number | null>(null);
  const [openLever, setOpenLever] = useState<Lever | null>(null);

  if (!base) {
    return (
      <Page>
        <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
          <EmptyState
            title="Nothing to simulate yet"
            description="Once you have a listing, this screen shows exactly how much your cost, returns or cash-on-delivery share would have to move to open a price band."
          />
        </StateGate>
      </Page>
    );
  }

  const v = {
    cogs: cogs ?? base.inputs.cogs,
    returnRate: returnRate ?? base.inputs.returnRate,
    codShare: codShare ?? startCod,
    adRate: adRate ?? base.inputs.adSpendRate,
  };

  const simulated = {
    ...base.inputs,
    cogs: v.cogs,
    returnRate: v.returnRate,
    rtoRate: rtoFromCod(v.codShare),
    adSpendRate: v.adRate,
  };

  const newFloor = survivalPrice(simulated);
  const newBand = classifyBand(newFloor.value, base.ceiling.value, base.listing.price);
  const newContribution = contributionPerOrder(base.listing.price, simulated);

  const floorDelta = newFloor.value - base.floor.value;
  const monthlyNow = base.contribution.value * base.ordersLast30;
  const monthlyAfter = newContribution.value * base.ordersLast30;
  const monthlyDelta = monthlyAfter - monthlyNow;

  const wasNoBand = base.band.value.verdict === "NO_BAND";
  const nowHasBand = newBand.value.widthRupees > 0;
  const justUnlocked = wasNoBand && nowHasBand;

  const reset = () => {
    setCogs(null);
    setReturnRate(null);
    setCodShare(null);
    setAdRate(null);
  };

  const touched = cogs !== null || returnRate !== null || codShare !== null || adRate !== null;

  return (
    <Page>
      <Link
        href={`/sku/${base.listing.id}`}
        className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        <ArrowLeft size={14} aria-hidden />
        {base.listing.name}
      </Link>

      <PageHeader
        titleHi="लागत कम करें"
        title="Cost unlock"
        description="Move the four things you control and watch your survival price move with them."
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        {/* The verdict banner — the reason this screen exists. */}
        {justUnlocked ? (
          <Callout tone="success" titleHi="बैंड खुल गया" title="A price that works now exists" className="mb-4">
            <p>
              With these changes there is now a price that both covers your costs and gets this
              listing seen — anywhere between {inr(newFloor.value)} and {inr(base.ceiling.value)}.
              That band did not exist before.
            </p>
          </Callout>
        ) : wasNoBand ? (
          <Callout tone="danger" titleHi="अभी कोई सही दाम नहीं" title="No price works for this listing yet" className="mb-4">
            <p>
              Right now no price works for this listing: your survival price of{" "}
              <strong>{inr(newFloor.value)}</strong> is{" "}
              <strong className="text-[var(--danger)]">
                {inr(newFloor.value - base.ceiling.value)}
              </strong>{" "}
              above the ceiling of {inr(base.ceiling.value)}. Move the sliders below until the gap
              closes — that is what has to change, not the price.
            </p>
          </Callout>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <DaamMeter band={newBand.value} />
            </Card>

            <Card className="p-4">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                What these changes are worth
              </h2>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <dt className="hi text-[12px] text-[var(--text-muted)]">नया सुरक्षा दाम</dt>
                  <dd className="mt-0.5 flex items-baseline gap-2">
                    <MoneyValue
                      value={newFloor.value}
                      traced={newFloor}
                      label="Survival price with these changes"
                      labelHi="नया सुरक्षा दाम"
                      size="lg"
                    />
                    {Math.abs(floorDelta) > 0.5 ? (
                      <span
                        className={`tabular text-[12px] font-medium ${floorDelta < 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                      >
                        {floorDelta < 0 ? "↓" : "↑"} {inr(Math.abs(floorDelta))}
                      </span>
                    ) : null}
                  </dd>
                  <dd className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                    was {inr(base.floor.value)}
                  </dd>
                </div>

                <div>
                  <dt className="hi text-[12px] text-[var(--text-muted)]">हर पार्सल पर</dt>
                  <dd className="mt-0.5">
                    <MoneyValue
                      value={newContribution.value}
                      traced={newContribution}
                      label="What you would earn per parcel"
                      labelHi="हर पार्सल पर"
                      size="lg"
                      tone="auto"
                    />
                  </dd>
                  <dd className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                    was {inr(base.contribution.value, 2)}
                  </dd>
                </div>

                <div className="col-span-2 border-t border-[var(--border)] pt-3">
                  <dt className="hi text-[12px] text-[var(--text-muted)]">महीने में फ़र्क</dt>
                  <dd
                    className={`tabular mt-0.5 text-2xl font-semibold ${monthlyDelta >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}
                  >
                    {monthlyDelta >= 0 ? "+" : ""}
                    {inr(monthlyDelta)}
                  </dd>
                  <dd className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                    a month on this listing alone, at {count(base.ordersLast30)} orders
                  </dd>
                </div>

                <div className="col-span-2">
                  <BandChip verdict={newBand.value.verdict} />
                </div>
              </dl>
            </Card>
          </div>

          <Card className="space-y-5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">The four levers</h2>
              {touched ? (
                <Button size="sm" variant="ghost" onClick={reset}>
                  Reset
                </Button>
              ) : null}
            </div>

            <Slider
              label="Cost of goods"
              labelHi="माल की लागत"
              value={v.cogs}
              ghost={base.inputs.cogs}
              min={Math.max(10, Math.round(base.inputs.cogs * 0.5))}
              max={Math.round(base.inputs.cogs * 1.3)}
              format={(x) => inr(x)}
              onChange={setCogs}
              help={<TacticLink lever="cogs" open={openLever} setOpen={setOpenLever} />}
            />

            <Slider
              label="Returns after delivery"
              labelHi="डिलीवरी के बाद वापसी"
              value={v.returnRate}
              ghost={base.inputs.returnRate}
              min={0.02}
              max={Math.min(0.45, base.inputs.returnRate * 1.8)}
              step={0.005}
              format={(x) => pct(x)}
              onChange={setReturnRate}
              help={<TacticLink lever="returnRate" open={openLever} setOpen={setOpenLever} />}
            />

            <Slider
              label="Paying cash on delivery"
              labelHi="कैश पर लेने वाले"
              value={v.codShare}
              ghost={startCod}
              min={0.1}
              max={0.95}
              step={0.01}
              format={(x) => pct(x, 0)}
              onChange={setCodShare}
              help={
                <>
                  <p className="text-[11px] text-[var(--text-subtle)]">
                    This sets your refused-parcel rate: {pct(rtoFromCod(v.codShare))} at this share.
                  </p>
                  <TacticLink lever="codShare" open={openLever} setOpen={setOpenLever} />
                </>
              }
            />

            <Slider
              label="Spent on ads"
              labelHi="विज्ञापन पर खर्च"
              value={v.adRate}
              ghost={base.inputs.adSpendRate}
              min={0}
              max={0.15}
              step={0.005}
              format={(x) => pct(x)}
              onChange={setAdRate}
              help={<TacticLink lever="adRate" open={openLever} setOpen={setOpenLever} />}
            />
          </Card>
        </div>
      </StateGate>
    </Page>
  );
}

/** "How do I actually do this?" — expandable, with concrete tactics. */
function TacticLink({
  lever,
  open,
  setOpen,
}: {
  lever: Lever;
  open: Lever | null;
  setOpen: (l: Lever | null) => void;
}) {
  const isOpen = open === lever;
  const group = TACTICS[lever];

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : lever)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-magenta)] hover:underline"
      >
        How do I actually do this?
        <ChevronDown size={12} aria-hidden className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen ? (
        <ul className="mt-2 space-y-2">
          {group.tactics.map((t) => (
            <li
              key={t.title}
              className="rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-2.5"
            >
              <p className="hi text-[12px] font-semibold text-[var(--text)]">{t.titleHi}</p>
              <p className="text-[11px] font-medium text-[var(--text-muted)]">{t.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{t.detail}</p>
              <p className="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
                <span className="font-medium text-[var(--success)]">{t.effect}</span>
                <span className="text-[var(--text-subtle)]">takes {t.effort}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <UnlockInner />
    </Suspense>
  );
}
