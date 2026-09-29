"use client";

/**
 * S3 · History tab — orders and earnings over time, with the events that moved
 * them marked on the timeline.
 */

import { useId } from "react";
import { Card } from "@/components/ui/card";
import { ChartFrame } from "@/components/charts/chart-frame";
import { EmptyState } from "@/components/shared/empty-state";
import { StageChip } from "@/components/shared/status-chip";
import { TRIGGER_COPY } from "@/engine/triggers";
import { RETURN_WRITEDOWN } from "@/engine/constants";
import type { ListingAnalysis } from "@/lib/selectors";
import type { World } from "@/engine/types";
import { formatDateShort, inr, count } from "@/lib/format";

const W = 720;
const H = 220;
const PAD_L = 46;
const PAD_R = 46;
const PAD_T = 18;
const PAD_B = 40;

export function HistoryTab({ analysis, world }: { analysis: ListingAnalysis; world: World }) {
  const id = useId();
  const { listing } = analysis;

  const orders = world.orders.filter((o) => o.listingId === listing.id);
  const settlements = world.settlements.filter((s) => s.listingId === listing.id);
  const alerts = world.alerts.filter((a) => a.listingId === listing.id && !a.muted);

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet for this listing"
        description="Once parcels start moving, this shows what each day brought in and which events changed it."
      />
    );
  }

  const from = Math.max(world.day - 90, Math.min(...orders.map((o) => o.day)));
  const days: { day: number; orders: number; net: number }[] = [];
  for (let d = from; d <= world.day; d++) {
    const dayOrders = orders.filter((o) => o.day === d);
    const dayNet = settlements
      .filter((s) => s.dispatchedDay === d)
      .reduce((a, s) => a + s.netCredit - (s.outcome === "delivered" ? s.cogs : s.cogs * RETURN_WRITEDOWN), 0);
    days.push({ day: d, orders: dayOrders.length, net: dayNet });
  }

  const maxOrders = Math.max(...days.map((d) => d.orders), 1);
  const nets = days.map((d) => d.net);
  const maxNet = Math.max(...nets, 1);
  const minNet = Math.min(...nets, 0);

  const x = (d: number) => PAD_L + ((d - from) / Math.max(world.day - from, 1)) * (W - PAD_L - PAD_R);
  const yOrders = (n: number) => H - PAD_B - (n / maxOrders) * (H - PAD_T - PAD_B);
  const yNet = (n: number) =>
    H - PAD_B - ((n - minNet) / Math.max(maxNet - minNet, 1)) * (H - PAD_T - PAD_B);

  const netPath = days.map((d, i) => `${i ? "L" : "M"}${x(d.day)},${yNet(d.net)}`).join(" ");
  const totalNet = nets.reduce((a, b) => a + b, 0);

  const tableRows = days
    .filter((_, i) => i % Math.max(Math.ceil(days.length / 10), 1) === 0)
    .map((d) => ({
      label: formatDateShort(d.day),
      value: `${count(d.orders)} orders · ${inr(d.net)}`,
    }));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <ChartFrame
          title="Orders and earnings, day by day"
          titleHi="रोज़ के ऑर्डर और कमाई"
          description={`Over the last ${days.length} days this listing took ${count(orders.length)} orders and earned ${inr(totalNet)}.`}
          tableRows={tableRows}
          tableHeaders={["Day", "Orders and earnings"]}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
            <title id={`${id}-t`}>Daily orders and earnings</title>
            <desc id={`${id}-d`}>
              {count(orders.length)} orders over {days.length} days, earning {inr(totalNet)} in
              total.
            </desc>

            <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border-strong)" />

            {minNet < 0 ? (
              <line x1={PAD_L} y1={yNet(0)} x2={W - PAD_R} y2={yNet(0)} stroke="var(--danger)" strokeDasharray="3 3" opacity="0.4" />
            ) : null}

            {days.map((d) => (
              <rect
                key={d.day}
                x={x(d.day) - 1.5}
                y={yOrders(d.orders)}
                width="3"
                height={Math.max(H - PAD_B - yOrders(d.orders), 0)}
                fill="var(--neutral-data)"
                opacity="0.35"
              />
            ))}

            <path d={netPath} fill="none" stroke={totalNet >= 0 ? "var(--success)" : "var(--danger)"} strokeWidth="2" />

            {/* Alerts, marked where they fired. */}
            {alerts.map((a) =>
              a.day >= from ? (
                <g key={a.id}>
                  <line x1={x(a.day)} y1={PAD_T} x2={x(a.day)} y2={H - PAD_B} stroke="var(--warning)" strokeWidth="1" strokeDasharray="2 2" opacity="0.7" />
                  <circle cx={x(a.day)} cy={PAD_T} r="3.5" fill="var(--warning)">
                    <title>
                      {formatDateShort(a.day)} — {TRIGGER_COPY[a.triggerId].label}: {a.message}
                    </title>
                  </circle>
                </g>
              ) : null,
            )}

            <text x={PAD_L} y={H - 10} className="tabular" fill="var(--text-subtle)" fontSize="9.5">
              {formatDateShort(from)}
            </text>
            <text x={W - PAD_R} y={H - 10} textAnchor="end" className="tabular" fill="var(--text-subtle)" fontSize="9.5">
              {formatDateShort(world.day)}
            </text>
            <text x={16} y={H / 2} fill="var(--neutral-data)" fontSize="9.5" transform={`rotate(-90 16 ${H / 2})`} textAnchor="middle">
              orders
            </text>
            <text x={W - 10} y={H / 2} fill="var(--success)" fontSize="9.5" transform={`rotate(90 ${W - 10} ${H / 2})`} textAnchor="middle">
              earnings ₹
            </text>
          </svg>
        </ChartFrame>
        <p className="mt-2 text-[12px] text-[var(--text-muted)]">
          Grey bars are orders; the line is what those parcels actually earned after every
          deduction. Yellow marks are alerts that fired.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">Where this listing is in its life</h3>
        <div className="mt-2 flex items-center gap-2">
          <StageChip stage={listing.stage} />
          <span className="text-[12px] text-[var(--text-muted)]">
            Listed {formatDateShort(listing.listedDay)} · {count(world.day - listing.listedDay)} days
            old
          </span>
        </div>
      </Card>

      {alerts.length > 0 ? (
        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">What fired, and when</h3>
          <ul className="mt-2 space-y-2">
            {alerts.slice(0, 8).map((a) => (
              <li key={a.id} className="border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-medium text-[var(--text)]">
                    {TRIGGER_COPY[a.triggerId].label}
                  </span>
                  <span className="tabular shrink-0 text-[11px] text-[var(--text-subtle)]">
                    {formatDateShort(a.day)}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--text-muted)]">{a.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
