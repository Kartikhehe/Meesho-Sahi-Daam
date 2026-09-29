import { VERDICT_COPY } from "@/engine/band";
import { cn } from "@/lib/cn";
import type { BandVerdict, LifecycleStage } from "@/engine/types";
import { STAGE_COPY } from "@/engine/lifecycle";

type Tone = "danger" | "warning" | "success" | "info" | "neutral";

const TONES: Record<Tone, string> = {
  danger: "text-[var(--danger)] bg-[var(--danger-bg)] border-[var(--danger)]/25",
  warning: "text-[var(--warning)] bg-[var(--warning-bg)] border-[var(--warning)]/25",
  success: "text-[var(--success)] bg-[var(--success-bg)] border-[var(--success)]/25",
  info: "text-[var(--info)] bg-[var(--info-bg)] border-[var(--info)]/25",
  neutral: "text-[var(--text-muted)] bg-[var(--surface-sunken)] border-[var(--border)]",
};

export function StatusChip({
  children,
  tone = "neutral",
  className,
  title,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[var(--radius-chip)] border px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The band verdict, in the seller's own words. */
export function BandChip({ verdict, className }: { verdict: BandVerdict; className?: string }) {
  const copy = VERDICT_COPY[verdict];
  return (
    <StatusChip tone={copy.tone} title={copy.meaning} className={className}>
      <span className="hi">{copy.labelHi}</span>
      <span className="ml-1 text-[10px] opacity-70">{copy.label}</span>
    </StatusChip>
  );
}

export function StageChip({ stage, className }: { stage: LifecycleStage; className?: string }) {
  const copy = STAGE_COPY[stage];
  return (
    <StatusChip tone="neutral" title={`${copy.window} — ${copy.policy}`} className={className}>
      {copy.label}
    </StatusChip>
  );
}

/** The Daam Score, 0-100, coloured by band. */
export function ScoreChip({ score, className }: { score: number; className?: string }) {
  const tone: Tone = score < 40 ? "danger" : score < 70 ? "warning" : "success";
  return (
    <StatusChip tone={tone} className={cn("tabular", className)}>
      {score}
    </StatusChip>
  );
}
