"use client";

/**
 * Kill criteria — the four numbers that say "stop the pilot", each with its
 * threshold, computed live from the treated group. A pilot that cannot fail
 * is not an experiment.
 */

import { Card, CardHead } from "@/components/ui/card";
import { StatusChip } from "@/components/shared/status-chip";
import { buyerPriceIndex } from "@/lib/guardrails";
import { cohortHealth } from "@/lib/cohort";
import { useSellerStore } from "@/lib/store/world-store";
import type { World } from "@/engine/types";
import { count, pct } from "@/lib/format";

export function KillCriteria({ world }: { world: World }) {
  const accepted = useSellerStore((s) => s.accepted);
  const muted = useSellerStore((s) => s.mutedAlerts);

  const treated = cohortHealth(world).filter((h) => h.seller.treatment === "treated");
  const listings = treated.reduce((a, h) => a + h.listingCount, 0);
  const below = treated.reduce((a, h) => a + h.belowFloorCount + h.noBandCount, 0);
  const ids = new Set(treated.map((h) => h.seller.id));
  const sent = world.alerts.filter((a) => ids.has(a.sellerId) && !a.muted);
  const acc = [...ids].reduce((a, id) => a + (accepted[id] ?? 0), 0);
  const mutedN = sent.filter((a) => muted.includes(a.id)).length;
  const bpi = buyerPriceIndex(world);

  const rows = [
    { label: "Treated listings below their own floor", value: listings ? below / listings : 0, show: (v: number) => pct(v, 0), limit: "≤ 20%", ok: (v: number) => v <= 0.2, note: `${count(below)} of ${count(listings)}` },
    { label: "Recommendations accepted", value: sent.length ? acc / sent.length : 0, show: (v: number) => pct(Math.min(v, 1), 0), limit: "≥ 40%", ok: (v: number) => v >= 0.4, note: `${count(acc)} accepted of ${count(sent.length)} sent` },
    { label: "Buyer Price Index", value: bpi, show: (v: number) => v.toFixed(1), limit: "≤ 100", ok: (v: number) => v <= 100, note: "treated vs control listed prices" },
    { label: "Alerts muted by sellers", value: sent.length ? mutedN / sent.length : 0, show: (v: number) => pct(v, 0), limit: "≤ 10%", ok: (v: number) => v <= 0.1, note: `${count(mutedN)} of ${count(sent.length)} sent` },
  ];
  const breached = rows.filter((r) => !r.ok(r.value)).length;

  return (
    <Card className="mb-4 p-4 sm:p-5">
      <CardHead title="Kill criteria" description={breached ? `${breached} of 4 breached — on these numbers the pilot should pause and be reviewed before it scales.` : "All four within their limits — the pilot can continue."} />
      <ul className="mt-3 divide-y divide-[var(--border)]">
        {rows.map((r) => (
          <li key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <span className="min-w-0 flex-1 text-[13px] text-[var(--text)]">{r.label}<span className="block text-[11.5px] text-[var(--text-subtle)]">{r.note}</span></span>
            <span className="tabular text-[15px] font-semibold text-[var(--text)]">{r.show(r.value)}</span>
            <span className="w-14 text-right text-[12px] text-[var(--text-subtle)]">{r.limit}</span>
            <StatusChip tone={r.ok(r.value) ? "success" : "danger"}>{r.ok(r.value) ? "Within" : "Breached"}</StatusChip>
          </li>
        ))}
      </ul>
    </Card>
  );
}
