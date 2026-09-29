"use client";

/**
 * Phone navigation, under 768px. The seller gets four tabs for what she opens
 * daily and a "More" sheet for everything else — so no screen is unreachable
 * on the device she actually uses. Managers and admins get the sheet alone.
 *
 * 56px targets; labels are Hindi for the seller, because the tabs are the
 * words she sees most often.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PlayCircle, X } from "lucide-react";
import { MOBILE_TABS, NAV_BY_ROLE, NAV_GROUPS } from "@/lib/nav";
import { useUiStore } from "@/lib/store/ui-store";
import { useStartStory } from "@/components/story/story-rail";
import { ThemeToggle } from "./theme-toggle";
import { NavIcon } from "./nav-icon";
import { cn } from "@/lib/cn";

function MoreSheet({ onClose }: { onClose: () => void }) {
  const role = useUiStore((s) => s.role);
  const pathname = usePathname();
  const startStory = useStartStory();
  const items = NAV_BY_ROLE[role];
  const bilingual = role === "seller";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="All screens">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-[var(--surface)] shadow-[var(--shadow-pop)]"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div className="sticky top-0 flex items-center justify-between bg-[var(--surface)] px-4 pb-2 pt-3">
          <span aria-hidden className="absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full bg-[var(--border-strong)]" />
          <p className="type-h2 mt-2 text-[var(--text)]">All screens</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 grid h-10 w-10 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]"
          >
            <X size={18} aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="px-3">
          {NAV_GROUPS[role].map((g) => {
            const groupItems = items.filter((i) => i.group === g.key);
            if (!groupItems.length) return null;
            return (
              <div key={g.key} className="mt-3">
                <p className="px-2 pb-1 text-[11.5px] font-medium text-[var(--text-subtle)]">
                  {bilingual && g.labelHi ? <span className="hi">{g.labelHi} · </span> : null}
                  {g.label}
                </p>
                <ul>
                  {groupItems.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-[var(--radius-input)] px-2",
                            active ? "bg-[var(--brand-magenta-50)]" : "active:bg-[var(--surface-sunken)]",
                          )}
                        >
                          <span className={active ? "text-[var(--brand-ink)]" : "text-[var(--text-subtle)]"}>
                            <NavIcon name={item.icon} size={20} />
                          </span>
                          <span className="leading-tight">
                            <span className={cn("block text-[15px] font-medium text-[var(--text)]", bilingual && "hi")}>
                              {bilingual ? item.labelHi ?? item.label : item.label}
                            </span>
                            {bilingual ? (
                              <span className="block text-[12px] text-[var(--text-subtle)]">{item.label}</span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          <div className="mt-4 space-y-3 border-t border-[var(--border)] px-2 pt-4">
            <button
              type="button"
              onClick={() => {
                onClose();
                startStory();
              }}
              className="flex min-h-11 w-full items-center gap-3 text-left"
            >
              <PlayCircle size={20} aria-hidden className="text-[var(--brand-ink)]" />
              <span className="text-[15px] font-medium text-[var(--text)]">Story mode</span>
            </button>
            <div className="flex items-center justify-between gap-3 pb-1">
              <span className="text-[13px] font-medium text-[var(--text-muted)]">Theme</span>
              <ThemeToggle onBar={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BottomTabs() {
  const role = useUiStore((s) => s.role);
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const tabs = role === "seller" ? MOBILE_TABS : [];

  return (
    <>
      <nav
        aria-label="Primary, compact"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className={cn("grid", tabs.length ? "grid-cols-5" : "grid-cols-1")}>
          {tabs.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-[58px] flex-col items-center justify-center gap-1 px-1",
                    active ? "text-[var(--brand-ink)]" : "text-[var(--text-subtle)]",
                  )}
                >
                  {active ? (
                    <span aria-hidden className="absolute top-0 h-[2px] w-8 rounded-b-full bg-[var(--brand-magenta)]" />
                  ) : null}
                  <NavIcon name={item.icon} size={21} />
                  <span className={cn("hi text-[11px] leading-none", active ? "font-semibold" : "font-medium")}>
                    {item.labelHi ?? item.label}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMore(true)}
              aria-haspopup="dialog"
              className="flex min-h-[58px] w-full flex-col items-center justify-center gap-1 px-1 text-[var(--text-subtle)]"
            >
              <Menu size={21} strokeWidth={1.8} aria-hidden />
              <span className={cn("text-[11px] font-medium leading-none", role === "seller" && "hi")}>
                {role === "seller" ? "और" : "All screens"}
              </span>
            </button>
          </li>
        </ul>
      </nav>
      {more ? <MoreSheet onClose={() => setMore(false)} /> : null}
    </>
  );
}
