import { VERDICT_COPY } from "@/engine/band";
import { STAGE_COPY } from "@/engine/lifecycle";
import { cn } from "@/lib/cn";
import type { BandVerdict, LifecycleStage } from "@/engine/types";

/**
 * Status chips: a tinted pill with a leading dot, no border.
 *
 * One language per chip. A chip is something the eye scans down a column, and
 * "सुरक्षा दाम से नीचे Below floor" in every row turns a table into noise.
 * Seller screens pass `lang="hi"`; the English meaning stays available as the
 * tooltip and to screen readers.
 */
type Tone = "danger" | "warning" | "success" | "info" | "neutral";

const TONES: Record<Tone, { chip: string; dot: string }> = {
  danger: { chip: "bg-[var(--danger-bg)] text-[var(--danger)]", dot: "bg-[var(--danger)]" },
  warning: { chip: "bg-[var(--warning-bg)] text-[var(--warning)]", dot: "bg-[var(--warning)]" },
  success: { chip: "bg-[var(--success-bg)] text-[var(--success)]", dot: "bg-[var(--success)]" },
  info: { chip: "bg-[var(--info-bg)] text-[var(--info)]", dot: "bg-[var(--info)]" },
  neutral: { chip: "bg-[var(--surface-sunken)] text-[var(--text-muted)]", dot: "bg-[var(--neutral-data)]" },
};

export function StatusChip({
  children,
  tone = "neutral",
  dot = true,
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
  title?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-chip)] px-2 text-[11.5px] font-medium leading-none",
        t.chip,
        className,
      )}
    >
      {dot ? <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", t.dot)} /> : null}
      {children}
    </span>
  );
}

/** Where a price sits in its band. */
export function BandChip({
  verdict,
  lang = "en",
  className,
}: {
  verdict: BandVerdict;
  lang?: "hi" | "en";
  className?: string;
}) {
  const copy = VERDICT_COPY[verdict];
  return (
    <StatusChip tone={copy.tone} title={`${copy.label} — ${copy.meaning}`} className={className}>
      {lang === "hi" ? (
        <>
          <span className="hi">{copy.labelHi}</span>
          <span className="sr-only"> ({copy.label})</span>
        </>
      ) : (
        copy.label
      )}
    </StatusChip>
  );
}

export function StageChip({ stage, className }: { stage: LifecycleStage; className?: string }) {
  const copy = STAGE_COPY[stage];
  return (
    <StatusChip tone="neutral" dot={false} title={`${copy.window} — ${copy.policy}`} className={className}>
      {copy.label}
    </StatusChip>
  );
}

/**
 * The Daam Score. A number on its own ("21") means nothing to a reader, so the
 * chip carries a small meter behind the figure — the length says "out of 100"
 * without another word.
 */
export function ScoreChip({
  score,
  showLabel = false,
  className,
}: {
  score: number;
  showLabel?: boolean;
  className?: string;
}) {
  const tone: Tone = score < 40 ? "danger" : score < 70 ? "warning" : "success";
  const t = TONES[tone];
  const pct = Math.max(4, Math.min(100, score));

  return (
    <span
      title={`Daam Score ${score} out of 100`}
      className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}
    >
      {showLabel ? (
        <span className="text-[11.5px] font-medium text-[var(--text-subtle)]">Score</span>
      ) : null}
      <span className="tabular w-[1.6rem] text-right text-[13px] font-semibold text-[var(--text)]">
        {score}
      </span>
      <span aria-hidden className="h-1.5 w-10 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
        <span className={cn("block h-full rounded-full", t.dot)} style={{ width: `${pct}%` }} />
      </span>
      <span className="sr-only">out of 100</span>
    </span>
  );
}
