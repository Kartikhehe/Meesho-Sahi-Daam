"use client";

/**
 * Shared chart chrome: accessible title/description, a "view as table" toggle,
 * and an empty state. Every chart in the product wears this, so the
 * accessibility guarantees are structural rather than per-chart discipline.
 */

import { useId, useState, type ReactNode } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/shared/empty-state";

export type TableRow = { label: string; value: string; note?: string };

export function ChartFrame({
  title,
  titleHi,
  description,
  /** Rows shown by the "view as table" toggle — the chart's text alternative. */
  tableRows,
  tableHeaders = ["", "Value"],
  isEmpty,
  emptyTitle,
  emptyDescription,
  footer,
  children,
  className,
}: {
  title: string;
  titleHi?: string;
  description: string;
  tableRows: TableRow[];
  tableHeaders?: [string, string];
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const id = useId();

  return (
    <figure className={cn("m-0", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <figcaption className="min-w-0">
          {titleHi ? (
            <p className="hi text-sm font-semibold text-[var(--text)]">{titleHi}</p>
          ) : null}
          <p
            className={cn(
              titleHi ? "text-[12px] text-[var(--text-muted)]" : "text-sm font-semibold text-[var(--text)]",
            )}
          >
            {title}
          </p>
        </figcaption>
        {!isEmpty ? (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
          >
            {asTable ? <BarChart3 size={12} aria-hidden /> : <Table2 size={12} aria-hidden />}
            {asTable ? "View as chart" : "View as table"}
          </button>
        ) : null}
      </div>

      {isEmpty ? (
        <EmptyState
          title={emptyTitle ?? "Nothing to chart yet"}
          description={emptyDescription ?? "This fills in once you have orders."}
        />
      ) : asTable ? (
        <table className="w-full text-left text-[13px]">
          <caption className="sr-only">{description}</caption>
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th scope="col" className="py-1.5 font-semibold text-[var(--text-muted)]">
                {tableHeaders[0]}
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold text-[var(--text-muted)]">
                {tableHeaders[1]}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r) => (
              <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                <td className="py-1.5 text-[var(--text)]">
                  {r.label}
                  {r.note ? (
                    <span className="block text-[11px] text-[var(--text-subtle)]">{r.note}</span>
                  ) : null}
                </td>
                <td className="tabular py-1.5 text-right font-medium text-[var(--text)]">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div id={id}>{children}</div>
      )}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </figure>
  );
}
