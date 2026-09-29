"use client";

/**
 * A7 · Audit log.
 *
 * Every config change and every manager drill-in, with actor, timestamp,
 * before, after and blast radius. This is not decoration: changing a cost
 * model changes what sellers are told about their own businesses, and reading
 * one seller's costs is a privacy event. Both should leave a trace that
 * someone else can read.
 */

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/shared/status-chip";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { useWorld } from "@/lib/use-seller";
import { useSellerStore } from "@/lib/store/world-store";
import { count } from "@/lib/format";
import { cn } from "@/lib/cn";

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditPage() {
  const { status, error } = useWorld();
  const auditLog = useSellerStore((s) => s.auditLog);
  const [filter, setFilter] = useState<"all" | "config" | "access">("all");

  const rows = useMemo(() => {
    const sorted = [...auditLog].sort((a, b) => b.timestamp - a.timestamp);
    if (filter === "all") return sorted;
    const isAccess = (action: string) => action.toLowerCase().includes("seller");
    return sorted.filter((e) => (filter === "access" ? isAccess(e.action) : !isAccess(e.action)));
  }, [auditLog, filter]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 md:px-6">
      <header className="mb-4">
        <span className="rounded-[var(--radius-chip)] bg-[var(--surface-sunken)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          A7
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">Audit log</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Every change to the cost model, and every time someone opened a seller&rsquo;s cost detail
        </p>
      </header>

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-80 w-full" />}>
        <div className="mb-3 flex flex-wrap gap-2">
          {([
            ["all", "Everything"],
            ["config", "Configuration changes"],
            ["access", "Seller data access"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-[var(--radius-chip)] border px-3 py-1.5 text-[12px] font-medium",
                filter === key
                  ? "border-[var(--brand-magenta)] bg-[var(--brand-magenta-50)] text-[var(--text)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            description="Change something in engine configuration, guardrails or rollout — or open a seller from the manager's seller list — and it will appear here with its blast radius."
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((e) => (
              <li key={e.id}>
                <Card className="p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={e.actor === "Admin" ? "info" : "warning"}>
                      {e.actor}
                    </StatusChip>
                    <span className="text-[13px] font-medium text-[var(--text)]">{e.action}</span>
                    <span className="tabular ml-auto shrink-0 text-[11px] text-[var(--text-subtle)]">
                      {timeAgo(e.timestamp)} · sim day {count(e.day)}
                    </span>
                  </div>

                  <p className="mt-1 text-[12px] text-[var(--text-muted)]">{e.subject}</p>

                  {e.before || e.after ? (
                    <dl className="mt-2 grid gap-1.5 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2 sm:grid-cols-2">
                      {e.before ? (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
                            Before
                          </dt>
                          <dd className="text-[12px] text-[var(--text-muted)]">{e.before}</dd>
                        </div>
                      ) : null}
                      {e.after ? (
                        <div>
                          <dt className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
                            After
                          </dt>
                          <dd className="text-[12px] text-[var(--text)]">{e.after}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}

                  {e.blastRadius ? (
                    <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                      <strong className="text-[var(--text)]">Blast radius:</strong> {e.blastRadius}
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[12px] leading-relaxed text-[var(--text-subtle)]">
          Entries are kept in this browser, so they survive a reload but are local to this machine.
          In production this would be an append-only server-side log.
        </p>
      </StateGate>
    </div>
  );
}
