"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { NAV_BY_ROLE, type NavItem } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/access";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

function NavIcon({ name }: { name: string }) {
  const Cmp = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name];
  return Cmp ? <Cmp size={16} /> : <Icons.Circle size={16} />;
}

function Row({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-h-11 items-center gap-2.5 rounded-[var(--radius-input)] px-2.5 py-2 text-sm",
        active
          ? "bg-[var(--brand-magenta-50)] font-medium text-[var(--text)]"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text)]",
      )}
    >
      <span className={cn("shrink-0", active ? "text-[var(--brand-magenta)]" : "text-[var(--text-subtle)]")}>
        <NavIcon name={item.icon} />
      </span>
      <span className="flex-1 truncate">
        {item.label}
        {item.labelHi ? (
          <span className="hi ml-1.5 text-[12px] text-[var(--text-subtle)]">{item.labelHi}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-[10px] font-semibold tabular text-[var(--text-subtle)] opacity-60">
        {item.code}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const role = useUiStore((s) => s.role);
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role];

  return (
    <nav
      aria-label="Main"
      className="hidden w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] md:flex"
    >
      <div className="px-3 py-3">
        <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
          {ROLE_LABEL[role].en}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <Row item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} />
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3">
        <Link
          href="/story"
          className="flex min-h-11 items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <Icons.PlayCircle size={15} aria-hidden />
          Story Mode
        </Link>
      </div>
    </nav>
  );
}
