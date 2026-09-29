/**
 * One catalogue row, as it reads on a phone.
 *
 * The table's columns in the order a seller cares about them: what it is,
 * whether it is safe, then the three numbers — price, floor, and what each
 * parcel earns. Figures are plain here (no trace buttons) because the whole
 * card is one tap target; the derivations are a tap away on the listing.
 */

import { ChevronRight } from "lucide-react";
import { Amount } from "@/components/shared/amount";
import { BandChip } from "@/components/shared/status-chip";
import { ProductTile } from "@/components/shared/product-tile";
import type { ListingAnalysis } from "@/lib/selectors";
import { count } from "@/lib/format";

export function CatalogueCard({ a }: { a: ListingAnalysis }) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <ProductTile category={a.listing.category} colour={a.listing.attributes.colourFamily} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[var(--text)]">{a.listing.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <BandChip verdict={a.band.value.verdict} lang="hi" />
            <span className="text-[12px] text-[var(--text-subtle)]">{count(a.ordersLast30)} orders · 30 days</span>
          </div>
        </div>
        <ChevronRight size={18} aria-hidden className="mt-1 shrink-0 text-[var(--text-subtle)]" />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3">
        <div>
          <dt className="hi text-[11.5px] text-[var(--text-subtle)]">आपका दाम</dt>
          <dd className="mt-0.5">
            <Amount value={a.listing.price} size="md" />
          </dd>
        </div>
        <div>
          <dt className="hi text-[11.5px] text-[var(--text-subtle)]">सुरक्षा दाम</dt>
          <dd className="mt-0.5">
            <Amount value={a.floor.value} size="md" tone="muted" />
          </dd>
        </div>
        <div className="text-right">
          <dt className="hi text-[11.5px] text-[var(--text-subtle)]">हर पार्सल पर</dt>
          <dd className="mt-0.5">
            <Amount value={a.contribution.value} size="md" tone="auto" signed />
          </dd>
        </div>
      </dl>
    </div>
  );
}
