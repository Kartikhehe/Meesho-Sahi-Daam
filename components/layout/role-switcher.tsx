"use client";

import { useRouter } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ROLES, ROLE_LABEL, DEFAULT_ROUTE, type Role } from "@/lib/access";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

/**
 * No real auth — a role switcher, persisted locally. The current role stays
 * visible at all times so it is never ambiguous in a demo whose lens the app
 * is being seen through.
 */
export function RoleSwitcher() {
  const role = useUiStore((s) => s.role);
  const setRole = useUiStore((s) => s.setRole);
  const router = useRouter();
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

  const choose = (next: Role) => {
    setRole(next);
    setOpen(false);
    router.push(DEFAULT_ROUTE[next]);
  };

  const short = role === "manager" ? "Manager" : ROLE_LABEL[role].en;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Viewing as ${ROLE_LABEL[role].en}. Switch role`}
        className="flex h-9 items-center gap-1.5 rounded-full bg-white/[0.08] pl-3 pr-2 text-[13px] font-medium text-white transition-colors hover:bg-white/[0.14]"
      >
        <span className="hidden text-white/55 lg:inline">Viewing as</span>
        <span>{short}</span>
        <ChevronDown size={14} aria-hidden className={cn("text-white/60 transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Switch role"
          className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-pop)]"
        >
          <li className="type-overline px-3 pb-1 pt-2 text-[var(--text-subtle)]">View the product as</li>
          {ROLES.map((r) => (
            <li key={r}>
              <button
                type="button"
                role="option"
                aria-selected={r === role}
                onClick={() => choose(r)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[var(--radius-input)] px-3 py-2.5 text-left hover:bg-[var(--surface-sunken)]",
                  r === role && "bg-[var(--brand-magenta-50)]",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[var(--text)]">{ROLE_LABEL[r].en}</span>
                    <span className="hi text-[12px] text-[var(--text-subtle)]">{ROLE_LABEL[r].hi}</span>
                  </div>
                  <p className="type-caption mt-0.5 text-[var(--text-muted)]">{ROLE_LABEL[r].blurb}</p>
                </div>
                {r === role ? (
                  <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-[var(--brand-ink)]" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
