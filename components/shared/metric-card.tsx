import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * A single figure with its label and, where there is one, its derivation.
 * Kept deliberately plain: the number is the thing, and everything else on the
 * card is there to tell the seller whether to trust it.
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
  /** Usually a <MoneyValue />, so the figure stays traceable. */
  value: ReactNode;
  caption?: string;
  tone?: "neutral" | "danger" | "warning" | "success";
  footer?: ReactNode;
  className?: string;
}) {
  const accent =
    tone === "danger"
      ? "border-l-[var(--danger)]"
      : tone === "warning"
        ? "border-l-[var(--warning)]"
        : tone === "success"
          ? "border-l-[var(--success)]"
          : "border-l-transparent";

  return (
    <Card className={cn("border-l-[3px] p-4", accent, className)}>
      {labelHi ? (
        <p className="hi text-[13px] font-medium text-[var(--text)]">{labelHi}</p>
      ) : null}
      <p className="text-[12px] text-[var(--text-muted)]">{label}</p>
      <div className="mt-2">{value}</div>
      {caption ? (
        <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--text-muted)]">{caption}</p>
      ) : null}
      {footer ? <div className="mt-3 border-t border-[var(--border)] pt-2.5">{footer}</div> : null}
    </Card>
  );
}
