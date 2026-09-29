"use client";

/**
 * S3 · Market tab — the cluster this listing competes in.
 *
 * Public prices and order shares only. A seller must never be able to infer a
 * rival's cost or floor from this screen, so nothing here derives from anyone
 * else's cost model.
 */

import { useId } from "react";
import { Card } from "@/components/ui/card";
import { TraceLink } from "@/components/shared/money-value";
import { ChartFrame } from "@/components/charts/chart-frame";
import { findTwins } from "@/engine/twins";
import type { ListingAnalysis } from "@/lib/selectors";
import type { CompetitorListing, World } from "@/engine/types";
import { inr, pct } from "@/lib/format";

const W = 720;
const H = 260;
const PAD_L = 52;
const PAD_R = 24;
const PAD_T = 20;
const PAD_B = 46;

export function MarketTab({ analysis, world }: { analysis: ListingAnalysis; world: World }) {
  const id = useId();
  const { listing, ceiling } = analysis;

  const rivals = world.competitors.filter((c) => c.clusterId === listing.clusterId);
  const cluster = world.clusters.find((c) => c.id === listing.clusterId);

  // Real cosine similarity over the attribute vector — the same retriever the
  // cold-start flow uses, so the twins shown here are the twins used.
  const twins = findTwins(listing.attributes, world.listings.filter((l) => l.id !== listing.id), 8);

  const prices = rivals.map((r) => r.price);
  const minP = Math.min(...prices, listing.price);
  const maxP = Math.max(...prices, listing.price);
  const maxShare = Math.max(...rivals.map((r) => r.orderShare), 0.01);

  const x = (p: number) => PAD_L + ((p - minP) / Math.max(maxP - minP, 1)) * (W - PAD_L - PAD_R);
  const y = (s: number) => H - PAD_B - (s / maxShare) * (H - PAD_T - PAD_B);

  const tableRows = [...rivals]
    .sort((a, b) => b.orderShare - a.orderShare)
    .slice(0, 10)
    .map((r) => ({
      label: inr(r.price),
      value: `${pct(r.orderShare)} of orders · ${r.rating.toFixed(1)}★`,
    }));

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <ChartFrame
          title="What rivals charge, and how the orders split"
          titleHi="प्रतियोगी क्या दाम रखते हैं"
          description={`${rivals.length} listings compete with yours. Each dot is one of them: further right is a higher price, higher up is a larger share of the orders.`}
          tableRows={tableRows}
          tableHeaders={["Price", "Share of orders"]}
        >
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
            <title id={`${id}-t`}>Rival prices against their share of orders</title>
            <desc id={`${id}-d`}>
              {rivals.length} competing listings. Your price of {inr(listing.price)} against a
              visibility ceiling of {inr(ceiling.value)}.
            </desc>

            <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border-strong)" />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border-strong)" />

            {/* The ceiling, drawn as a line — the point buyers stop looking. */}
            {ceiling.value >= minP && ceiling.value <= maxP ? (
              <g>
                <line
                  x1={x(ceiling.value)}
                  y1={PAD_T}
                  x2={x(ceiling.value)}
                  y2={H - PAD_B}
                  stroke="var(--info)"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                <text x={x(ceiling.value)} y={PAD_T - 6} textAnchor="middle" className="hi" fill="var(--info)" fontSize="10">
                  दिखने की सीमा {inr(ceiling.value)}
                </text>
              </g>
            ) : null}

            {rivals.map((r: CompetitorListing) => (
              <circle
                key={r.id}
                cx={x(r.price)}
                cy={y(r.orderShare)}
                r="3.5"
                fill="var(--neutral-data)"
                opacity="0.5"
              >
                <title>
                  {inr(r.price)} — {pct(r.orderShare)} of orders, {r.rating.toFixed(1)} stars
                </title>
              </circle>
            ))}

            {/* Your listing, highlighted. */}
            <circle
              cx={x(listing.price)}
              cy={H - PAD_B - 8}
              r="7"
              fill="var(--brand-magenta)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
            <text
              x={x(listing.price)}
              y={H - PAD_B - 22}
              textAnchor="middle"
              className="tabular"
              fill="var(--brand-magenta)"
              fontSize="11"
              fontWeight="700"
            >
              you · {inr(listing.price)}
            </text>

            <text x={(W + PAD_L - PAD_R) / 2} y={H - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
              price (₹)
            </text>
            <text x={16} y={H / 2} fill="var(--text-muted)" fontSize="10" transform={`rotate(-90 16 ${H / 2})`} textAnchor="middle">
              share of orders
            </text>
          </svg>
        </ChartFrame>

        <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-subtle)]">
          Prices and order shares only. You cannot see another seller&rsquo;s costs here, and they
          cannot see yours.
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="hi text-[13px] font-semibold text-[var(--text)]">मिलता-जुलता सामान</h3>
        <p className="text-[12px] text-[var(--text-muted)]">
          The closest listings to yours, matched on category, fabric, price band, weight, colour and
          occasion
        </p>
        <div className="mt-2">
          <TraceLink
            traced={{ value: twins.value.length, trace: twins.trace, assumptions: twins.assumptions }}
            label="How these look-alikes were found"
            labelHi="मिलान कैसे हुआ"
          />
        </div>
        <ul className="mt-2 space-y-2">
          {twins.value.slice(0, 6).map((t) => (
            <li
              key={t.listing.id}
              className="flex items-center gap-3 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--text)]">
                  {t.listing.name}
                </p>
                <p className="text-[11px] text-[var(--text-subtle)]">
                  matched on {t.matched.join(", ") || "category"}
                </p>
              </div>
              <span className="tabular shrink-0 text-[13px] font-medium text-[var(--text)]">
                {inr(t.listing.price)}
              </span>
              <span className="tabular shrink-0 rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                {(t.similarity * 100).toFixed(0)}% alike
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {cluster ? (
        <Card className="p-4">
          <h3 className="text-[13px] font-semibold text-[var(--text)]">About this design</h3>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {[
              ["Design", cluster.name],
              ["Competing listings", String(rivals.length)],
              ["Cheapest rival", inr(Math.min(...prices))],
              ["Dearest rival", inr(Math.max(...prices))],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] text-[var(--text-subtle)]">{label}</dt>
                <dd className="mt-0.5 text-[13px] font-medium text-[var(--text)]">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
