/**
 * The whole catalogue as one bar, split by band position.
 *
 * "68 of your 78 listings" is a sentence; this makes it a shape. The eye gets
 * the proportion before reading any number.
 */

import { count } from "@/lib/format";
import type { SellerSummary } from "@/lib/selectors";

export function CatalogueSplit({ summary }: { summary: SellerSummary }) {
  const total = Math.max(summary.listingCount, 1);
  const segments = [
    { key: "below", n: summary.belowFloorCount, colour: "var(--danger)", labelHi: "घाटे में", label: "Below floor" },
    { key: "noband", n: summary.noBandCount, colour: "color-mix(in srgb, var(--danger) 55%, var(--surface))", labelHi: "कोई सही दाम नहीं", label: "No viable price" },
    { key: "gate", n: summary.aboveGateCount, colour: "var(--neutral-data)", labelHi: "दिख नहीं रहे", label: "Not seen" },
    { key: "healthy", n: summary.healthyCount, colour: "var(--success)", labelHi: "ठीक", label: "Healthy" },
  ].filter((s) => s.n > 0);

  return (
    <div>
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={segments.map((s) => `${s.n} ${s.label}`).join(", ")}
      >
        {segments.map((s) => (
          <span key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.n / total) * 100}%`, background: s.colour }} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-start gap-2">
            <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 rounded-full" style={{ background: s.colour }} />
            <span className="min-w-0 leading-tight">
              <span className="tabular text-[15px] font-semibold text-[var(--text)]">{count(s.n)}</span>
              <span className="hi ml-1.5 text-[12.5px] text-[var(--text-muted)]">{s.labelHi}</span>
              <span className="block text-[11px] text-[var(--text-subtle)]">{s.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
