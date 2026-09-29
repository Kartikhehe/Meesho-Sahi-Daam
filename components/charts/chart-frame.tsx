"use client";

/**
 * Shared chart chrome: an accessible title, a "view as table" text
 * alternative, a footer slot for legends, and an empty state. Every chart in
 * the product wears this, so the accessibility guarantees are structural
 * rather than per-chart discipline.
 */

import { useState, type ReactNode } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/shared/empty-state";

export type TableRow = { label: string; value: string; note?: string };

export function ChartFrame({
  title,
  titleHi,
  description,
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
  const hasTitle = !!(title || titleHi);

  const toggle = !isEmpty ? (
    <button
      type="button"
      onClick={() => setAsTable((v) => !v)}
      aria-pressed={asTable}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-input)] px-2 text-[12px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
    >
      {asTable ? <BarChart3 size={14} aria-hidden /> : <Table2 size={14} aria-hidden />}
      <span className="hidden sm:inline">{asTable ? "Chart" : "Table"}</span>
      <span className="sr-only sm:hidden">{asTable ? "View as chart" : "View as table"}</span>
    </button>
  ) : null;

  return (
    <figure className={cn("m-0 min-w-0", className)}>
      <div className={cn("flex items-start justify-between gap-3", hasTitle ? "mb-3" : "mb-1")}>
        {hasTitle ? (
          <figcaption className="min-w-0">
            {titleHi ? <p className="hi type-h3 text-[var(--text)]">{titleHi}</p> : null}
            {title ? (
              <p className={titleHi ? "type-caption text-[var(--text-subtle)]" : "type-h3 text-[var(--text)]"}>
                {title}
              </p>
            ) : null}
          </figcaption>
        ) : (
          <figcaption className="sr-only">{description}</figcaption>
        )}
        <div className={hasTitle ? "" : "ml-auto"}>{toggle}</div>
      </div>

      {isEmpty ? (
        <EmptyState
          title={emptyTitle ?? "Nothing to chart yet"}
          description={emptyDescription ?? "This fills in once you have orders."}
        />
      ) : asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">{description}</caption>
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="py-2 pr-3 font-medium text-[var(--text-subtle)]">
                  {tableHeaders[0]}
                </th>
                <th scope="col" className="py-2 text-right font-medium text-[var(--text-subtle)]">
                  {tableHeaders[1]}
                </th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-2 pr-3 text-[var(--text)]">
                    {r.label}
                    {r.note ? <span className="block text-[12px] text-[var(--text-subtle)]">{r.note}</span> : null}
                  </td>
                  <td className="tabular py-2 text-right font-medium text-[var(--text)]">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}

      {footer && !asTable && !isEmpty ? <div className="mt-3">{footer}</div> : null}
    </figure>
  );
}
