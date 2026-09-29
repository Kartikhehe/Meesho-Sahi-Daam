import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * A message that carries a verdict — "no price works here", "the band opened",
 * "this is too small to conclude anything".
 *
 * A quiet tinted surface with an icon, rather than a card with a coloured left
 * stripe. The icon carries the tone for anyone who cannot distinguish the
 * colours, so meaning never rests on hue alone.
 */
type Tone = "danger" | "warning" | "success" | "info" | "neutral";

const STYLES: Record<Tone, { box: string; icon: string; Icon: typeof Info }> = {
  danger: {
    box: "bg-[var(--danger-bg)] border-[var(--danger-line)]",
    icon: "text-[var(--danger)]",
    Icon: OctagonAlert,
  },
  warning: {
    box: "bg-[var(--warning-bg)] border-[var(--warning-line)]",
    icon: "text-[var(--warning)]",
    Icon: AlertTriangle,
  },
  success: {
    box: "bg-[var(--success-bg)] border-[var(--success-line)]",
    icon: "text-[var(--success)]",
    Icon: CheckCircle2,
  },
  info: {
    box: "bg-[var(--info-bg)] border-[var(--info-line)]",
    icon: "text-[var(--info)]",
    Icon: Info,
  },
  neutral: {
    box: "bg-[var(--surface-sunken)] border-transparent",
    icon: "text-[var(--text-muted)]",
    Icon: Info,
  },
};

export function Callout({
  tone = "neutral",
  title,
  titleHi,
  children,
  actions,
  icon = true,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  titleHi?: string;
  children?: ReactNode;
  actions?: ReactNode;
  icon?: boolean;
  className?: string;
}) {
  const s = STYLES[tone];
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "status" : undefined}
      className={cn("rounded-[var(--radius-card)] border px-4 py-3.5", s.box, className)}
    >
      <div className="flex gap-3">
        {icon ? <s.Icon size={18} aria-hidden className={cn("mt-0.5 shrink-0", s.icon)} /> : null}
        <div className="min-w-0 flex-1">
          {titleHi ? <p className={cn("hi type-h3", s.icon)}>{titleHi}</p> : null}
          {title ? (
            <p
              className={cn(
                titleHi ? "type-caption font-medium text-[var(--text-muted)]" : "type-h3 text-[var(--text)]",
              )}
            >
              {title}
            </p>
          ) : null}
          {children ? (
            <div className={cn("type-small text-[var(--text)]", (title || titleHi) && "mt-1.5")}>{children}</div>
          ) : null}
          {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
