"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { MOBILE_TABS } from "@/lib/nav";
import { useUiStore } from "@/lib/store/ui-store";
import { cn } from "@/lib/cn";

/**
 * Under 768px the seller navigates from the bottom — the real device is a
 * low-end Android held in one hand. 44px minimum targets.
 */
export function BottomTabs() {
  const role = useUiStore((s) => s.role);
  const pathname = usePathname();
  if (role !== "seller") return null;

  return (
    <nav
      // Distinct from the sidebar's landmark: two navigation regions sharing a
      // name gives screen-reader users two identical entries to choose between.
      aria-label="Primary, compact"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-4">
        {MOBILE_TABS.map((item) => {
          const active = pathname === item.href;
          const Cmp =
            (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[item.icon] ??
            Icons.Circle;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5",
                  active ? "text-[var(--brand-magenta)]" : "text-[var(--text-subtle)]",
                )}
              >
                <Cmp size={19} />
                <span className="hi text-[10px] leading-none">{item.labelHi ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
