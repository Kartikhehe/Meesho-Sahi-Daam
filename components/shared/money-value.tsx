"use client";

/**
 * A number, and the way to see where it came from.
 *
 * The rule from the brief: a number without a trace does not appear in the UI.
 * This component is how that rule is kept — pass it a `Traced<number>` and it
 * renders the value with a dotted underline that opens the one TraceDrawer.
 *
 * A number with no trace can still be rendered (`traced={null}`), but it then
 * renders as plain text with no affordance, which makes untraced numbers
 * visually obvious during review.
 */

import { useState } from "react";
import { cn } from "@/lib/cn";
import { inr, inrSigned, pct, count as fmtCount } from "@/lib/format";
import type { Traced } from "@/engine/trace";
import { TraceDrawer } from "./trace-drawer";

type Props = {
  value: number;
  traced?: Traced<number> | null;
  /** What the drawer is titled when opened. */
  label: string;
  labelHi?: string;
  format?: "inr" | "inrSigned" | "pct" | "count";
  decimals?: number;
  /** Colour by sign: losses red, gains green. Off by default. */
  tone?: "auto" | "none" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onProbe?: (key: string, multiplier: number) => number | null;
};

const SIZES = {
  sm: "text-[12px]",
  md: "text-sm",
  lg: "text-lg font-semibold",
  xl: "text-[32px] leading-none font-semibold",
};

export function MoneyValue({
  value,
  traced,
  label,
  labelHi,
  format = "inr",
  decimals = 0,
  tone = "none",
  size = "md",
  className,
  onProbe,
}: Props) {
  const [open, setOpen] = useState(false);

  const text =
    format === "pct"
      ? pct(value)
      : format === "count"
        ? fmtCount(value)
        : format === "inrSigned"
          ? inrSigned(value, decimals)
          : inr(value, decimals);

  const toneClass =
    tone === "danger"
      ? "text-[var(--danger)]"
      : tone === "success"
        ? "text-[var(--success)]"
        : tone === "auto"
          ? value < 0
            ? "text-[var(--danger)]"
            : "text-[var(--success)]"
          : "text-[var(--text)]";

  if (!traced) {
    return <span className={cn("tabular", SIZES[size], toneClass, className)}>{text}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="See how this is worked out"
        className={cn(
          "tabular inline-flex items-baseline gap-1 rounded-sm underline decoration-dotted decoration-[var(--text-subtle)] underline-offset-4",
          "hover:decoration-[var(--brand-magenta)] hover:decoration-solid",
          SIZES[size],
          toneClass,
          className,
        )}
      >
        {text}
      </button>
      <TraceDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        titleHi={labelHi}
        traced={traced}
        onProbe={onProbe}
      />
    </>
  );
}

/** A compact "see the maths" link, for places where the number sits elsewhere. */
export function TraceLink({
  traced,
  label,
  labelHi,
  className,
}: {
  traced: Traced<number> | null;
  label: string;
  labelHi?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!traced) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "hi inline-flex min-h-11 items-center text-[12px] font-medium text-[var(--brand-magenta)] hover:underline md:min-h-0",
          className,
        )}
      >
        हिसाब देखें
        <span className="ml-1 font-sans text-[var(--text-muted)]">· See the maths</span>
      </button>
      <TraceDrawer
        open={open}
        onClose={() => setOpen(false)}
        title={label}
        titleHi={labelHi}
        traced={traced}
      />
    </>
  );
}
