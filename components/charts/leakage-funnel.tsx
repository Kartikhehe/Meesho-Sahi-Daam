"use client";

/**
 * The leakage funnel: dispatched → delivered → paid.
 *
 * Built in HTML rather than SVG so its labels stay at full size on a phone.
 * Expressed in parcels, because that is what a seller counts; the rupee cost
 * of each drop sits beside the drop it belongs to, not in a legend.
 */

import { Amount } from "@/components/shared/amount";
import { ChartFrame } from "./chart-frame";
import { count, inr, pct } from "@/lib/format";
import type { Funnel } from "@/engine/waterfall";

export type FunnelInput = Funnel;

export function LeakageFunnel({ data, perHundred = false }: { data: Funnel; perHundred?: boolean }) {
  const { dispatched, delivered, paid } = data;
  const base = Math.max(dispatched, 1);
  const fmt = (n: number) => (perHundred ? n.toFixed(n % 1 === 0 ? 0 : 1) : count(n));

  const stages = [
    {
      key: "dispatched",
      labelHi: "आपने भेजे",
      label: "Parcels you shipped",
      n: dispatched,
      fill: "var(--info)",
      track: "var(--info-bg)",
    },
    {
      key: "delivered",
      labelHi: "ग्राहक तक पहुँचे",
      label: "Reached the customer",
      n: delivered,
      fill: "var(--warning)",
      track: "var(--warning-bg)",
      drop: { n: dispatched - delivered, what: "refused at the door", cost: data.rtoCost },
    },
    {
      key: "paid",
      labelHi: "जिनसे पैसा मिला",
      label: "Actually paid you",
      n: paid,
      fill: "var(--success)",
      track: "var(--success-bg)",
      drop: { n: delivered - paid, what: "sent back after delivery", cost: data.returnCost },
    },
  ];

  const lost = data.rtoCost + data.returnCost;

  return (
    <ChartFrame
      title={`Of every ${fmt(dispatched)} parcels you ship, ${fmt(paid)} pay you`}
      titleHi="कितने पार्सल से सच में पैसा मिला"
      description={`${fmt(dispatched)} dispatched, ${fmt(delivered)} delivered, ${fmt(paid)} paid.`}
      tableRows={stages.map((s) => ({
        label: `${s.labelHi} · ${s.label}`,
        value: `${fmt(s.n)} parcels`,
        note: s.drop ? `${fmt(s.drop.n)} ${s.drop.what} — ${inr(s.drop.cost)} lost` : undefined,
      }))}
      tableHeaders={["Stage", "Parcels"]}
    >
      <ol className="space-y-3">
        {stages.map((s) => {
          const share = s.n / base;
          return (
            <li key={s.key}>
              {s.drop ? (
                <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 pl-1 text-[12px] text-[var(--text-muted)]">
                  <span aria-hidden className="text-[var(--danger)]">↓</span>
                  <span>
                    <strong className="tabular font-semibold text-[var(--text)]">{fmt(s.drop.n)}</strong>{" "}
                    {s.drop.what}
                  </span>
                  <span className="text-[var(--text-subtle)]">·</span>
                  <Amount value={-s.drop.cost} size="sm" tone="danger" />
                </p>
              ) : null}
              <div className="flex items-center gap-3">
                <div className="relative h-11 min-w-0 flex-1 overflow-hidden rounded-[var(--radius-input)] bg-[var(--surface-sunken)]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-[var(--radius-input)] border"
                    style={{ width: `${Math.max(share * 100, 2)}%`, background: s.track, borderColor: s.fill }}
                  />
                  <div className="relative flex h-full items-center px-3 leading-tight">
                    <span className="min-w-0">
                      <span className="hi block truncate text-[13px] font-semibold text-[var(--text)]">{s.labelHi}</span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">{s.label}</span>
                    </span>
                  </div>
                </div>
                <div className="w-[68px] shrink-0 text-right leading-tight">
                  <span className="type-h2 tabular block" style={{ color: s.fill }}>
                    {fmt(s.n)}
                  </span>
                  <span className="tabular text-[11px] text-[var(--text-subtle)]">{pct(share, 0)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="type-caption mt-3 text-[var(--text-muted)]">
        The {fmt(dispatched - paid)} that never paid still cost you shipping, GST on it, packing, and goods that came
        back worth less — <strong className="text-[var(--danger)]">{inr(lost)}</strong> in all.
      </p>
    </ChartFrame>
  );
}
