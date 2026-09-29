"use client";

/**
 * S4 · New Listing — the cold-start flow.
 *
 * Four steps. The seller types exactly ONE number she actually knows (what the
 * goods cost her) plus the weight; everything else is pre-filled from her own
 * ledger, each field showing where it came from and each one overridable.
 *
 * A listing with no history has no demand curve of its own, so the band comes
 * from look-alike listings via real cosine similarity — and the seller can see
 * which ones and how close they are.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { TraceLink } from "@/components/shared/money-value";
import { VerdictCard, verdictFor } from "@/components/listing/verdict-card";
import { classifyBand } from "@/engine/band";
import { estimateCeiling } from "@/engine/ceiling";
import { survivalPrice, type CostInputs } from "@/engine/cost";
import { freightFor } from "@/engine/money";
import { findTwins } from "@/engine/twins";
import { REVERSE_FREIGHT_MULTIPLIER, RTO_BY_COD, RETURN_RATE_BY_CATEGORY } from "@/engine/constants";
import { useSeller } from "@/lib/use-seller";
import { inr, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Category } from "@/engine/types";
import { Page, PageHeader } from "@/components/shared/page-header";

const CATEGORIES: { key: Category; label: string; labelHi: string }[] = [
  { key: "kurti", label: "Kurti", labelHi: "कुर्ती" },
  { key: "saree", label: "Saree", labelHi: "साड़ी" },
  { key: "co-ord-set", label: "Co-ord set", labelHi: "को-ऑर्ड सेट" },
  { key: "bedsheet", label: "Bedsheet", labelHi: "चादर" },
  { key: "kitchen-storage", label: "Kitchen storage", labelHi: "रसोई का डिब्बा" },
  { key: "phone-cover", label: "Phone cover", labelHi: "फ़ोन कवर" },
  { key: "jewellery-set", label: "Jewellery set", labelHi: "गहने का सेट" },
];

const STEPS = ["Pick a category", "Your numbers", "The verdict", "Confirm"];

export default function NewListingPage() {
  const router = useRouter();
  const { world, seller, analyses, status, error } = useSeller();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [cogs, setCogs] = useState("");
  const [grams, setGrams] = useState("");
  const [overrides, setOverrides] = useState<Partial<CostInputs>>({});
  const [listed, setListed] = useState<number | null>(null);

  /** Look-alikes for the chosen category, by real cosine similarity. */
  const twins = useMemo(() => {
    if (!world || !category) return null;
    const seed = world.listings.find((l) => l.category === category)?.attributes;
    if (!seed) return null;
    return findTwins(seed, world.listings, 40);
  }, [world, category]);

  /**
   * The ceiling comes from the cluster the twins CONCENTRATE in, weighted by
   * similarity — not from whichever twin happened to sort first. Clusters in a
   * category span a wide price range (kurti ceilings run ₹197 to ₹376 here), so
   * picking the first match can hand back a ceiling from a much cheaper corner
   * of the market and make every honest listing look unviable.
   */
  const ceiling = useMemo(() => {
    if (!world || !twins?.value.length) return null;

    const weight = new Map<string, number>();
    for (const t of twins.value) {
      weight.set(t.listing.clusterId, (weight.get(t.listing.clusterId) ?? 0) + t.similarity);
    }
    let bestCluster: string | null = null;
    let bestWeight = -1;
    for (const [clusterId, w] of weight) {
      if (w > bestWeight) {
        bestWeight = w;
        bestCluster = clusterId;
      }
    }

    const rivals = world.competitors.filter((c) => c.clusterId === bestCluster);
    return rivals.length ? estimateCeiling(rivals) : null;
  }, [world, twins]);

  /** Everything except COGS and weight comes from her own ledger. */
  const inputs: CostInputs | null = useMemo(() => {
    if (!seller || !category) return null;
    const g = Number(grams) || 500;
    const forward = freightFor(g);
    const rto =
      (seller.codShare * RTO_BY_COD.cod + (1 - seller.codShare) * RTO_BY_COD.prepaid) *
      RTO_BY_COD.dampening;
    return {
      cogs: Number(cogs) || 0,
      rtoRate: overrides.rtoRate ?? rto,
      returnRate: overrides.returnRate ?? (RETURN_RATE_BY_CATEGORY[category] ?? 0.12),
      adSpendRate: overrides.adSpendRate ?? seller.adSpendRate,
      forwardFreight: overrides.forwardFreight ?? forward,
      reverseFreight: overrides.reverseFreight ?? forward * REVERSE_FREIGHT_MULTIPLIER,
      packaging: overrides.packaging ?? seller.packagingCost,
    };
  }, [seller, category, cogs, grams, overrides]);

  const floor = inputs && Number(cogs) > 0 ? survivalPrice(inputs) : null;
  const band =
    floor && ceiling ? classifyBand(floor.value, ceiling.value, ceiling.value * 0.95) : null;

  const canProceed =
    step === 0 ? !!category : step === 1 ? Number(cogs) > 0 && Number(grams) > 0 : true;

  if (listed !== null) {
    return (
      <Page width="narrow">
        <Card className="p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--success-bg)]">
            <Check size={22} className="text-[var(--success)]" aria-hidden />
          </div>
          <h1 className="hi mt-3 text-xl font-semibold text-[var(--text)]">सामान डल गया</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Listed at <strong className="text-[var(--text)]">{inr(listed)}</strong>. We will watch
            your costs and tell you if anything moves enough to matter.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={() => router.push("/catalogue")}>
              See my catalogue
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setListed(null);
                setStep(0);
                setCategory(null);
                setCogs("");
                setGrams("");
                setOverrides({});
              }}
            >
              List another
            </Button>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page width="narrow">
      <PageHeader
        titleHi="नया सामान"
        title="New listing"
        description="Tell us what the goods cost you, and we will tell you honestly whether this can work."
      />

      <ol className="mb-5 flex flex-wrap gap-x-2 gap-y-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "tabular grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold",
                i === step
                  ? "bg-[var(--brand-magenta)] text-white"
                  : i < step
                    ? "bg-[var(--success-bg)] text-[var(--success)]"
                    : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]",
              )}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "text-[12px]",
                i === step ? "font-medium text-[var(--text)]" : "text-[var(--text-subtle)]",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 ? <span className="text-[var(--border-strong)]">·</span> : null}
          </li>
        ))}
      </ol>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-80 w-full" />}>
        {/* Step 1 — category, then show the twins we found. */}
        {step === 0 ? (
          <Card className="p-4">
            <h2 className="hi text-base font-semibold text-[var(--text)]">यह क्या है?</h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              Pick what you are selling. We will find listings like it and read the market from
              them.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCategory(c.key)}
                  className={cn(
                    "min-h-[56px] rounded-[var(--radius-input)] border px-3 py-2 text-left",
                    category === c.key
                      ? "border-[var(--brand-magenta)] bg-[var(--brand-magenta-50)]"
                      : "border-[var(--border)] hover:bg-[var(--surface-sunken)]",
                  )}
                >
                  <span className="hi block text-[13px] font-medium text-[var(--text)]">
                    {c.labelHi}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)]">{c.label}</span>
                </button>
              ))}
            </div>

            {twins && twins.value.length > 0 ? (
              <div className="mt-4 rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3">
                <p className="text-[12px] font-semibold text-[var(--text)]">
                  We found {twins.value.length} listings like this
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                  They sell between {inr(Math.min(...twins.value.map((t) => t.listing.price)))} and{" "}
                  {inr(Math.max(...twins.value.map((t) => t.listing.price)))}. Your listing has no
                  history yet, so we borrow the market from these.
                </p>
                <div className="mt-1.5">
                  <TraceLink
                    traced={{ value: twins.value.length, trace: twins.trace, assumptions: twins.assumptions }}
                    label="How we found these look-alikes"
                    labelHi="मिलान कैसे हुआ"
                  />
                </div>
              </div>
            ) : null}
          </Card>
        ) : null}

        {/* Step 2 — one number she knows, everything else pre-filled and sourced. */}
        {step === 1 && inputs ? (
          <Card className="p-4">
            <h2 className="hi text-base font-semibold text-[var(--text)]">आपके नंबर</h2>
            <p className="text-[12px] text-[var(--text-muted)]">
              Only the first two are yours to type. The rest we already know from your own orders —
              change any of them if we have it wrong.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="What the goods cost you"
                labelHi="माल की लागत"
                value={cogs}
                onChange={setCogs}
                placeholder="180"
                prefix="₹"
                source="Only you know this one"
                autoFocus
              />
              <Field
                label="Weight with packing"
                labelHi="पैकिंग सहित वज़न"
                value={grams}
                onChange={setGrams}
                placeholder="500"
                suffix="g"
                source={
                  Number(grams) > 0
                    ? `Shipping for this weight: ${inr(freightFor(Number(grams)))}`
                    : "Shipping is charged by weight slab"
                }
              />
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
                From your own orders
              </p>
              <dl className="mt-2 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Parcels refused",
                    labelHi: "मना किए पार्सल",
                    value: pct(inputs.rtoRate),
                    note: `From your ${pct(seller?.codShare ?? 0, 0)} cash-on-delivery share`,
                  },
                  {
                    label: "Returned after delivery",
                    labelHi: "वापसी",
                    value: pct(inputs.returnRate),
                    note: "The average for this category",
                  },
                  {
                    label: "Spent on ads",
                    labelHi: "विज्ञापन",
                    value: pct(inputs.adSpendRate),
                    note: "What you spend across your catalogue",
                  },
                  {
                    label: "Packaging",
                    labelHi: "पैकिंग",
                    value: inr(inputs.packaging),
                    note: "Your usual per-parcel packing cost",
                  },
                ].map((f) => (
                  <div
                    key={f.label}
                    className="rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2"
                  >
                    <dt className="flex items-baseline justify-between gap-2">
                      <span>
                        <span className="hi text-[12px] font-medium text-[var(--text)]">
                          {f.labelHi}
                        </span>
                        <span className="ml-1.5 text-[11px] text-[var(--text-muted)]">{f.label}</span>
                      </span>
                      <span className="tabular shrink-0 text-[13px] font-semibold text-[var(--text)]">
                        {f.value}
                      </span>
                    </dt>
                    <dd className="mt-0.5 text-[11px] text-[var(--text-subtle)]">{f.note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Card>
        ) : null}

        {/* Step 3 — the verdict. */}
        {step === 2 ? (
          band && floor && inputs && ceiling ? (
            <VerdictCard
              band={band.value}
              floor={floor}
              inputs={inputs}
              ceiling={ceiling.value}
              codShare={seller?.codShare ?? 0.8}
              onList={(price) => {
                setListed(price);
              }}
              onBack={() => setStep(1)}
            />
          ) : (
            <EmptyState
              title="We need a little more to judge this"
              description="Go back and enter what the goods cost you and how much the parcel weighs."
            />
          )
        ) : null}

        {step === 3 && band ? (
          <Card className="p-4">
            <h2 className="text-base font-semibold text-[var(--text)]">Ready to list</h2>
            <p className="mt-1 text-[13px] text-[var(--text-muted)]">
              {verdictFor(band.value) === "DONT_LIST"
                ? "We would not list this yet, but the choice is yours."
                : `We suggest ${inr(band.value.recommended)}.`}
            </p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => setListed(band.value.recommended || Math.round(ceiling?.value ?? 0))}
            >
              List it
            </Button>
          </Card>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={14} aria-hidden />
              Back
            </Button>
          ) : (
            <span />
          )}
          {step < 2 ? (
            <Button variant="primary" disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
              {step === 1 ? "See the verdict" : "Next"}
            </Button>
          ) : (
            <span />
          )}
        </div>

        {analyses.length === 0 && seller ? (
          <p className="mt-4 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
            You have nothing listed yet, so we are using the rates a seller in {seller.city} with
            your cash-on-delivery share would typically see. Once you have orders of your own, these
            become your real numbers.
          </p>
        ) : null}
      </StateGate>
    </Page>
  );
}

function Field({
  label,
  labelHi,
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  source,
  autoFocus,
}: {
  label: string;
  labelHi: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  source: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block">
        <span className="hi text-[13px] font-medium text-[var(--text)]">{labelHi}</span>
        <span className="ml-1.5 text-[12px] text-[var(--text-muted)]">{label}</span>
        <div className="mt-1.5 flex items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3">
          {prefix ? <span className="text-sm text-[var(--text-muted)]">{prefix}</span> : null}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder={placeholder}
            inputMode="numeric"
            autoFocus={autoFocus}
            className="tabular h-11 w-full bg-transparent text-sm text-[var(--text)] outline-none"
          />
          {suffix ? <span className="text-sm text-[var(--text-muted)]">{suffix}</span> : null}
        </div>
      </label>
      <p className="mt-1 text-[11px] text-[var(--text-subtle)]">{source}</p>
    </div>
  );
}
