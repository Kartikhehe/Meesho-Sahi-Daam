"use client";

/**
 * The leakage funnel: 100 dispatched → 83 delivered → 66.4 paid.
 *
 * Widths proportional, with the cost carried at each stage shown beneath. This
 * is the chart that answers "where did the other third of my parcels go?" —
 * and it is deliberately expressed in parcels, not percentages, because a
 * seller counts parcels.
 */

import { useId } from "react";
import { inr } from "@/lib/format";
import { ChartFrame } from "./chart-frame";

const W = 720;
const H = 208;
const PAD = 24;
const BAR_H = 52;
const TOP = 34;

export type FunnelInput = {
  dispatched: number;
  delivered: number;
  paid: number;
  /** Rupees lost at each stage, per 100 parcels dispatched. */
  rtoCost: number;
  returnCost: number;
  /** What the surviving parcels actually contribute. */
  netPerPaid: number;
};

export function LeakageFunnel({ data }: { data: FunnelInput }) {
  const id = useId();
  const { dispatched, delivered, paid } = data;

  const scale = (n: number) => (n / Math.max(dispatched, 1)) * (W - PAD * 2);

  const stages = [
    {
      key: "dispatched",
      label: "Parcels you shipped",
      labelHi: "आपने भेजे",
      count: dispatched,
      fill: "var(--info)",
      bg: "var(--info-bg)",
      cost: null as number | null,
      note: "Every one of these costs you goods, packing and freight up front.",
    },
    {
      key: "delivered",
      label: "Reached the customer",
      labelHi: "ग्राहक तक पहुँचे",
      count: delivered,
      fill: "var(--warning)",
      bg: "var(--warning-bg)",
      cost: data.rtoCost,
      note: `${(dispatched - delivered).toFixed(0)} were refused. You pay both freight legs and get the goods back handled.`,
    },
    {
      key: "paid",
      label: "Actually paid you",
      labelHi: "जिनसे पैसा मिला",
      count: paid,
      fill: "var(--success)",
      bg: "var(--success-bg)",
      cost: data.returnCost,
      note: `${(delivered - paid).toFixed(0)} more came back as returns after delivery.`,
    },
  ];

  const tableRows = stages.map((s) => ({
    label: `${s.labelHi} · ${s.label}`,
    value: `${s.count.toFixed(1)} parcels`,
    note: s.cost ? `${inr(s.cost)} lost at this step` : s.note,
  }));

  return (
    <ChartFrame
      title={`Of every ${dispatched.toFixed(0)} parcels you ship, ${paid.toFixed(0)} pay you`}
      titleHi="कितने पार्सल से सच में पैसा मिला"
      description={`${dispatched.toFixed(0)} dispatched, ${delivered.toFixed(0)} delivered, ${paid.toFixed(0)} paid.`}
      tableRows={tableRows}
      tableHeaders={["Stage", "Parcels"]}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
        <title id={`${id}-t`}>Parcel leakage funnel</title>
        <desc id={`${id}-d`}>
          {dispatched.toFixed(0)} parcels dispatched, {delivered.toFixed(0)} delivered,{" "}
          {paid.toFixed(0)} paid. The rest cost both freight legs and a write-down on the goods.
        </desc>

        {stages.map((s, i) => {
          const y = TOP + i * (BAR_H + 8);
          const width = Math.max(scale(s.count), 2);
          return (
            <g key={s.key}>
              <rect x={PAD} y={y} width={W - PAD * 2} height={BAR_H} rx="4" fill="var(--surface-sunken)" />
              <rect x={PAD} y={y} width={width} height={BAR_H} rx="4" fill={s.bg} stroke={s.fill} strokeWidth="1.5" />

              <text x={PAD + 12} y={y + 21} className="hi" fill="var(--text)" fontSize="12" fontWeight="600">
                {s.labelHi}
              </text>
              <text x={PAD + 12} y={y + 37} fill="var(--text-muted)" fontSize="10.5">
                {s.label}
              </text>

              <text
                x={PAD + width - 12}
                y={y + 31}
                textAnchor="end"
                className="tabular"
                fill={s.fill}
                fontSize="18"
                fontWeight="700"
              >
                {s.count.toFixed(s.count % 1 === 0 ? 0 : 1)}
              </text>

              {s.cost ? (
                <text
                  x={W - PAD - 8}
                  y={y + 31}
                  textAnchor="end"
                  className="tabular"
                  fill="var(--danger)"
                  fontSize="11"
                  fontWeight="600"
                >
                  −{inr(s.cost)}
                </text>
              ) : null}
            </g>
          );
        })}

        <text x={PAD} y={H - 8} fill="var(--text-muted)" fontSize="10.5">
          The {(dispatched - paid).toFixed(0)} that never paid still cost you freight both ways, GST
          on that freight, and the goods came back worth less.
        </text>
      </svg>
    </ChartFrame>
  );
}
