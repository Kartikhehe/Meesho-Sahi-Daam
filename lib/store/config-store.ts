"use client";

/**
 * Platform configuration an admin can change: the band margin, the credibility
 * constant, the confidence of the floor range, the regime thresholds and
 * tempos, and the guardrails. Persisted locally; every change is audited at the
 * call site (lib/audit.ts) with its computed blast radius.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { BAND_CONFIDENCE, BAND_MARGIN, CREDIBILITY_K } from "@/engine/constants";
import { DEFAULT_REGIME_THRESHOLDS, type RegimeThresholds } from "@/engine/regime";

type ConfigState = {
  margin: number;
  credibilityK: number;
  bandConfidence: number;
  regime: RegimeThresholds;
  killSwitch: boolean;
  autoPilotAvailable: boolean;
  /** Admin demo lever: treated sellers' prices nudged up by this share (0 = off). */
  priceBump: number;
  set: (patch: Partial<Omit<ConfigState, "set" | "reset">>) => void;
  reset: () => void;
};

const DEFAULTS = {
  margin: BAND_MARGIN,
  credibilityK: CREDIBILITY_K,
  bandConfidence: BAND_CONFIDENCE,
  regime: DEFAULT_REGIME_THRESHOLDS,
  killSwitch: false,
  autoPilotAvailable: true,
  priceBump: 0,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (patch) => set(patch),
      reset: () => set(DEFAULTS),
    }),
    { name: "sahi-daam.config", storage: createJSONStorage(() => localStorage) },
  ),
);
