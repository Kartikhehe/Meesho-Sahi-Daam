"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ROLES, ROLE_LABEL, DEFAULT_ROUTE, type Role } from "@/lib/access";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

/**
 * No real auth — a role switcher, persisted to localStorage. The "viewing as"
 * text stays visible at all times so it is never ambiguous during a demo which
 * lens the app is being seen through.
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-9 items-center gap-2 rounded-[var(--radius-input)] border border-white/20 bg-white/10 px-3 text-[13px] font-medium text-white hover:bg-white/15"
      >
        <span className="opacity-70">Viewing as</span>
        <span>{ROLE_LABEL[role].en}</span>
        <ChevronDown size={14} aria-hidden className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Switch role"
          className="absolute right-0 z-50 mt-1 w-72 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
        >
          {ROLES.map((r) => (
            <li key={r}>
              <button
                type="button"
                role="option"
                aria-selected={r === role}
                onClick={() => choose(r)}
                className={cn(
                  "w-full px-3 py-2.5 text-left hover:bg-[var(--surface-sunken)]",
                  r === role && "bg-[var(--brand-magenta-50)]",
                )}
              >
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-[var(--text)]">{ROLE_LABEL[r].en}</span>
                  <span className="hi text-[12px] text-[var(--text-subtle)]">{ROLE_LABEL[r].hi}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">{ROLE_LABEL[r].blurb}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
