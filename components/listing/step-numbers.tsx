"use client";

/**
 * Step 2 — the one number only she knows, and everything else we already know.
 *
 * Three of the hard cases live here:
 *  - She does not know her cost → "I'm not sure" shows a cost ladder: her floor
 *    at five cost levels, in rupees, and she picks the closest.
 *  - She has a bill → a MOCK bill reader fills a typical value. It says plainly
 *    that it does not read the image; it exists to show the flow.
 *  - The cost looks implausible → a gentle note against what comparable
 *    products usually cost (an aggregate, never another seller's figure).
 *    Never a block.
 */

import { useState } from "react";
import { Camera, HelpCircle } from "lucide-react";
import { Card, CardHead } from "@/components/ui/card";
import { Callout } from "@/components/shared/callout";
import { StatusChip } from "@/components/shared/status-chip";
import { LAUNCH_COPY } from "@/engine/band";
import { costLadder, cogsPlausibility, type NewListingMarket } from "@/lib/new-listing-market";
import { freightFor } from "@/engine/money";
import { inr, pct } from "@/lib/format";
import { cn } from "@/lib/cn";

export function StepNumbers({
  cogs,
  grams,
  setCogs,
  setGrams,
  market,
  codShare,
}: {
  cogs: string;
  grams: string;
  setCogs: (v: string) => void;
  setGrams: (v: string) => void;
  market: NewListingMarket | null;
  codShare: number;
}) {
  const [unsure, setUnsure] = useState(false);
  const [ocr, setOcr] = useState<string | null>(null);
  const plaus = market ? cogsPlausibility(Number(cogs), market.cogsBand) : "ok";

  return (
    <Card className="p-4 sm:p-5">
      <CardHead titleHi="आपके नंबर" title="Your numbers" description="Only the first two are yours to type. The rest comes from Meesho's own data — each line says where." />

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="What the goods cost you" labelHi="माल की लागत" value={cogs} onChange={setCogs} prefix="₹" placeholder="180" source="Only you know this one" autoFocus />
        <Field label="Weight with packing" labelHi="पैकिंग सहित वज़न" value={grams} onChange={setGrams} suffix="g" placeholder="450" source={Number(grams) > 0 ? `Shipping at this weight: ${inr(freightFor(Number(grams)))} — exact, from the rate card` : "Shipping is charged by weight slab"} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => setUnsure((v) => !v)} aria-expanded={unsure} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--brand-ink)] shadow-[inset_0_0_0_1px_var(--border)] hover:bg-[var(--surface-sunken)]">
          <HelpCircle size={15} aria-hidden /> <span className="hi">पक्का नहीं पता</span> · I&rsquo;m not sure of my cost
        </button>
        <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[var(--text-muted)] shadow-[inset_0_0_0_1px_var(--border)] hover:bg-[var(--surface-sunken)]">
          <Camera size={15} aria-hidden /> Photo of the bill
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f || !market?.cogsBand) return;
              // MOCK: no image is read. A typical value is filled, nudged by
              // the file size so two photos do not give the same number.
              const v = Math.round(market.cogsBand.median * (0.9 + (f.size % 200) / 1000));
              setCogs(String(v));
              setOcr(f.name);
            }}
          />
        </label>
      </div>

      {ocr ? (
        <Callout tone="neutral" className="mt-3" title="Mock bill reader — please check this number">
          This prototype does not read the photo ({ocr}). It filled a typical cost for this kind of product so you can see the
          flow. Correct it if your bill says otherwise.
        </Callout>
      ) : null}

      {unsure && market ? (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] p-4">
          <p className="type-h3 text-[var(--text)]">Your floor at five possible costs</p>
          <p className="type-caption text-[var(--text-subtle)]">Pick the one closest to what you pay. You can change it later.</p>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {costLadder(market).map((row) => (
              <li key={row.cogs}>
                <button type="button" onClick={() => { setCogs(String(row.cogs)); setUnsure(false); }} className={cn("flex w-full flex-wrap items-center justify-between gap-2 py-2.5 text-left hover:bg-[var(--surface-sunken)]", Number(cogs) === row.cogs && "bg-[var(--brand-magenta-50)]")}>
                  <span className="tabular text-[14px] text-[var(--text)]">If goods cost <strong className="font-semibold">{inr(row.cogs)}</strong></span>
                  <span className="flex items-center gap-2">
                    <span className="tabular text-[13px] text-[var(--text-muted)]">floor {inr(row.floor)}</span>
                    <StatusChip tone={LAUNCH_COPY[row.verdict].tone}>{LAUNCH_COPY[row.verdict].label}</StatusChip>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plaus !== "ok" ? (
        <Callout tone="warning" className="mt-4" title={plaus === "low" ? "That cost looks unusually low" : "That cost looks unusually high"}>
          Comparable products usually cost {plaus === "low" ? "noticeably more" : "noticeably less"} than {inr(Number(cogs))}.
          Worth checking the bill — we will use your number either way.
        </Callout>
      ) : null}

      {market ? (
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <p className="type-overline text-[var(--text-subtle)]">From Meesho&rsquo;s data</p>
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {[
              { hi: "मना किए पार्सल", en: "Refused at the door", v: pct(market.inputs.rtoRate), note: `Buyer-side: your ${pct(codShare, 0)} cash-on-delivery mix across pincode tiers` },
              { hi: "वापसी", en: "Returned after delivery", v: pct(market.inputs.returnRate), note: market.route === "TWINS" ? "Prior from look-alike listings" : "Prior from the category" },
              { hi: "विज्ञापन", en: "Ad spend", v: pct(market.inputs.adSpendRate), note: "Your rate across your catalogue" },
              { hi: "वापसी का भाड़ा", en: "Return shipping", v: inr(market.inputs.reverseFreight), note: "Exact, from the rate card — customer returns only" },
            ].map((f) => (
              <div key={f.en} className="rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2">
                <dt className="flex items-baseline justify-between gap-2">
                  <span><span className="hi text-[12.5px] font-medium text-[var(--text)]">{f.hi}</span> <span className="text-[11.5px] text-[var(--text-subtle)]">{f.en}</span></span>
                  <span className="tabular text-[13px] font-semibold text-[var(--text)]">{f.v}</span>
                </dt>
                <dd className="mt-0.5 text-[11.5px] text-[var(--text-subtle)]">{f.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Card>
  );
}

function Field({ label, labelHi, value, onChange, placeholder, prefix, suffix, source, autoFocus }: {
  label: string; labelHi: string; value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; suffix?: string; source: string; autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="block">
        <span className="hi text-[13px] font-medium text-[var(--text)]">{labelHi}</span>
        <span className="ml-1.5 text-[12px] text-[var(--text-muted)]">{label}</span>
        <div className="mt-1.5 flex h-11 items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-within:border-[var(--brand-magenta)]">
          {prefix ? <span className="text-sm text-[var(--text-subtle)]">{prefix}</span> : null}
          <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder={placeholder} inputMode="numeric" autoFocus={autoFocus} className="tabular w-full bg-transparent text-[15px] font-medium text-[var(--text)] outline-none" />
          {suffix ? <span className="text-sm text-[var(--text-subtle)]">{suffix}</span> : null}
        </div>
      </label>
      <p className="mt-1 text-[11.5px] text-[var(--text-subtle)]">{source}</p>
    </div>
  );
}
