"use client";

/**
 * The Phase 5 gate: every signature chart, in every state.
 *
 * All four are driven by the real engine here, not by fixture arrays — the
 * curve comes from the demand model, the waterfall from the cost model. The
 * width switcher checks 360px (the real device), 768px and full width without
 * needing devtools.
 */

import { useState } from "react";
import { classifyBand } from "@/engine/band";
import { survivalPrice, contributionPerOrder, type CostInputs } from "@/engine/cost";
import { buildWaterfall, funnelPer100 } from "@/engine/waterfall";
import { priceShare, visibilityGate } from "@/engine/demand";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DaamMeter } from "@/components/charts/daam-meter";
import { WaterfallChart } from "@/components/charts/waterfall-chart";
import { LeakageFunnel } from "@/components/charts/leakage-funnel";
import { PriceProfitCurve, type CurvePoint } from "@/components/charts/price-profit-curve";
import type { CompetitorListing } from "@/engine/types";

const CASE_1: CostInputs = {
  cogs: 180,
  rtoRate: 0.17,
  returnRate: 0.2,
  adSpendRate: 0.05,
  forwardFreight: 65,
  reverseFreight: 75.6,
  packaging: 8,
};
const CASE_2: CostInputs = { ...CASE_1, cogs: 158, rtoRate: 0.12, returnRate: 0.13 };
const CEILING = 352;

const RIVALS: CompetitorListing[] = [
  { id: "a", clusterId: "c", price: 329, rating: 4.2, orderShare: 0.42 },
  { id: "b", clusterId: "c", price: 339, rating: 4.0, orderShare: 0.2 },
  { id: "c", clusterId: "c", price: 349, rating: 3.9, orderShare: 0.14 },
  { id: "d", clusterId: "c", price: 359, rating: 4.1, orderShare: 0.12 },
  { id: "e", clusterId: "c", price: 379, rating: 3.8, orderShare: 0.07 },
  { id: "f", clusterId: "c", price: 399, rating: 3.6, orderShare: 0.05 },
];

const WIDTHS = [
  { label: "360px — the real device", value: 360 },
  { label: "768px", value: 768 },
  { label: "Full width", value: 0 },
];

/** Contribution per month across a price sweep, from the real models. */
function buildCurve(inputs: CostInputs, ceiling: number): CurvePoint[] {
  const points: CurvePoint[] = [];
  const clusterDemand = 40; // orders/day across the cluster
  for (let price = 240; price <= 440; price += 5) {
    const share = priceShare(price, RIVALS, 3.4);
    const gate = visibilityGate(price, ceiling);
    const ordersPerMonth = clusterDemand * share * gate * 30;
    const perOrder = contributionPerOrder(price, inputs).value;
    points.push({ price, ordersPerMonth, contributionPerMonth: ordersPerMonth * perOrder });
  }
  return points;
}

export default function ChartsDevPage() {
  const [width, setWidth] = useState(0);

  const floor1 = survivalPrice(CASE_1).value;
  const floor2 = survivalPrice(CASE_2).value;

  const bandNoBand = classifyBand(floor1, CEILING, 305).value;
  const bandHealthy = classifyBand(floor2, CEILING, 334).value;
  const bandBelow = classifyBand(floor2, CEILING, 296).value;
  const bandAbove = classifyBand(floor2, CEILING, 402).value;
  const bandThin = classifyBand(340, 352, 346).value;

  const waterfall = buildWaterfall(305, CASE_1).value;

  const funnel = funnelPer100(CASE_1);

  const curve = buildCurve(CASE_2, CEILING);

  const frame = (node: React.ReactNode, title: string, note?: string) => (
    <Card className="p-4">
      <h3 className="mb-1 text-[13px] font-semibold text-[var(--text)]">{title}</h3>
      {note ? <p className="mb-3 text-[12px] text-[var(--text-muted)]">{note}</p> : null}
      {node}
    </Card>
  );

  return (
    <div className="px-4 py-6 md:px-6">
      <header className="mx-auto mb-5 max-w-5xl">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          Dev
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Chart gallery</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-muted)]">
          Every signature visualisation, in every state, driven by the real engine. Switch the width
          to check the layouts a seller actually sees, and the theme toggle in the top bar to check
          both colour schemes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {WIDTHS.map((w) => (
            <Button
              key={w.value}
              size="sm"
              variant={width === w.value ? "primary" : "secondary"}
              onClick={() => setWidth(w.value)}
            >
              {w.label}
            </Button>
          ))}
        </div>
      </header>

      <div
        className="mx-auto space-y-4"
        style={{ maxWidth: width ? `${width}px` : "64rem" }}
      >
        <h2 className="text-sm font-semibold text-[var(--text)]">1 · Daam Meter, every state</h2>

        {frame(
          <DaamMeter band={bandNoBand} />,
          "No viable band — the inverted case",
          "Floor above ceiling. The geometry flips to a hatched gap and the component still reads clearly. This is the most important state in the product.",
        )}
        {frame(<DaamMeter band={bandHealthy} />, "Healthy", "Priced inside the band, near the sweet spot.")}
        {frame(<DaamMeter band={bandBelow} />, "Below floor", "Every parcel shipped at this price loses money.")}
        {frame(<DaamMeter band={bandAbove} />, "Above the gate", "Safe for her, but buyers are not finding it.")}
        {frame(<DaamMeter band={bandThin} />, "Thin band", "Under 5% of headroom — a small cost change wipes it out.")}

        <h2 className="pt-2 text-sm font-semibold text-[var(--text)]">2 · Unit-economics waterfall</h2>
        {frame(
          <WaterfallChart waterfall={waterfall} />,
          "Belief against reality, per parcel",
          "The reference case: +₹52 believed, −₹43 real, a ₹95 gap she does not see for 15 to 25 days.",
        )}

        <h2 className="pt-2 text-sm font-semibold text-[var(--text)]">3 · Leakage funnel</h2>
        {frame(
          <LeakageFunnel data={funnel} perHundred />,
          "Where the parcels go",
          "100 dispatched, 83 delivered, 66 paid — with the cost carried at each step.",
        )}

        <h2 className="pt-2 text-sm font-semibold text-[var(--text)]">
          4 · Price, orders and earnings
        </h2>
        {frame(
          <PriceProfitCurve
            points={curve}
            floor={floor2}
            ceiling={CEILING}
            current={334}
            recommended={bandHealthy.recommended}
          />,
          "The curve, computed from the demand model",
          "Orders fall as price rises, but earnings peak inside the band. Both series come from the engine.",
        )}
        {frame(
          <PriceProfitCurve points={[]} floor={floor2} ceiling={CEILING} current={334} recommended={0} />,
          "Empty state",
          "What the curve shows when there is not enough market data to draw it.",
        )}
      </div>
    </div>
  );
}
