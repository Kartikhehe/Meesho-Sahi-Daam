import type { ReactNode } from "react";
import { CheckCircle2, Inbox, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Empty states always say what to do next, never just "No data". An empty
 * screen is the moment a seller decides whether this tool is for her.
 *
 * A calm, genuinely good empty state ("nothing is below its floor") uses the
 * success tone — it is news, not an absence.
 */
export function EmptyState({
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  tone?: "neutral" | "success";
  className?: string;
}) {
  const Icon = tone === "success" ? CheckCircle2 : Inbox;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border px-6 py-12 text-center",
        tone === "success"
          ? "border-[var(--success-line)] bg-[var(--success-bg)]"
          : "border-dashed border-[var(--border-strong)] bg-[var(--surface)]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mb-3 grid h-10 w-10 place-items-center rounded-full",
          tone === "success"
            ? "bg-[var(--surface)] text-[var(--success)]"
            : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]",
        )}
      >
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <p className={cn("type-h3", tone === "success" ? "text-[var(--success)]" : "text-[var(--text)]")}>
        {title}
      </p>
      <p className="type-small mt-1.5 max-w-sm text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-sunken)]", className)}
    />
  );
}

/** Loading, error, empty, then content — in that order, everywhere. */
export function StateGate({
  status,
  error,
  isEmpty,
  empty,
  skeleton,
  children,
}: {
  status: "idle" | "loading" | "ready" | "error";
  error?: string | null;
  isEmpty?: boolean;
  empty?: ReactNode;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  if (status === "loading" || status === "idle") {
    return (
      <div role="status" aria-label="Loading">
        {skeleton ?? <Skeleton className="h-40 w-full" />}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="flex gap-3 rounded-[var(--radius-card)] border border-[var(--danger-line)] bg-[var(--danger-bg)] px-4 py-3.5">
        <TriangleAlert size={18} aria-hidden className="mt-0.5 shrink-0 text-[var(--danger)]" />
        <div>
          <p className="type-h3 text-[var(--danger)]">This could not be loaded</p>
          <p className="type-small mt-1 text-[var(--text-muted)]">
            {error ?? "Try again, or move to another screen."}
          </p>
        </div>
      </div>
    );
  }
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}
