"use client";

/**
 * Which seller the app is "signed in" as. No auth — this is a demo control,
 * and the six personas are the whole narrative, so moving between them has to
 * be one click from anywhere.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Store } from "lucide-react";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorld } from "@/lib/use-seller";
import { cn } from "@/lib/cn";
import { PERSONAS } from "@/data/generator/personas";

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
        className="flex h-9 max-w-[190px] items-center gap-1.5 rounded-[var(--radius-input)] border border-white/20 bg-white/10 px-2.5 text-[13px] font-medium text-white hover:bg-white/15"
      >
        <Store size={13} aria-hidden className="shrink-0 opacity-70" />
        <span className="truncate">{active.businessName}</span>
        <ChevronDown size={13} aria-hidden className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Switch seller"
          className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
        >
          {sellers.map((s) => {
            const persona = PERSONAS.find((p) => p.id === s.id);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={s.id === active.id}
                  onClick={() => {
                    setActiveSeller(s.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2.5 text-left hover:bg-[var(--surface-sunken)]",
                    s.id === active.id && "bg-[var(--brand-magenta-50)]",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--text)]">{s.businessName}</span>
                    <span className="shrink-0 text-[11px] text-[var(--text-subtle)]">{s.city}</span>
                  </div>
                  <p className="text-[12px] text-[var(--text-muted)]">{s.name}</p>
                  {persona ? (
                    <p className="mt-0.5 text-[11px] leading-snug text-[var(--text-subtle)]">
                      {persona.tagline}
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
