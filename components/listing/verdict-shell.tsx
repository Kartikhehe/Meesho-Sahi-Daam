import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, OctagonX } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

/**
 * The frame every verdict shares: a tinted band carrying the verdict itself,
 * then a quiet body with the reasoning and the choices.
 *
 * All three outcomes get the same anatomy and the same care. "Don't list yet"
 * in particular must not look like an error screen — it is the most useful
 * thing this product says, and it should read as advice from someone on her
 * side, not as a failure.
 */
type Tone = "success" | "warning" | "danger";

const TONE: Record<Tone, { band: string; ink: string; Icon: typeof CheckCircle2 }> = {
  success: { band: "bg-[var(--success-bg)] border-[var(--success-line)]", ink: "text-[var(--success)]", Icon: CheckCircle2 },
  warning: { band: "bg-[var(--warning-bg)] border-[var(--warning-line)]", ink: "text-[var(--warning)]", Icon: AlertTriangle },
  danger: { band: "bg-[var(--danger-bg)] border-[var(--danger-line)]", ink: "text-[var(--danger)]", Icon: OctagonX },
};

export function VerdictShell({
  tone,
  verdictHi,
  verdict,
  children,
}: {
  tone: Tone;
  verdictHi: string;
  verdict: string;
  children: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <Card className="overflow-hidden">
      <div className={cn("flex items-center gap-3.5 border-b px-5 py-4", t.band)}>
        <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface)] shadow-[var(--shadow-card)]", t.ink)}>
          <t.Icon size={22} strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="type-overline text-[var(--text-subtle)]">Our verdict</p>
          <h2 className={cn("hi text-[20px] font-semibold leading-snug", t.ink)}>{verdictHi}</h2>
          <p className="text-[13px] font-medium text-[var(--text-muted)]">{verdict}</p>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

/** Three numbers set as an equation: the clearest way to show a gap. */
export function GapEquation({
  items,
}: {
  items: { label: string; labelHi: string; value: ReactNode; tone?: "danger" | "info" | "muted" }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
      {items.map((it, i) => (
        <div key={it.label} className="contents">
          {i > 0 ? (
            <span aria-hidden className="hidden self-center text-center text-lg font-medium text-[var(--text-subtle)] sm:block">
              {i === 1 ? "vs" : "="}
            </span>
          ) : null}
          <div
            className={cn(
              "rounded-[var(--radius-input)] px-3.5 py-3",
              i === items.length - 1 ? "bg-[var(--danger-bg)]" : "bg-[var(--surface-sunken)]",
            )}
          >
            <p className="hi text-[12.5px] font-medium text-[var(--text-muted)]">{it.labelHi}</p>
            <p className="text-[11px] text-[var(--text-subtle)]">{it.label}</p>
            <div className="mt-1.5">{it.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
