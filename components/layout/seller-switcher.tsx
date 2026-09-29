"use client";

/**
 * Which seller the app is "signed in" as. No auth — this is a demo control,
 * and the six personas carry the whole narrative, so moving between them has
 * to be one tap from anywhere. On a phone it collapses to her initials.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorld } from "@/lib/use-seller";
import { cn } from "@/lib/cn";
import { PERSONAS } from "@/data/generator/personas";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SellerSwitcher() {
  const { world } = useWorld();
  const activeSellerId = useUiStore((s) => s.activeSellerId);
  const setActiveSeller = useUiStore((s) => s.setActiveSeller);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const sellers = world?.sellers ?? [];
  const active = sellers.find((s) => s.id === activeSellerId) ?? sellers[0];
  if (!active) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Seller: ${active.businessName}. Switch seller`}
        className="flex h-9 items-center gap-2 rounded-full bg-white/[0.08] pl-1 pr-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.14] sm:pr-2.5"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--brand-aam)] text-[11px] font-bold text-[#3b2600]">
          {initials(active.name)}
        </span>
        <span className="hidden max-w-[160px] truncate sm:inline">{active.businessName}</span>
        <ChevronDown size={14} aria-hidden className={cn("shrink-0 text-white/60 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Switch seller"
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-pop)]"
        >
          <li className="type-overline px-3 pb-1 pt-2 text-[var(--text-subtle)]">Sign in as</li>
          {sellers.map((s) => {
            const persona = PERSONAS.find((p) => p.id === s.id);
            const selected = s.id === active.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setActiveSeller(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-left hover:bg-[var(--surface-sunken)]",
                    selected && "bg-[var(--brand-magenta-50)]",
                  )}
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[11px] font-bold text-[var(--text-muted)]">
                    {initials(s.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-[var(--text)]">{s.businessName}</span>
                      <span className="shrink-0 text-[11.5px] text-[var(--text-subtle)]">{s.city}</span>
                    </span>
                    <span className="type-caption block text-[var(--text-muted)]">{s.name}</span>
                    {persona ? (
                      <span className="type-caption mt-1 block text-[var(--text-subtle)]">{persona.tagline}</span>
                    ) : null}
                  </span>
                  {selected ? <Check size={16} aria-hidden className="mt-1 shrink-0 text-[var(--brand-ink)]" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
