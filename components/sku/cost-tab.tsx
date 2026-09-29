"use client";

/**
 * S3 · Cost tab — the waterfall, then every line item, each one traced.
 */

import { Card } from "@/components/ui/card";
import { WaterfallChart } from "@/components/charts/waterfall-chart";
import { LeakageFunnel } from "@/components/charts/leakage-funnel";
import { MoneyValue } from "@/components/shared/money-value";
import { buildWaterfall } from "@/engine/waterfall";
import { paidFraction } from "@/engine/cost";
import { slabFor } from "@/engine/money";
import type { ListingAnalysis } from "@/lib/selectors";
import { inr, pct } from "@/lib/format";

export function CostTab({ analysis }: { analysis: ListingAnalysis }) {
  const { listing, inputs, floor } = analysis;
  const waterfall = buildWaterfall(listing.price, inputs);
  const paid = paidFraction(inputs.rtoRate, inputs.returnRate);
  const slab = slabFor(listing.weightGrams);

  const lines: { label: string; labelHi: string; value: string; note: string }[] = [
    {
      label: "Cost of goods",
      labelHi: "माल की लागत",
      value: inr(inputs.cogs),
      note: "What you paid your supplier. The one number only you know.",
    },
    {
      label: "Forward shipping",
      labelHi: "भेजने का भाड़ा",
      value: inr(inputs.forwardFreight),
      note: `Your parcel weighs ${listing.weightGrams}g, which puts it in the up-to-${slab.maxGrams}g slab.`,
    },
    {
      label: "Return shipping",
      labelHi: "वापसी का भाड़ा",
      value: inr(inputs.reverseFreight, 2),
      note: "Collecting from a customer address costs more than shipping out.",
    },
    {
      label: "Packaging",
      labelHi: "पैकिंग",
      value: inr(inputs.packaging),
      note: "Polybag, tape and label, per parcel.",
    },
    {
      label: "Refused parcels",
      labelHi: "मना किए पार्सल",
      value: pct(inputs.rtoRate),
      note: "Driven by how many of your orders are cash on delivery, and where they go.",
    },
    {
      label: "Returned after delivery",
      labelHi: "डिलीवरी के बाद वापसी",
      value: pct(inputs.returnRate),
      note: "The category average. Fit and colour are the usual reasons.",
    },
    {
      label: "Ads",
      labelHi: "विज्ञापन",
      value: pct(inputs.adSpendRate),
      note: "A share of the price, so it grows as the price grows — that is why it changes the floor.",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <WaterfallChart waterfall={waterfall.value} />
      </Card>

      {slab.gramsToNextSlabDown !== null && slab.savingIfDropped > 0 ? (
        <Card className="border-l-[3px] border-l-[var(--warning)] p-4">
          <p className="text-[13px] leading-relaxed text-[var(--text)]">
            <strong>A weight slab is worth {inr(slab.savingIfDropped)} a parcel.</strong> This
            parcel is {slab.gramsToNextSlabDown}g over the next slab down. Lighter packaging would
            cut {inr(slab.savingIfDropped)} from every single order — which moves your survival
            price, not just this month&rsquo;s bill.
          </p>
        </Card>
      ) : null}

      <Card className="p-4">
        <LeakageFunnel
          data={{
            dispatched: 100,
            delivered: (1 - inputs.rtoRate) * 100,
            paid: paid.value * 100,
            rtoCost: inputs.rtoRate * 100 * inputs.reverseFreight * 0.5,
            returnCost: (1 - inputs.rtoRate) * inputs.returnRate * 100 * inputs.reverseFreight,
            netPerPaid: analysis.contribution.value,
          }}
        />
      </Card>

      <Card className="p-4">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">
          Every line, and where it comes from
        </h3>
        <table className="mt-3 w-full text-left text-[13px]">
          <caption className="sr-only">Cost line items for {listing.name}</caption>
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className="pb-2 font-semibold text-[var(--text-muted)]">Item</th>
              <th scope="col" className="pb-2 text-right font-semibold text-[var(--text-muted)]">Value</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.label} className="border-b border-[var(--border)] last:border-0">
                <td className="py-2.5 pr-3">
                  <span className="hi font-medium text-[var(--text)]">{l.labelHi}</span>
                  <span className="ml-1.5 text-[var(--text-muted)]">{l.label}</span>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-subtle)]">{l.note}</p>
                </td>
                <td className="tabular py-2.5 text-right align-top font-medium text-[var(--text)]">
                  {l.value}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-[var(--border-strong)]">
              <td className="py-3 pr-3">
                <span className="hi font-semibold text-[var(--text)]">सुरक्षा दाम</span>
                <span className="ml-1.5 text-[var(--text-muted)]">Survival price</span>
                <p className="mt-0.5 text-[11px] text-[var(--text-subtle)]">
                  Everything above, divided by the share of parcels that actually pay you.
                </p>
              </td>
              <td className="py-3 text-right align-top">
                <MoneyValue
                  value={floor.value}
                  traced={floor}
                  label={`Survival price — ${listing.name}`}
                  labelHi="सुरक्षा दाम"
                  size="lg"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
