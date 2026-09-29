"use client";

/**
 * The Daam Meter — the product's signature component.
 *
 * A horizontal rail from floor×0.85 to ceiling×1.15. Red below the floor,
 * green between floor and ceiling, grey above the ceiling. Markers for floor,
 * ceiling, the current price (filled dot) and the recommended price (ring).
 *
 * The state that matters most is the INVERTED one: when floor > ceiling there
 * is no price that both covers her costs and gets her seen. The geometry flips
 * into a hatched "no viable price" band and the component stays legible — that
 * state is deliberately designed rather than treated as an error, because
 * naming it honestly is the best idea in this product.
 *
 * Hand-written SVG, themed from CSS variables, responsive via viewBox.
 */

import { useId } from "react";
import { inr } from "@/lib/format";
import { ChartFrame } from "./chart-frame";
import type { BandAnalysis } from "@/engine/types";

const W = 720;
const H = 128;
const PAD = 28;
const RAIL_Y = 62;
const RAIL_H = 14;

export function DaamMeter({
  band,
  /** Animate the price marker when it moves. Respects prefers-reduced-motion. */
  animate = true,
}: {
  band: BandAnalysis;
  animate?: boolean;
}) {
  const id = useId();
  const { floor, ceiling, price, recommended, verdict } = band;
  const inverted = ceiling <= floor;

  // The rail spans a window wide enough to hold every marker with breathing
  // room. In the inverted case floor and ceiling are the wrong way round, so
  // the window is built from min/max rather than from floor/ceiling directly.
  const lo = Math.min(floor, ceiling, price, recommended || Infinity);
  const hi = Math.max(floor, ceiling, price, recommended || 0);
  const span = Math.max(hi - lo, 1);
  const min = lo - span * 0.18;
  const max = hi + span * 0.18;

  const x = (value: number) => PAD + ((value - min) / (max - min)) * (W - PAD * 2);

  const floorX = x(floor);
  const ceilingX = x(ceiling);
  const priceX = x(price);
  const recX = recommended > 0 ? x(recommended) : null;

  const tableRows = [
    { label: "सुरक्षा दाम · Survival price", value: inr(floor), note: "Below this, every parcel loses money" },
    { label: "दिखने की सीमा · Visibility ceiling", value: inr(ceiling), note: "Above this, buyers stop finding you" },
    { label: "आपका दाम · Your price", value: inr(price) },
    ...(recommended > 0 ? [{ label: "सुझाया दाम · Suggested price", value: inr(recommended) }] : []),
    {
      label: inverted ? "Gap to close" : "Room between floor and ceiling",
      value: inr(Math.abs(ceiling - floor)),
      note: inverted ? "Your cost must fall by this much before any price works" : undefined,
    },
  ];

  const description = inverted
    ? `No viable price. Your survival price of ${inr(floor)} is ${inr(floor - ceiling)} above the visibility ceiling of ${inr(ceiling)}.`
    : `Your price of ${inr(price)} against a survival price of ${inr(floor)} and a visibility ceiling of ${inr(ceiling)}.`;

  return (
    <ChartFrame
      title="Where your price sits"
      titleHi="आपका दाम कहाँ है"
      description={description}
      tableRows={tableRows}
      tableHeaders={["", "₹"]}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-labelledby={`${id}-t ${id}-d`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title id={`${id}-t`}>{inverted ? "No viable price band" : "Your price within its band"}</title>
        <desc id={`${id}-d`}>{description}</desc>

        <defs>
          <pattern id={`${id}-hatch`} width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="var(--danger-bg)" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--danger)" strokeWidth="2.5" opacity="0.5" />
          </pattern>
        </defs>

        {/* The rail: everything below the floor is money-losing. */}
        <rect
          x={PAD}
          y={RAIL_Y}
          width={Math.max(0, floorX - PAD)}
          height={RAIL_H}
          rx="3"
          fill="var(--danger-bg)"
        />

        {inverted ? (
          // Floor above ceiling: the "band" is a gap, drawn hatched between the
          // ceiling (where buyers stop looking) and the floor (where she stops
          // losing money). Nothing can live in here.
          <rect
            x={ceilingX}
            y={RAIL_Y}
            width={Math.max(0, floorX - ceilingX)}
            height={RAIL_H}
            fill={`url(#${id}-hatch)`}
            stroke="var(--danger)"
            strokeWidth="1"
            strokeDasharray="3 2"
          />
        ) : (
          <rect
            x={floorX}
            y={RAIL_Y}
            width={Math.max(0, ceilingX - floorX)}
            height={RAIL_H}
            rx="3"
            fill="var(--success-bg)"
            stroke="var(--success)"
            strokeOpacity="0.3"
          />
        )}

        {/* Above the ceiling: safe for her, but invisible to buyers. */}
        <rect
          x={Math.max(ceilingX, inverted ? floorX : ceilingX)}
          y={RAIL_Y}
          width={Math.max(0, W - PAD - Math.max(ceilingX, inverted ? floorX : ceilingX))}
          height={RAIL_H}
          rx="3"
          fill="var(--surface-sunken)"
        />

        {/* Floor marker */}
        <line x1={floorX} y1={RAIL_Y - 12} x2={floorX} y2={RAIL_Y + RAIL_H + 8} stroke="var(--danger)" strokeWidth="2" />
        <text x={floorX} y={RAIL_Y - 18} textAnchor="middle" className="tabular" fill="var(--danger)" fontSize="12" fontWeight="600">
          {inr(floor)}
        </text>
        <text x={floorX} y={RAIL_Y + RAIL_H + 22} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
          सुरक्षा दाम
        </text>

        {/* Ceiling marker */}
        <line x1={ceilingX} y1={RAIL_Y - 12} x2={ceilingX} y2={RAIL_Y + RAIL_H + 8} stroke="var(--info)" strokeWidth="2" />
        <text x={ceilingX} y={RAIL_Y - 18} textAnchor="middle" className="tabular" fill="var(--info)" fontSize="12" fontWeight="600">
          {inr(ceiling)}
        </text>
        <text x={ceilingX} y={RAIL_Y + RAIL_H + 22} textAnchor="middle" fill="var(--text-muted)" fontSize="10">
          दिखने की सीमा
        </text>

        {/* Recommended price: a hollow ring, so it reads as a suggestion. */}
        {recX !== null ? (
          <g>
            <circle cx={recX} cy={RAIL_Y + RAIL_H / 2} r="7" fill="var(--surface)" stroke="var(--success)" strokeWidth="2.5" />
            <text x={recX} y={RAIL_Y + RAIL_H + 36} textAnchor="middle" className="tabular" fill="var(--success)" fontSize="10">
              suggested {inr(recommended)}
            </text>
          </g>
        ) : null}

        {/* Current price: the largest, most solid mark on the rail. */}
        <g
          style={
            animate
              ? { transition: "transform 320ms ease", transform: "translateZ(0)" }
              : undefined
          }
        >
          <circle
            cx={priceX}
            cy={RAIL_Y + RAIL_H / 2}
            r="9"
            fill={
              verdict === "BELOW_FLOOR" || verdict === "NO_BAND"
                ? "var(--danger)"
                : verdict === "ABOVE_GATE"
                  ? "var(--neutral-data)"
                  : "var(--success)"
            }
            stroke="var(--surface)"
            strokeWidth="2.5"
          />
          <text
            x={priceX}
            y={RAIL_Y - 34}
            textAnchor="middle"
            className="tabular"
            fill="var(--text)"
            fontSize="14"
            fontWeight="700"
          >
            {inr(price)}
          </text>
        </g>

        {/* In the inverted case, name the gap on the chart itself. */}
        {inverted ? (
          <text
            x={(ceilingX + floorX) / 2}
            y={RAIL_Y + RAIL_H / 2 + 4}
            textAnchor="middle"
            fill="var(--danger)"
            fontSize="11"
            fontWeight="600"
          >
            {inr(floor - ceiling)} gap
          </text>
        ) : null}
      </svg>

      {inverted ? (
        <p className="mt-1 rounded-[var(--radius-input)] border border-[var(--danger)]/25 bg-[var(--danger-bg)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text)]">
          <span className="hi font-semibold">कोई सही दाम नहीं।</span> Your cost to serve sits{" "}
          <strong>{inr(floor - ceiling)}</strong> above what buyers will pay to find you. No price
          works here — the cost has to move first, not the price.
        </p>
      ) : null}
    </ChartFrame>
  );
}
