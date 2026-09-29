import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A row of labelled figures divided by hairlines — two across on a phone,
 * up to four on a desktop. Used wherever a screen states several facts about
 * one thing side by side.
 */
export type Stat = { label: string; labelHi?: string; value: ReactNode; note?: ReactNode };

export function StatStrip({ stats, className }: { stats: Stat[]; className?: string }) {
  const cols = stats.length >= 4 ? "sm:grid-cols-4" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <dl
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--border)] [gap:1px]",
        cols,
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="bg-[var(--surface)] px-4 py-3.5">
          <dt className="leading-tight">
            {s.labelHi ? (
              <>
                <span className="hi block text-[12.5px] font-medium text-[var(--text-muted)]">{s.labelHi}</span>
                <span className="block text-[11px] text-[var(--text-subtle)]">{s.label}</span>
              </>
            ) : (
              <span className="block text-[12px] font-medium text-[var(--text-muted)]">{s.label}</span>
            )}
          </dt>
          <dd className="mt-2">{s.value}</dd>
          {s.note ? <dd className="type-caption mt-1 text-[var(--text-subtle)]">{s.note}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
