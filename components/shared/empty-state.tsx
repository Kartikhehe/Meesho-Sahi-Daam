import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Empty states always say what to do next, never just "No data".
 * An empty screen is a moment where a seller decides whether this tool is for
 * her, so it gets the same care as a full one.
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
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed px-6 py-10 text-center",
        tone === "success"
          ? "border-[var(--success)]/35 bg-[var(--success-bg)]"
          : "border-[var(--border-strong)] bg-[var(--surface-sunken)]",
        className,
      )}
    >
      <p
        className={cn(
          "text-sm font-semibold",
          tone === "success" ? "text-[var(--success)]" : "text-[var(--text)]",
        )}
      >
        {title}
      </p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--text-muted)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Skeleton block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-[var(--radius-input)] bg-[var(--surface-sunken)]", className)}
    />
  );
}

/** The standard three-state wrapper: loading, error, empty, then content. */
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
    return <>{skeleton ?? <Skeleton className="h-40 w-full" />}</>;
  }
  if (status === "error") {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-4 py-3">
        <p className="text-sm font-medium text-[var(--danger)]">This could not be loaded</p>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          {error ?? "Try again, or move to another screen."}
        </p>
      </div>
    );
  }
  if (isEmpty && empty) return <>{empty}</>;
  return <>{children}</>;
}
