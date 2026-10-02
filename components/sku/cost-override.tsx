"use client";

/**
 * "My cost is different" — for the seller with her own factory, her own
 * logistics, or a bundle that ships as one parcel. She can override freight
 * and packaging for this listing only. It re-weights only her own inputs
 * (never anyone else's), shows a "custom inputs" chip wherever the listing
 * appears, and is written to the audit log with its effect on her floor.
 */

import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { survivalPrice } from "@/engine/cost";
import { useSellerStore } from "@/lib/store/world-store";
import { useAudit } from "@/lib/audit";
import type { ListingAnalysis } from "@/lib/selectors";
import { inr } from "@/lib/format";

type Key = "forwardFreight" | "reverseFreight" | "packaging";
const FIELDS: { key: Key; label: string; labelHi: string; note: string }[] = [
  { key: "forwardFreight", label: "Shipping out, per parcel", labelHi: "भेजने का भाड़ा", note: "If you ship with your own courier" },
  { key: "reverseFreight", label: "Return shipping, per return", labelHi: "वापसी का भाड़ा", note: "If you collect returns yourself" },
  { key: "packaging", label: "Packing, per parcel", labelHi: "पैकिंग", note: "If you pack in bulk or ship a bundle" },
];

export function CostOverride({ analysis }: { analysis: ListingAnalysis }) {
  const current = useSellerStore((s) => s.costOverrides[analysis.listing.id]);
  const setCostOverride = useSellerStore((s) => s.setCostOverride);
  const audit = useAudit();
  const [open, setOpen] = useState(!!current);
  const [draft, setDraft] = useState<Record<Key, string>>({
    forwardFreight: String(current?.forwardFreight ?? Math.round(analysis.inputs.forwardFreight)),
    reverseFreight: String(current?.reverseFreight ?? Math.round(analysis.inputs.reverseFreight)),
    packaging: String(current?.packaging ?? analysis.inputs.packaging),
  });

  const proposed = {
    forwardFreight: Number(draft.forwardFreight),
    reverseFreight: Number(draft.reverseFreight),
    packaging: Number(draft.packaging),
  };
  const before = analysis.floor.value;
  const after = survivalPrice({ ...analysis.inputs, ...proposed }).value;

  const save = () => {
    setCostOverride(analysis.listing.id, proposed);
    audit({
      capability: "seller.costOverride",
      action: "Set custom cost inputs",
      subject: `${analysis.listing.name} (${analysis.listing.id})`,
      before: `shipping ₹${Math.round(analysis.inputs.forwardFreight)}, returns ₹${Math.round(analysis.inputs.reverseFreight)}, packing ₹${analysis.inputs.packaging}`,
      after: `shipping ₹${proposed.forwardFreight}, returns ₹${proposed.reverseFreight}, packing ₹${proposed.packaging}`,
      blastRadius: `This listing only: floor ${inr(before)} → ${inr(after)}`,
    });
  };

  const clear = () => {
    setCostOverride(analysis.listing.id, null);
    audit({ capability: "seller.costOverride", action: "Removed custom cost inputs", subject: `${analysis.listing.name} (${analysis.listing.id})`, blastRadius: "This listing only: back to Meesho's rates" });
    setOpen(false);
  };

  return (
    <Card className="p-4 sm:p-5">
      <CardHead
        titleHi="मेरी लागत अलग है"
        title="My cost is different"
        description="Own factory, own courier, or a bundle that ships as one? Set your own numbers for this listing."
        action={!open ? <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Settings2 size={14} aria-hidden /> Change</Button> : null}
      />
      {open ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="hi text-[13px] font-medium text-[var(--text)]">{f.labelHi}</span>
                <span className="block text-[11.5px] text-[var(--text-subtle)]">{f.label}</span>
                <div className="mt-1.5 flex h-11 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 focus-within:border-[var(--brand-magenta)]">
                  <span className="text-[var(--text-subtle)]">₹</span>
                  <input value={draft[f.key]} inputMode="numeric" onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value.replace(/[^0-9]/g, "") }))} className="tabular w-full bg-transparent text-[15px] font-medium outline-none" />
                </div>
                <span className="mt-1 block text-[11.5px] text-[var(--text-subtle)]">{f.note}</span>
              </label>
            ))}
          </div>
          <p className="type-small mt-4 text-[var(--text)]">
            Your floor would move from <strong>{inr(before)}</strong> to <strong className={after < before ? "text-[var(--success)]" : "text-[var(--danger)]"}>{inr(after)}</strong>. Only
            this listing changes, and the change is recorded.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={save}>Use my numbers</Button>
            {current ? <Button variant="ghost" onClick={clear}>Back to Meesho&rsquo;s rates</Button> : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}
