"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Role } from "@/lib/access";

export type Theme = "light" | "dark" | "system";

type UiState = {
  role: Role;
  theme: Theme;
  /** Which seller the app is currently "signed in" as, in seller role. */
  activeSellerId: string;
  /** Story Mode is a toggle, not a role. */
  storyStep: number | null;
  sidebarOpen: boolean;

  setRole: (role: Role) => void;
  setTheme: (theme: Theme) => void;
  setActiveSeller: (id: string) => void;
  setStoryStep: (step: number | null) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      role: "seller",
      theme: "system",
      activeSellerId: "slr-imran",
      storyStep: null,
      sidebarOpen: true,

      setRole: (role) => set({ role }),
      setTheme: (theme) => set({ theme }),
      setActiveSeller: (activeSellerId) => set({ activeSellerId }),
      setStoryStep: (storyStep) => set({ storyStep }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: "sahi-daam.ui",
      storage: createJSONStorage(() => localStorage),
      // Story step is per-session, not persisted.
      partialize: (s) => ({
        role: s.role,
        theme: s.theme,
        activeSellerId: s.activeSellerId,
        sidebarOpen: s.sidebarOpen,
      }),
    },
  ),
);
