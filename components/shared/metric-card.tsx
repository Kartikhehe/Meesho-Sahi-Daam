import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * One figure, its label, and a sentence on whether to trust it.
 *
 * The figure carries the colour; the card does not. A tinted or striped card
 * around every metric makes a dashboard look alarmed about everything, and
 * then nothing stands out.
 */
export function MetricCard({
  label,
  labelHi,
  value,
  caption,
  tone = "neutral",
  footer,
  className,
}: {
  label: string;
  labelHi?: string;
  /** Usually an <Amount /> or <MoneyValue />, so the figure stays traceable. */
  value: ReactNode;
  caption?: ReactNode;
  tone?: "neutral" | "danger" | "warning" | "success";
  footer?: ReactNode;
  className?: string;
}) {
  const dot =
    tone === "danger"
      ? "bg-[var(--danger)]"
      : tone === "warning"
        ? "bg-[var(--warning)]"
        : tone === "success"
          ? "bg-[var(--success)]"
          : null;

  return (
    <Card className={cn("flex flex-col p-4 sm:p-5", className)}>
      <div className="flex items-start gap-2">
        {dot ? <span aria-hidden className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", dot)} /> : null}
        <div className="min-w-0">
          {labelHi ? (
            <p className="hi text-[13px] font-medium text-[var(--text)]">{labelHi}</p>
          ) : null}
          <p className={cn(labelHi ? "type-caption text-[var(--text-subtle)]" : "text-[13px] font-medium text-[var(--text-muted)]")}>
            {label}
          </p>
        </div>
      </div>
      <div className="mt-3">{value}</div>
      {caption ? (
        <p className="type-caption mt-2 text-[var(--text-muted)]">{caption}</p>
      ) : null}
      {footer ? <div className="mt-auto border-t border-[var(--border)] pt-3">{footer}</div> : null}
    </Card>
  );
}

/** A plain big number with an optional "/ total", for counts. */
export function Figure({
  value,
  of,
  tone,
}: {
  value: ReactNode;
  of?: ReactNode;
  tone?: "danger" | "success" | "warning";
}) {
  const color =
    tone === "danger"
      ? "text-[var(--danger)]"
      : tone === "success"
        ? "text-[var(--success)]"
        : tone === "warning"
          ? "text-[var(--warning)]"
          : "text-[var(--text)]";
  return (
    <span className={cn("type-figure", color)}>
      {value}
      {of !== undefined ? (
        <span className="ml-1 text-[15px] font-medium tracking-normal text-[var(--text-subtle)]">/ {of}</span>
      ) : null}
    </span>
  );
}
