"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomTabs } from "./bottom-tabs";
import { useApplyTheme } from "./theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  useApplyTheme();

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main id="main" className="min-w-0 flex-1 pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <BottomTabs />
    </div>
  );
}
