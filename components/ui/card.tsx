import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * The one container. Cards lean on a hairline border; the shadow is barely
 * there and only separates them from the tinted page.
 *
 * `tone` gives a card a quiet semantic wash for the few that carry a verdict —
 * it replaces the coloured left-stripe, which reads as template furniture.
 */
type Tone = "default" | "danger" | "warning" | "success" | "info" | "sunken";

const TONES: Record<Tone, string> = {
  default: "bg-[var(--surface)] border-[var(--border)]",
  sunken: "bg-[var(--surface-sunken)] border-transparent shadow-none",
  danger: "bg-[var(--danger-bg)] border-[var(--danger-line)]",
  warning: "bg-[var(--warning-bg)] border-[var(--warning-line)]",
  success: "bg-[var(--success-bg)] border-[var(--success-line)]",
  info: "bg-[var(--info-bg)] border-[var(--info-line)]",
};

export function Card({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

/**
 * A card's title block. Hindi leads on seller screens with English beneath in
 * a lighter voice; manager and admin screens pass English only.
 */
export function CardHead({
  title,
  titleHi,
  description,
  action,
  className,
}: {
  title: string;
  titleHi?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {titleHi ? (
          <>
            <h3 className="hi type-h3 text-[var(--text)]">{titleHi}</h3>
            <p className="type-caption text-[var(--text-subtle)]">{title}</p>
          </>
        ) : (
          <h3 className="type-h3 text-[var(--text)]">{title}</h3>
        )}
        {description ? (
          <p className="type-small mt-1 text-[var(--text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// Kept for any older call sites.
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pt-4 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("type-h3 text-[var(--text)]", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("type-small mt-1 text-[var(--text-muted)]", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 pb-4", className)} {...props} />;
}
