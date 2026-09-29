/**
 * One-dimensional label layout for the Daam Meter.
 *
 * Floor, ceiling and the suggested price are often within a few rupees of
 * each other — precisely in the thin-band cases the meter most needs to show
 * clearly. Placing each label at its marker overprints them ("₹427₹429").
 *
 * This places every label at its ideal centre, then relaxes overlaps by
 * pushing neighbours apart, clamped to the chart edges. A label that ends up
 * displaced from its marker is drawn with a leader line back to it.
 */

export type LabelIn = { key: string; x: number; width: number };
export type LabelOut = LabelIn & { cx: number; displaced: boolean };

export function layoutLabels(labels: LabelIn[], minX: number, maxX: number, gap = 10): LabelOut[] {
  const items = [...labels]
    .sort((a, b) => a.x - b.x)
    .map((l) => ({ ...l, cx: l.x }));

  const clamp = (it: { cx: number; width: number }) => {
    it.cx = Math.max(minX + it.width / 2, Math.min(maxX - it.width / 2, it.cx));
  };
  items.forEach(clamp);

  // Relax: sweep until no neighbouring pair overlaps. Converges quickly for
  // the handful of labels a meter carries.
  for (let pass = 0; pass < 40; pass++) {
    let moved = false;
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i];
      const b = items[i + 1];
      if (!a || !b) continue;
      const need = a.width / 2 + b.width / 2 + gap;
      const have = b.cx - a.cx;
      if (have < need) {
        const push = (need - have) / 2;
        a.cx -= push;
        b.cx += push;
        clamp(a);
        clamp(b);
        moved = true;
      }
    }
    if (!moved) break;
  }

  return items.map((it) => ({ ...it, displaced: Math.abs(it.cx - it.x) > 6 }));
}
