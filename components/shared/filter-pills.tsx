"use client";

import { cn } from "@/lib/cn";

/**
 * A row of filters with counts. Scrolls sideways on a phone rather than
 * wrapping into a ragged block, so the list below stays where the thumb
 * expects it.
 */
export type Pill<K extends string> = { key: K; label: string; labelHi?: string; count?: number };

export function FilterPills<K extends string>({
  pills,
  value,
  onChange,
  label,
  className,
}: {
  pills: Pill<K>[];
  value: K;
  onChange: (key: K) => void;
  /** Accessible name for the group. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("scroll-quiet -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0", className)}
    >
      {pills.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p.key)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              active
                ? "bg-[var(--text)] text-[var(--surface)]"
                : "bg-[var(--surface)] text-[var(--text-muted)] shadow-[inset_0_0_0_1px_var(--border)] hover:text-[var(--text)] hover:shadow-[inset_0_0_0_1px_var(--border-strong)]",
            )}
          >
            <span className={p.labelHi ? "hi" : undefined}>{p.labelHi ?? p.label}</span>
            {p.count !== undefined ? (
              <span
                className={cn(
                  "tabular rounded-full px-1.5 text-[11.5px] leading-[18px]",
                  active ? "bg-[color-mix(in_srgb,var(--surface)_22%,transparent)]" : "bg-[var(--surface-sunken)] text-[var(--text-subtle)]",
                )}
              >
                {p.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
