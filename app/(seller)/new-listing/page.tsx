"use client";

/**
 * S4 · New Listing — the cold-start flow.
 *
 * She types the one number only she knows (cost of goods) and the parcel
 * weight. Everything else is Meesho's data, each line saying where it came
 * from. The market comes from real look-alikes when they exist, and from a
 * wider category prior when they do not (lib/new-listing-market.ts).
 *
 * Query parameters (category, cogs, grams, planned, cluster, step) let Story
 * Mode deep-link straight to a real verdict.
 */

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { TraceLink } from "@/components/shared/money-value";
import { Page, PageHeader } from "@/components/shared/page-header";
import { StatusChip } from "@/components/shared/status-chip";
import { VerdictCard } from "@/components/listing/verdict-card";
import { StepNumbers } from "@/components/listing/step-numbers";
import { resolveNewListingMarket } from "@/lib/new-listing-market";
import { useSeller } from "@/lib/use-seller";
import { inr } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Category } from "@/engine/types";

const CATEGORIES: { key: Category; label: string; labelHi: string }[] = [
  { key: "kurti", label: "Kurti", labelHi: "कुर्ती" },
  { key: "saree", label: "Saree", labelHi: "साड़ी" },
  { key: "dupatta", label: "Zari dupatta", labelHi: "ज़री दुपट्टा" },
  { key: "co-ord-set", label: "Co-ord set", labelHi: "को-ऑर्ड सेट" },
  { key: "bedsheet", label: "Bedsheet", labelHi: "चादर" },
  { key: "kitchen-storage", label: "Kitchen storage", labelHi: "रसोई का डिब्बा" },
  { key: "phone-cover", label: "Phone cover", labelHi: "फ़ोन कवर" },
  { key: "jewellery-set", label: "Jewellery set", labelHi: "गहने का सेट" },
];

const STEPS = ["What it is", "Your numbers", "The verdict"];

function Wizard() {
  const router = useRouter();
  const q = useSearchParams();
  const { world, seller, status, error } = useSeller();

  const [step, setStep] = useState(Number(q.get("step") ?? 0));
  const [category, setCategory] = useState<Category | null>((q.get("category") as Category) ?? null);
  const [cogs, setCogs] = useState(q.get("cogs") ?? "");
  const [grams, setGrams] = useState(q.get("grams") ?? "");
  const [listed, setListed] = useState<number | null>(null);
  const planned = Number(q.get("planned")) || undefined;
  const clusterId = q.get("cluster") ?? undefined;

  const market = useMemo(() => {
    if (!world || !seller || !category) return null;
    return resolveNewListingMarket(world, {
      seller,
      category,
      cogs: Number(cogs) || 0,
      grams: Number(grams) || 450,
      clusterId,
    });
  }, [world, seller, category, cogs, grams, clusterId]);

  const canProceed = step === 0 ? !!category : Number(cogs) > 0 && Number(grams) > 0;

  if (listed !== null) {
    return (
      <Page width="narrow">
        <Card className="p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--success-bg)]">
            <Check size={22} className="text-[var(--success)]" aria-hidden />
          </div>
          <h1 className="hi type-h1 mt-3 text-[var(--text)]">सामान डल गया</h1>
          <p className="type-body mt-1 text-[var(--text-muted)]">
            Listed at <strong className="text-[var(--text)]">{inr(listed)}</strong>. Your price ladder starts tomorrow, and
            we will tell you if a cost moves enough to matter.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Button variant="primary" onClick={() => router.push("/catalogue")}>See my catalogue</Button>
            <Button variant="secondary" onClick={() => { setListed(null); setStep(0); setCategory(null); setCogs(""); setGrams(""); }}>List another</Button>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page width="narrow" className="seller-flow">
      <PageHeader titleHi="नया सामान" title="New listing" description="Tell us what the goods cost you, and we will tell you honestly whether this can work." />

      <ol className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span className={cn("tabular grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold", i === step ? "bg-[var(--text)] text-[var(--surface)]" : i < step ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]")}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={cn("text-[13px]", i === step ? "font-semibold text-[var(--text)]" : "text-[var(--text-subtle)]")}>{label}</span>
            {i < STEPS.length - 1 ? <span aria-hidden className="mx-1 h-px w-5 bg-[var(--border-strong)]" /> : null}
          </li>
        ))}
      </ol>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-80 w-full" />}>
        {step === 0 ? (
          <Card className="p-4 sm:p-5">
            <CardHead titleHi="यह क्या है?" title="What are you selling?" description="We find listings like it and read the market from them." />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)} aria-pressed={category === c.key} className={cn("min-h-[58px] rounded-[var(--radius-input)] px-3 py-2 text-left transition-colors", category === c.key ? "bg-[var(--brand-magenta-50)] shadow-[inset_0_0_0_1.5px_var(--brand-magenta)]" : "shadow-[inset_0_0_0_1px_var(--border)] hover:bg-[var(--surface-sunken)]")}>
                  <span className="hi block text-[14px] font-medium text-[var(--text)]">{c.labelHi}</span>
                  <span className="block text-[12px] text-[var(--text-muted)]">{c.label}</span>
                </button>
              ))}
            </div>
            {market ? (
              <div className="mt-4 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-3">
                {market.route === "TWINS" ? (
                  <p className="type-small text-[var(--text)]">
                    We found <strong className="font-semibold">{market.twins.value.length} listings like this</strong>. Your listing has no history
                    yet, so we borrow the market from them.{" "}
                    <TraceLink traced={{ value: market.twins.value.length, trace: market.twins.trace, assumptions: [] }} label="How we found these look-alikes" labelHi="मिलान कैसे हुआ" />
                  </p>
                ) : (
                  <p className="type-small text-[var(--text)]">
                    <StatusChip tone="info">NEW / THIN</StatusChip>{" "}
                    Nothing in the catalogue is close enough to this product. We will borrow from related categories at a similar
                    weight and show the result as a wider range.
                  </p>
                )}
              </div>
            ) : null}
          </Card>
        ) : null}

        {step === 1 ? (
          <StepNumbers cogs={cogs} grams={grams} setCogs={setCogs} setGrams={setGrams} market={market} codShare={seller?.codShare ?? 0.8} />
        ) : null}

        {step === 2 ? (
          market && Number(cogs) > 0 ? (
            <VerdictCard market={market} codShare={seller?.codShare ?? 0.8} plannedPrice={planned} onList={setListed} onBack={() => setStep(1)} />
          ) : (
            <EmptyState title="We need a little more to judge this" description="Go back and enter what the goods cost you and how much the parcel weighs." />
          )
        ) : null}

        <div className="mt-5 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={15} aria-hidden /> Back
            </Button>
          ) : <span />}
          {step < 2 ? (
            <Button variant="primary" disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
              {step === 1 ? "See the verdict" : "Next"}
            </Button>
          ) : <span />}
        </div>
      </StateGate>
    </Page>
  );
}

/** Keyed on the query string, so a new deep link (from Story Mode) starts a fresh wizard. */
function KeyedWizard() {
  const q = useSearchParams();
  return <Wizard key={q.toString()} />;
}

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-80 w-full" /></div>}>
      <KeyedWizard />
    </Suspense>
  );
}
