"use client";

/**
 * The Daam Meter — the product's signature component.
 *
 * A rail from below the floor to above the ceiling. Red where every parcel
 * loses money, green where a price both pays and gets seen, grey where buyers
 * stop finding the listing. The current price sits on the rail as a solid dot
 * with its own bubble above; the suggestion is a hollow ring.
 *
 * When floor > ceiling there is no price that works. The band inverts into a
 * hatched gap — deliberately designed, because naming that state honestly is
 * the best idea in this product.
 *
 * Drawn at its real pixel width (see useWidth), so labels stay legible on a
 * 360px phone, and laid out so labels never overprint one another.
 */

import { useId } from "react";
import { inr } from "@/lib/format";
import { textWidth, useWidth } from "@/lib/use-width";
import { layoutLabels } from "./meter-layout";
import { ChartFrame } from "./chart-frame";
import type { BandAnalysis } from "@/engine/types";

const H = 150;
const PAD = 14;
const RAIL_Y = 70;
const RAIL_H = 12;
const LABEL_Y = RAIL_Y + RAIL_H + 26;
const MOVE = "transform 320ms cubic-bezier(.2,.8,.2,1)";

export function DaamMeter({ band, title = true }: { band: BandAnalysis; title?: boolean }) {
  const id = useId();
  const { ref, width } = useWidth(640);
  const W = Math.max(280, width);

  const { floor, ceiling, price, recommended, verdict } = band;
  const inverted = ceiling <= floor;
  const hasRec = recommended > 0 && !inverted;

  // A window wide enough for every marker, with breathing room either side.
  const points = [floor, ceiling, price, ...(hasRec ? [recommended] : [])];
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const span = Math.max(hi - lo, (lo + hi) * 0.06, 1);
  const min = lo - span * 0.22;
  const max = hi + span * 0.22;
  const x = (v: number) => PAD + ((v - min) / (max - min)) * (W - PAD * 2);

  const floorX = x(floor);
  const ceilX = x(ceiling);
  const priceX = x(price);
  const recX = hasRec ? x(recommended) : 0;

  const lossEnd = inverted ? ceilX : floorX; // loses money AND is seen
  const bandStart = Math.min(floorX, ceilX);
  const bandEnd = Math.max(floorX, ceilX);

  const priceTone =
    verdict === "BELOW_FLOOR" || verdict === "NO_BAND"
      ? "var(--danger)"
      : verdict === "ABOVE_GATE"
        ? "var(--neutral-data)"
        : "var(--success)";

  // Labels under the rail, laid out so they never collide.
  const labelDefs = [
    { key: "floor", x: floorX, value: inr(floor), name: "सुरक्षा दाम", colour: "var(--danger)" },
    { key: "ceiling", x: ceilX, value: inr(ceiling), name: "दिखने की सीमा", colour: "var(--info)" },
    ...(hasRec
      ? [{ key: "rec", x: recX, value: inr(recommended), name: "सुझाया दाम", colour: "var(--success)" }]
      : []),
  ];
  const laid = layoutLabels(
    labelDefs.map((l) => ({
      key: l.key,
      x: l.x,
      width: Math.max(textWidth(l.value, 13), textWidth(l.name, 11)) + 6,
    })),
    PAD,
    W - PAD,
  );

  // The price bubble, clamped so it never runs off either edge.
  const bubbleText = inr(price);
  const bubbleW = Math.max(textWidth(bubbleText, 14), textWidth("आपका दाम", 10.5)) + 22;
  const bubbleX = Math.max(PAD + bubbleW / 2, Math.min(W - PAD - bubbleW / 2, priceX));

  const gapText = `${inr(floor - ceiling)} का फ़ासला`;
  const gapFits = inverted && bandEnd - bandStart > textWidth(gapText, 11) + 12;

  const description = inverted
    ? `No viable price. The survival price of ${inr(floor)} is ${inr(floor - ceiling)} above the visibility ceiling of ${inr(ceiling)}.`
    : `Your price of ${inr(price)} against a survival price of ${inr(floor)} and a visibility ceiling of ${inr(ceiling)}.`;

  const tableRows = [
    { label: "सुरक्षा दाम · Survival price", value: inr(floor), note: "Below this, every parcel loses money" },
    { label: "दिखने की सीमा · Visibility ceiling", value: inr(ceiling), note: "Above this, buyers stop finding you" },
    { label: "आपका दाम · Your price", value: inr(price) },
    ...(hasRec ? [{ label: "सुझाया दाम · Suggested price", value: inr(recommended) }] : []),
    {
      label: inverted ? "Gap to close" : "Room between floor and ceiling",
      value: inr(Math.abs(ceiling - floor)),
    },
  ];

  return (
    <ChartFrame
      title={title ? "Where your price sits" : ""}
      titleHi={title ? "आपका दाम कहाँ है" : undefined}
      description={description}
      tableRows={tableRows}
      tableHeaders={["", "₹"]}
      footer={<Legend inverted={inverted} />}
    >
      <div ref={ref}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="img" aria-labelledby={`${id}-t ${id}-d`}>
          <title id={`${id}-t`}>{inverted ? "No viable price band" : "Your price within its band"}</title>
          <desc id={`${id}-d`}>{description}</desc>

          <defs>
            <pattern id={`${id}-hatch`} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="var(--danger-bg)" />
              <line x1="0" y1="0" x2="0" y2="7" stroke="var(--danger)" strokeWidth="2" strokeOpacity="0.55" />
            </pattern>
            <clipPath id={`${id}-rail`}>
              <rect x={PAD} y={RAIL_Y} width={W - PAD * 2} height={RAIL_H} rx={RAIL_H / 2} />
            </clipPath>
          </defs>

          {/* Zones, clipped to one rounded rail. */}
          <g clipPath={`url(#${id}-rail)`}>
            <rect x={PAD} y={RAIL_Y} width={W - PAD * 2} height={RAIL_H} fill="var(--surface-sunken)" />
            <rect x={PAD} y={RAIL_Y} width={Math.max(0, lossEnd - PAD)} height={RAIL_H} fill="var(--danger-bg)" />
            {inverted ? (
              <rect x={bandStart} y={RAIL_Y} width={bandEnd - bandStart} height={RAIL_H} fill={`url(#${id}-hatch)`} />
            ) : (
              <rect x={bandStart} y={RAIL_Y} width={bandEnd - bandStart} height={RAIL_H} fill="var(--success-line)" />
            )}
          </g>
          <rect x={PAD} y={RAIL_Y} width={W - PAD * 2} height={RAIL_H} rx={RAIL_H / 2} fill="none" stroke="var(--border)" />

          {gapFits ? (
            <text x={(bandStart + bandEnd) / 2} y={RAIL_Y - 8} textAnchor="middle" fill="var(--danger)" fontSize="11" fontWeight="600">
              {gapText}
            </text>
          ) : null}

          {/* Floor and ceiling ticks */}
          <line x1={floorX} x2={floorX} y1={RAIL_Y - 5} y2={RAIL_Y + RAIL_H + 5} stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" />
          <line x1={ceilX} x2={ceilX} y1={RAIL_Y - 5} y2={RAIL_Y + RAIL_H + 5} stroke="var(--info)" strokeWidth="2" strokeLinecap="round" />

          {/* Suggested price: a ring, so it reads as a suggestion rather than a fact. */}
          {hasRec ? (
            <circle cx={recX} cy={RAIL_Y + RAIL_H / 2} r="7" fill="var(--surface)" stroke="var(--success)" strokeWidth="2.5" />
          ) : null}

          {/* The price: bubble above, solid dot on the rail. */}
          {/* Positioned by CSS transform, not by x attributes, so a price
              change glides rather than jumps. Reduced motion turns it off. */}
          <g style={{ transform: `translateX(${bubbleX}px)`, transition: MOVE }}>
            <rect x={-bubbleW / 2} y={6} width={bubbleW} height={40} rx="8" fill="var(--text)" />
            <text x={0} y={21} textAnchor="middle" fill="var(--surface)" fontSize="10.5" fontWeight="500" opacity="0.72">
              आपका दाम
            </text>
            <text x={0} y={38} textAnchor="middle" fill="var(--surface)" fontSize="14" fontWeight="650">
              {bubbleText}
            </text>
          </g>
          <g style={{ transform: `translateX(${priceX}px)`, transition: MOVE }}>
            <line x1={0} x2={0} y1={46} y2={RAIL_Y - 2} stroke={priceTone} strokeWidth="1.5" strokeDasharray="2 2" />
            <circle cx={0} cy={RAIL_Y + RAIL_H / 2} r="8" fill={priceTone} stroke="var(--surface)" strokeWidth="3" />
          </g>

          {/* Labels under the rail, with leader lines where they had to move. */}
          {laid.map((l) => {
            const def = labelDefs.find((d) => d.key === l.key);
            if (!def) return null;
            return (
              <g key={l.key}>
                {l.displaced ? (
                  <path
                    d={`M${def.x},${RAIL_Y + RAIL_H + 6} L${l.cx},${LABEL_Y - 14}`}
                    stroke="var(--border-strong)"
                    strokeWidth="1"
                    fill="none"
                  />
                ) : null}
                <text x={l.cx} y={LABEL_Y} textAnchor="middle" fill={def.colour} fontSize="13" fontWeight="650">
                  {def.value}
                </text>
                <text x={l.cx} y={LABEL_Y + 16} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500">
                  {def.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </ChartFrame>
  );
}

function Legend({ inverted }: { inverted: boolean }) {
  const items = [
    { swatch: "bg-[var(--danger-bg)] border-[var(--danger-line)]", label: "Loses money" },
    inverted
      ? {
          swatch:
            "border-[var(--danger-line)] bg-[repeating-linear-gradient(45deg,var(--danger-bg)_0_3px,var(--danger-line)_3px_5px)]",
          label: "No price works",
        }
      : { swatch: "bg-[var(--success-line)] border-[var(--success-line)]", label: "Pays and gets seen" },
    { swatch: "bg-[var(--surface-sunken)] border-[var(--border)]", label: "Buyers stop finding you" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
          <span aria-hidden className={`h-2.5 w-4 rounded-full border ${i.swatch}`} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
