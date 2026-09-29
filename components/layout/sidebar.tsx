"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { NAV_BY_ROLE, NAV_GROUPS, type NavItem } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/access";
import { useUiStore } from "@/lib/store/ui-store";
import { useStartStory } from "@/components/story/story-rail";
import { NavIcon } from "./nav-icon";
import { cn } from "@/lib/cn";

function Row({ item, active, bilingual }: { item: NavItem; active: boolean; bilingual: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-10 items-center gap-3 rounded-[var(--radius-input)] px-2.5 py-1.5 transition-colors",
        active
          ? "bg-[var(--brand-magenta-50)] text-[var(--text)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]",
      )}
    >
      <span
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-[var(--brand-ink)]" : "text-[var(--text-subtle)] group-hover:text-[var(--text-muted)]",
        )}
      >
        <NavIcon name={item.icon} size={18} />
      </span>
      {bilingual && item.labelHi ? (
        <span className="min-w-0 leading-tight">
          <span className={cn("hi block truncate text-[14px]", active ? "font-semibold" : "font-medium")}>
            {item.labelHi}
          </span>
          <span className="block truncate text-[11.5px] text-[var(--text-subtle)]">{item.label}</span>
        </span>
      ) : (
        <span className={cn("truncate text-[14px]", active ? "font-semibold" : "font-medium")}>
          {item.label}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const role = useUiStore((s) => s.role);
  const pathname = usePathname();
  const startStory = useStartStory();
  const items = NAV_BY_ROLE[role];
  const groups = NAV_GROUPS[role];
  const bilingual = role === "seller";

  return (
    <nav
      aria-label="Main"
      className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[236px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex"
    >
      <div className="px-5 pb-1 pt-5">
        <p className="type-overline text-[var(--text-subtle)]">{ROLE_LABEL[role].en}</p>
      </div>

      <div className="scroll-quiet flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((g) => {
          const groupItems = items.filter((i) => i.group === g.key);
          if (!groupItems.length) return null;
          return (
            <div key={g.key} className="mt-4 first:mt-2">
              <p className="px-2.5 pb-1.5 text-[11.5px] font-medium text-[var(--text-subtle)]">
                {bilingual && g.labelHi ? (
                  <>
                    <span className="hi">{g.labelHi}</span>
                    <span className="mx-1 opacity-50">·</span>
                    {g.label}
                  </>
                ) : (
                  g.label
                )}
              </p>
              <ul className="space-y-0.5">
                {groupItems.map((item) => (
                  <li key={item.href}>
                    <Row
                      item={item}
                      active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      bilingual={bilingual}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-[var(--border)] p-3">
        <button
          type="button"
          onClick={startStory}
          className="flex w-full items-center gap-3 rounded-[var(--radius-input)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--surface-sunken)]"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-jamuni-50)] text-[var(--brand-jamuni)] dark:text-[var(--brand-ink)]">
            <PlayCircle size={17} aria-hidden />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[13px] font-semibold text-[var(--text)]">Story mode</span>
            <span className="block text-[11.5px] text-[var(--text-subtle)]">A guided walkthrough, 9 steps</span>
          </span>
        </button>
      </div>
    </nav>
  );
}
