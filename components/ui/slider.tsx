"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * A labelled range input with a ghost marker showing where the value started,
 * so the size of a change is always visible rather than remembered.
 */
export function Slider({
  label,
  labelHi,
  value,
  ghost,
  min,
  max,
  step = 1,
  format,
  onChange,
  help,
  className,
}: {
  label: string;
  labelHi: string;
  value: number;
  /** The unchanged starting value, drawn as a faint marker. */
  ghost?: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  help?: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const pct = (v: number) => ((v - min) / Math.max(max - min, 1e-9)) * 100;
  const moved = ghost !== undefined && Math.abs(ghost - value) > 1e-9;

  return (
    <div className={cn("", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="min-w-0">
          <span className="hi text-[13px] font-medium text-[var(--text)]">{labelHi}</span>
          <span className="ml-1.5 text-[12px] text-[var(--text-muted)]">{label}</span>
        </label>
        <span className="tabular shrink-0 text-sm font-semibold text-[var(--text)]">
          {format(value)}
          {moved ? (
            <span className="ml-1.5 text-[11px] font-normal text-[var(--text-subtle)]">
              was {format(ghost)}
            </span>
          ) : null}
        </span>
      </div>

      <div className="relative mt-2">
        {ghost !== undefined ? (
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 z-0 h-3 w-0.5 -translate-y-1/2 bg-[var(--text-subtle)] opacity-45"
            style={{ left: `${pct(ghost)}%` }}
          />
        ) : null}
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative z-10 h-11 w-full cursor-pointer accent-[var(--brand-magenta)]"
        />
      </div>

      {help ? <div className="mt-1">{help}</div> : null}
    </div>
  );
}
