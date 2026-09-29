import { cn } from "@/lib/cn";

/**
 * A rupee figure, typeset.
 *
 * At display sizes the ₹ glyph is set smaller, lighter and raised, the way
 * financial statements set a currency mark — so the eye lands on the digits
 * and the figure reads as a quantity rather than as a string of characters.
 * Grouping is Indian (₹1,23,456) and the minus is a true minus sign.
 *
 * Compact mode (₹74k, ₹2.6L, ₹1.2Cr) is for headline figures where the last
 * three digits would be noise.
 */

const grouping = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const grouping2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function compactParts(abs: number): { digits: string; unit: string } {
  if (abs >= 1_00_00_000) return { digits: (abs / 1_00_00_000).toFixed(abs >= 10_00_00_000 ? 0 : 1), unit: "Cr" };
  if (abs >= 1_00_000) return { digits: (abs / 1_00_000).toFixed(abs >= 10_00_000 ? 0 : 1), unit: "L" };
  if (abs >= 1_000) return { digits: (abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1), unit: "k" };
  return { digits: grouping.format(Math.round(abs)), unit: "" };
}

type Size = "sm" | "md" | "lg" | "figure" | "display";

const SIZE: Record<Size, string> = {
  sm: "text-[13px] font-medium",
  md: "text-sm font-semibold",
  lg: "text-lg font-semibold tracking-[-0.01em]",
  figure: "type-figure",
  display: "type-display",
};

export function Amount({
  value,
  size = "md",
  compact = false,
  decimals = 0,
  signed = false,
  tone = "none",
  className,
}: {
  value: number;
  size?: Size;
  compact?: boolean;
  decimals?: number;
  /** Show + on positive values — for deltas. */
  signed?: boolean;
  tone?: "none" | "auto" | "danger" | "success" | "muted";
  className?: string;
}) {
  if (!Number.isFinite(value)) {
    return <span className={cn("tabular text-[var(--text-subtle)]", SIZE[size], className)}>—</span>;
  }

  const negative = value < 0;
  const abs = Math.abs(value);
  const { digits, unit } = compact
    ? compactParts(abs)
    : { digits: decimals ? grouping2.format(abs) : grouping.format(Math.round(abs)), unit: "" };

  const sign = negative ? "−" : signed && value > 0 ? "+" : "";
  const big = size === "figure" || size === "display" || size === "lg";

  const toneClass =
    tone === "danger" || (tone === "auto" && negative)
      ? "text-[var(--danger)]"
      : tone === "success" || (tone === "auto" && !negative && value !== 0)
        ? "text-[var(--success)]"
        : tone === "muted"
          ? "text-[var(--text-muted)]"
          : "";

  return (
    <span
      // Plain inline flow: vertical-align (which raises the ₹) is ignored on
      // flex children, and a parent's underline does not reach into an
      // inline-block — traceable figures rely on that dotted underline.
      className={cn("tabular whitespace-nowrap", SIZE[size], toneClass, className)}
    >
      {/* aria-label is not reliably read on a plain span, so the spoken form
          is real text, hidden visually. */}
      <span className="sr-only">
        {`${negative ? "minus " : ""}₹${digits}${unit ? ` ${unit === "L" ? "lakh" : unit === "Cr" ? "crore" : "thousand"}` : ""}`}
      </span>
      {sign ? <span aria-hidden>{sign}</span> : null}
      <span
        aria-hidden
        className={cn(big && "mr-[0.06em] text-[0.62em] font-medium opacity-75 [vertical-align:0.28em]")}
      >
        ₹
      </span>
      <span aria-hidden>{digits}</span>
      {unit ? (
        <span aria-hidden className={cn(big ? "ml-[0.05em] text-[0.6em] font-semibold" : "")}>
          {unit}
        </span>
      ) : null}
    </span>
  );
}
