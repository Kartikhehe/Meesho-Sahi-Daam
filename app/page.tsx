"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_ROUTE } from "@/lib/access";
import { useUiStore } from "@/lib/store/ui-store";

/**
 * No landing page, no splash. The entry point sends you straight to the home
 * screen of whichever role you were last viewing as.
 */
export default function RootPage() {
  const router = useRouter();
  const role = useUiStore((s) => s.role);

  useEffect(() => {
    router.replace(DEFAULT_ROUTE[role]);
  }, [role, router]);

  return (
    <div className="grid min-h-[60dvh] place-items-center px-4">
      <p className="text-sm text-[var(--text-muted)]">Opening your workspace…</p>
    </div>
  );
}
