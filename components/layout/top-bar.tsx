"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { RoleSwitcher } from "./role-switcher";
import { SellerSwitcher } from "./seller-switcher";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./logo";
import { useUiStore } from "@/lib/store/ui-store";
import { useWorldStore } from "@/lib/store/world-store";
import { formatDate } from "@/lib/format";

/**
 * The jamuni bar is the brand's anchor: the one place the deep purple appears
 * at full strength. Everything on it is white at graded opacities so the
 * controls read as part of the bar, not as boxes stuck onto it.
 *
 * On a 360px phone it holds only the mark, the seller and the role; the theme
 * control moves into the "More" sheet.
 */
export function TopBar() {
  const role = useUiStore((s) => s.role);
  const day = useWorldStore((s) => s.world?.day);

  return (
    <header className="sticky top-0 z-40 bg-[var(--brand-jamuni)] shadow-[0_1px_0_rgba(0,0,0,0.25)]">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <Link href="/" className="rounded-md" aria-label="Sahi Daam — home">
          <span className="hidden sm:inline">
            <Wordmark />
          </span>
          <span className="sm:hidden">
            <Wordmark compact />
          </span>
        </Link>

        {day !== undefined ? (
          <span
            className="ml-3 hidden items-center gap-1.5 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11.5px] font-medium text-white/70 xl:inline-flex"
            title="The simulation clock. Advance it from Admin → Simulation."
          >
            <CalendarClock size={13} aria-hidden className="opacity-70" />
            Simulated · {formatDate(day)}
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          {role === "seller" ? <SellerSwitcher /> : null}
          <RoleSwitcher />
        </div>
      </div>
    </header>
  );
}
