"use client";

import Link from "next/link";
import { RoleSwitcher } from "./role-switcher";
import { SellerSwitcher } from "./seller-switcher";
import { ThemeToggle } from "./theme-toggle";
import { useUiStore } from "@/lib/store/ui-store";

export function TopBar() {
  const role = useUiStore((s) => s.role);

  return (
    <header className="sticky top-0 z-40 bg-[var(--brand-jamuni)]">
      <div className="flex h-14 items-center gap-3 px-4">
        <Link href="/" className="flex items-baseline gap-2 text-white">
          <span className="hi text-[17px] font-semibold tracking-tight">सही दाम</span>
          <span className="hidden text-[11px] uppercase tracking-[0.14em] text-white/55 sm:inline">
            Sahi Daam
          </span>
        </Link>

        <span className="hidden text-[12px] text-white/50 lg:inline">
          A price that lets you survive, not just win
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          {role === "seller" ? <SellerSwitcher /> : null}
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}
