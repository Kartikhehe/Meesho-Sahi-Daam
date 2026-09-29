"use client";

/**
 * The trace drawer — "हिसाब देखें", see the maths.
 *
 * ONE drawer for the whole product. Any number rendered through <MoneyValue />
 * opens this, showing the full derivation tree colour-coded by where each input
 * came from, plus a sensitivity row answering "what if this input were wrong?".
 *
 * The bar it has to clear: readable by someone who does not know the word
 * "margin". Plain rupees, plain Hindi, one idea per line.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { byUnit } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Assumption, Source, TraceStep, Traced } from "@/engine/trace";

const SOURCE_COPY: Record<Source, { label: string; labelHi: string; dot: string; note: string }> = {
  seller_input: {
    label: "You told us",
    labelHi: "आपने बताया",
    dot: "bg-[var(--brand-magenta)]",
    note: "You entered this. Change it any time.",
  },
  platform_ledger: {
    label: "From your orders",
    labelHi: "आपके ऑर्डर से",
    dot: "bg-[var(--info)]",
    note: "Measured from your own order and settlement history.",
  },
  cluster_model: {
    label: "From the market",
    labelHi: "बाज़ार से",
    dot: "bg-[var(--warning)]",
    note: "Read from the listings buyers see next to yours. Public prices only.",
  },
  benchmark: {
    label: "Industry figure",
    labelHi: "उद्योग का आँकड़ा",
    dot: "bg-[var(--neutral-data)]",
    note: "A published benchmark. See Data Provenance for the source.",
  },
  derived: {
    label: "Calculated",
    labelHi: "गणना की गई",
    dot: "bg-[var(--success)]",
    note: "Worked out from the lines above it.",
  },
};

function Row({ step, depth }: { step: TraceStep; depth: number }) {
  const [open, setOpen] = useState(false);
  const hasChildren = !!step.children?.length;
  const source = SOURCE_COPY[step.source];
  const negative = step.unit === "INR" && step.value < 0;

  return (
    <li>
      <div
        className={cn(
          "flex items-start gap-2 border-b border-[var(--border)] py-2.5",
          depth > 0 && "pl-3",
        )}
        style={{ paddingLeft: depth ? depth * 14 : undefined }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--text-subtle)] hover:text-[var(--text)]"
          >
            <ChevronRight
              size={14}
              aria-hidden
              className={cn("transition-transform", open && "rotate-90")}
            />
            <span className="sr-only">
              {open ? "Hide" : "Show"} how {step.label} was worked out
            </span>
          </button>
        ) : (
          <span className="mt-2 ml-1 shrink-0">
            <span className={cn("block h-1.5 w-1.5 rounded-full", source.dot)} aria-hidden />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="hi text-[13px] font-medium leading-snug text-[var(--text)]">
            {step.labelHi}
          </p>
          <p className="text-[12px] leading-snug text-[var(--text-muted)]">{step.label}</p>
          <p className="tabular mt-1 text-[11px] text-[var(--text-subtle)]">{step.formula}</p>
          {step.sourceNote ? (
            <p className="mt-1 text-[11px] italic leading-snug text-[var(--text-subtle)]">
              {step.sourceNote}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "tabular text-[13px] font-semibold",
              negative ? "text-[var(--danger)]" : "text-[var(--text)]",
            )}
          >
            {byUnit(step.value, step.unit)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--text-subtle)]">
            {source.label}
          </p>
        </div>
      </div>

      {hasChildren && open ? (
        <ul>
          {step.children?.map((child, i) => (
            <Row key={`${child.label}-${i}`} step={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** "What if this input were wrong?" — one row per assumption. */
function Sensitivity({
  assumptions,
  onProbe,
}: {
  assumptions: Assumption[];
  onProbe?: (key: string, multiplier: number) => number | null;
}) {
  if (!assumptions.length) return null;

  return (
    <section className="mt-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
        What if these were wrong?
      </h3>
      <ul className="mt-2 space-y-2">
        {assumptions.map((a) => {
          const probed = onProbe?.(a.key, 1.25) ?? null;
          return (
            <li
              key={a.key}
              className="rounded-[var(--radius-input)] border border-[var(--border)] bg-[var(--surface-sunken)] px-3 py-2"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] font-medium text-[var(--text)]">{a.label}</p>
                <p className="tabular shrink-0 text-[12px] text-[var(--text-muted)]">
                  {byUnit(a.value, a.unit)}
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">{a.note}</p>
              {probed !== null ? (
                <p className="tabular mt-1 text-[11px] text-[var(--text-subtle)]">
                  A quarter higher would move the answer to {byUnit(probed, "INR")}.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function TraceDrawer({
  open,
  onClose,
  title,
  titleHi,
  traced,
  onProbe,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  titleHi?: string;
  traced: Traced<number> | null;
  onProbe?: (key: string, multiplier: number) => number | null;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus moves into the drawer, and is trapped while it is open.
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !traced) return null;

  const total = traced.trace[traced.trace.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} — how this is worked out`}
        className="relative flex h-full w-full max-w-md flex-col bg-[var(--surface)] shadow-[var(--shadow-card)]"
      >
        <header className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
              हिसाब देखें · See the maths
            </p>
            {titleHi ? (
              <h2 className="hi mt-1 text-base font-semibold text-[var(--text)]">{titleHi}</h2>
            ) : null}
            <p className="text-[13px] text-[var(--text-muted)]">{title}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[var(--radius-input)] p-2 text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]"
          >
            <X size={18} aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <ul>
            {traced.trace.map((step, i) => (
              <Row key={`${step.label}-${i}`} step={step} depth={0} />
            ))}
          </ul>

          <Sensitivity assumptions={traced.assumptions} onProbe={onProbe} />

          <section className="mt-4 border-t border-[var(--border)] pt-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-subtle)]">
              Where each number comes from
            </h3>
            <ul className="mt-2 space-y-1.5">
              {(Object.keys(SOURCE_COPY) as Source[]).map((s) => (
                <li key={s} className="flex items-start gap-2">
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", SOURCE_COPY[s].dot)} aria-hidden />
                  <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
                    <span className="font-medium text-[var(--text)]">{SOURCE_COPY[s].label}</span>
                    {" — "}
                    {SOURCE_COPY[s].note}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {total ? (
          <footer className="border-t border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="hi text-[13px] font-medium text-[var(--text)]">{total.labelHi}</p>
              <p
                className={cn(
                  "tabular text-lg font-semibold",
                  total.unit === "INR" && total.value < 0
                    ? "text-[var(--danger)]"
                    : "text-[var(--text)]",
                )}
              >
                {byUnit(total.value, total.unit)}
              </p>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
