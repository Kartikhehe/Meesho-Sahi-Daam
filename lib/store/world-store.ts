"use client";

/**
 * The world store.
 *
 * Holds the simulated world and the seller's own overrides. Two persistence
 * rules matter here:
 *
 * 1. The WORLD ITSELF is not persisted to localStorage — it is ~8 MB, well
 *    over the ~5 MB quota, and it is fully reproducible from its seed anyway.
 *    It loads from /data/world.json on boot and is regenerated on demand.
 *
 * 2. What IS persisted is everything the world cannot reproduce: the seller's
 *    price overrides, accepted recommendations, acknowledged alerts, the
 *    current simulated day, and the audit log. These are small, and losing
 *    them would lose the user's actual work.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { advanceDays } from "@/engine/clock";
import type { AuditEntry, World } from "@/engine/types";

export type WorldStatus = "idle" | "loading" | "ready" | "error";

type WorldState = {
  world: World | null;
  status: WorldStatus;
  error: string | null;
  /** Progress while the clock is advancing, so a demo never looks frozen. */
  advancing: { done: number; total: number } | null;

  load: () => Promise<void>;
  advance: (days: number) => Promise<void>;
  reset: () => Promise<void>;
  regenerate: (seed: number, historyDays: number) => Promise<void>;
  setPrice: (listingId: string, price: number) => void;
  acknowledgeAlert: (alertId: string) => void;
  appendAudit: (entry: Omit<AuditEntry, "id" | "timestamp">) => void;
};

type PersistedState = {
  priceOverrides: Record<string, number>;
  acknowledgedAlerts: string[];
  auditLog: AuditEntry[];
};

/** Overrides and audit entries live in their own persisted store. */
export const useSellerStore = create<
  PersistedState & {
    setPrice: (listingId: string, price: number) => void;
    acknowledge: (alertId: string) => void;
    append: (entry: AuditEntry) => void;
    clear: () => void;
  }
>()(
  persist(
    (set) => ({
      priceOverrides: {},
      acknowledgedAlerts: [],
      auditLog: [],
      setPrice: (listingId, price) =>
        set((s) => ({ priceOverrides: { ...s.priceOverrides, [listingId]: price } })),
      acknowledge: (alertId) =>
        set((s) => ({
          acknowledgedAlerts: s.acknowledgedAlerts.includes(alertId)
            ? s.acknowledgedAlerts
            : [...s.acknowledgedAlerts, alertId],
        })),
      append: (entry) => set((s) => ({ auditLog: [entry, ...s.auditLog].slice(0, 500) })),
      clear: () => set({ priceOverrides: {}, acknowledgedAlerts: [], auditLog: [] }),
    }),
    { name: "sahi-daam.seller", storage: createJSONStorage(() => localStorage) },
  ),
);

export const useWorldStore = create<WorldState>()((set, get) => ({
  world: null,
  status: "idle",
  error: null,
  advancing: null,

  load: async () => {
    if (get().status === "loading") return;
    set({ status: "loading", error: null });
    try {
      const { loadWorld } = await import("@/data/load-world");
      const world = await loadWorld();
      set({ world: applyOverrides(world), status: "ready" });
    } catch (e) {
      set({
        status: "error",
        error: e instanceof Error ? e.message : "The world could not be loaded.",
      });
    }
  },

  advance: async (days) => {
    const world = get().world;
    if (!world) return;

    // Advance in chunks and yield to the browser between them, so the progress
    // indicator actually paints instead of the tab locking up.
    const chunk = 7;
    let current = world;
    set({ advancing: { done: 0, total: days } });
    for (let done = 0; done < days; done += chunk) {
      const n = Math.min(chunk, days - done);
      current = advanceDays(current, n).world;
      set({ advancing: { done: done + n, total: days } });
      await new Promise((r) => setTimeout(r, 0));
    }
    set({ world: current, advancing: null });
  },

  reset: async () => {
    set({ world: null, status: "idle", error: null });
    useSellerStore.getState().clear();
    await get().load();
  },

  regenerate: async (seed, historyDays) => {
    set({ status: "loading", error: null, advancing: { done: 0, total: historyDays } });
    try {
      const { generateWorld } = await import("@/data/generator/world");
      const world = generateWorld({
        seed,
        historyDays,
        onProgress: (done, total) => set({ advancing: { done, total } }),
      });
      set({ world, status: "ready", advancing: null });
    } catch (e) {
      set({
        status: "error",
        advancing: null,
        error: e instanceof Error ? e.message : "The world could not be generated.",
      });
    }
  },

  setPrice: (listingId, price) => {
    useSellerStore.getState().setPrice(listingId, price);
    set((s) =>
      s.world
        ? {
            world: {
              ...s.world,
              listings: s.world.listings.map((l) => (l.id === listingId ? { ...l, price } : l)),
            },
          }
        : s,
    );
  },

  acknowledgeAlert: (alertId) => {
    useSellerStore.getState().acknowledge(alertId);
    set((s) =>
      s.world
        ? {
            world: {
              ...s.world,
              alerts: s.world.alerts.map((a) =>
                a.id === alertId ? { ...a, acknowledged: true } : a,
              ),
            },
          }
        : s,
    );
  },

  appendAudit: (entry) => {
    const world = get().world;
    const full: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      day: entry.day ?? world?.day ?? 0,
    };
    useSellerStore.getState().append(full);
    set((s) => (s.world ? { world: { ...s.world, auditLog: [full, ...s.world.auditLog] } } : s));
  },
}));

/** Re-apply the seller's own price changes over the freshly loaded world. */
function applyOverrides(world: World): World {
  const { priceOverrides, acknowledgedAlerts } = useSellerStore.getState();
  if (!Object.keys(priceOverrides).length && !acknowledgedAlerts.length) return world;

  return {
    ...world,
    listings: world.listings.map((l) =>
      priceOverrides[l.id] !== undefined ? { ...l, price: priceOverrides[l.id] as number } : l,
    ),
    alerts: world.alerts.map((a) =>
      acknowledgedAlerts.includes(a.id) ? { ...a, acknowledged: true } : a,
    ),
  };
}
