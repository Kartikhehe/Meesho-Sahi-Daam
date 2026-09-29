"use client";

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { BottomTabs } from "./bottom-tabs";
import { useApplyTheme } from "./theme-toggle";
import { StoryRail } from "@/components/story/story-rail";
import { useUiStore } from "@/lib/store/ui-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  useApplyTheme();
  const storyActive = useUiStore((s) => s.storyStep !== null);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <main
          id="main"
          className="min-w-0 flex-1 pb-20 md:pb-0"
          // The rail docks to the bottom, so the page needs room to scroll past it.
          style={storyActive ? { paddingBottom: "15rem" } : undefined}
        >
          {children}
        </main>
      </div>
      {storyActive ? null : <BottomTabs />}
      <StoryRail />
    </div>
  );
}
