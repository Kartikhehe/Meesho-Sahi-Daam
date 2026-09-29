"use client";

/**
 * The table primitive.
 *
 * House rules, applied here once rather than per screen: sticky header, no
 * zebra striping, row hover only, all numbers right-aligned and tabular. Sort
 * state is keyboard-operable and announced.
 */

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState } from "./empty-state";

export type Column<T> = {
  key: string;
  header: string;
  headerHi?: string;
  /** Right-align and use tabular figures. */
  numeric?: boolean;
  /** Value used for sorting. Omit to make the column unsortable. */
  sortValue?: (row: T) => number | string;
  render: (row: T) => ReactNode;
  width?: string;
  /** Hidden below md, for dense tables on a phone. */
  hideOnMobile?: boolean;
};

export function DataTable<T>({
  rows,
  columns,
  getRowKey,
  onRowClick,
  emptyTitle,
  emptyDescription,
  initialSort,
  caption,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle: string;
  emptyDescription: string;
  initialSort?: { key: string; direction: "asc" | "desc" };
  caption?: string;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = column.sortValue?.(a) ?? 0;
      const vb = column.sortValue?.(b) ?? 0;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * factor;
      return String(va).localeCompare(String(vb)) * factor;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) => {
    setSort((s) =>
      s?.key === key
        ? { key, direction: s.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "desc" },
    );
  };

  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full text-left text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="sticky top-0 z-10 bg-[var(--surface-sunken)]">
          <tr className="border-b border-[var(--border)]">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={{ width: c.width }}
                  aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
                  className={cn(
                    "px-3 py-2.5 font-semibold text-[var(--text-muted)]",
                    c.numeric && "text-right",
                    c.hideOnMobile && "hidden md:table-cell",
                  )}
                >
                  {c.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggle(c.key)}
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-[var(--text)]",
                        active && "text-[var(--text)]",
                      )}
                    >
                      {c.headerHi ? <span className="hi">{c.headerHi}</span> : c.header}
                      {active ? (
                        sort.direction === "asc" ? (
                          <ChevronUp size={12} aria-hidden />
                        ) : (
                          <ChevronDown size={12} aria-hidden />
                        )
                      ) : null}
                    </button>
                  ) : c.headerHi ? (
                    <span className="hi">{c.headerHi}</span>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              className={cn(
                "border-b border-[var(--border)] last:border-0",
                onRowClick && "cursor-pointer hover:bg-[var(--surface-sunken)]",
              )}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "px-3 py-2.5 align-middle text-[var(--text)]",
                    c.numeric && "tabular text-right",
                    c.hideOnMobile && "hidden md:table-cell",
                  )}
                >
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
