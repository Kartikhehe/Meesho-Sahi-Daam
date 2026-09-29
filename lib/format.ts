/**
 * Formatting. Every number that reaches a screen passes through here.
 *
 * Currency is always Indian grouping: ₹1,23,456 — never ₹123,456 and never "$".
 * A seller reading "1,23,456" recognises it instantly; "123,456" reads as a
 * different, larger number to an Indian eye.
 */

const inrGrouping = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const inrGrouping2 = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,23,456 — the default money rendering. */
export function inr(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const negative = value < 0;
  const abs = Math.abs(value);
  const body = decimals === 0 ? inrGrouping.format(Math.round(abs)) : inrGrouping2.format(abs);
  return `${negative ? "−" : ""}₹${body}`;
}

/** ₹1.2L / ₹3.4Cr — for headline figures where precision would be noise. */
export function inrCompact(value: number): string {
  const negative = value < 0;
  const abs = Math.abs(value);
  const sign = negative ? "−" : "";
  if (abs >= 1_00_00_000) return `${sign}₹${(abs / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `${sign}₹${(abs / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return inr(value);
}

/** 17.0% */
export function pct(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** 0.664 — for ratios shown as ratios (paid fraction), not percentages. */
export function ratio(value: number, decimals = 3): string {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(decimals);
}

/** 1,234 */
export function count(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return inrGrouping.format(Math.round(value));
}

/** Signed, for deltas: +₹21 / −₹43 */
export function inrSigned(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  if (value > 0) return `+${inr(value, decimals)}`;
  return inr(value, decimals);
}

export type Unit = "INR" | "PCT" | "RATIO" | "COUNT";

/** Format by the unit a TraceStep declares, so the drawer never mislabels. */
export function byUnit(value: number, unit: Unit): string {
  switch (unit) {
    case "INR":
      return inr(value, 2);
    case "PCT":
      return pct(value);
    case "RATIO":
      return ratio(value);
    case "COUNT":
      return count(value);
  }
}

const DAY_MS = 86_400_000;
const SIM_EPOCH = Date.UTC(2024, 0, 1);

/** The simulation counts days from a fixed epoch; render them as real dates. */
export function simDate(day: number): Date {
  return new Date(SIM_EPOCH + day * DAY_MS);
}

export function formatDate(day: number): string {
  return simDate(day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateShort(day: number): string {
  return simDate(day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
