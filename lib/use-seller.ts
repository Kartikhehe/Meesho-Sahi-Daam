"use client";

/**
 * The shared entry point for every screen: loads the world once and hands back
 * the world AS THE APP SEES IT — with the admin's price lever applied — plus
 * the analysis options every selector should use (band margin, credibility,
 * confidence, the seller's cost overrides, and whether the Buyer Price Index
 * guardrail is holding back upward advice).
 */

import { useEffect, useMemo } from "react";
import { useSellerStore, useWorldStore } from "@/lib/store/world-store";
import { useUiStore } from "@/lib/store/ui-store";
import { useConfigStore } from "@/lib/store/config-store";
import { applyPriceBump, upwardPaused } from "@/lib/guardrails";
import { analyseListing, analyseSeller, summariseSeller, type AnalysisOptions, type ListingAnalysis } from "@/lib/selectors";
import type { Seller, World } from "@/engine/types";

type Status = "idle" | "loading" | "ready" | "error";

export function useWorld(): { world: World | null; status: Status; error: string | null } {
  const { world: raw, status, error, load } = useWorldStore();
  const priceBump = useConfigStore((s) => s.priceBump);

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  const world = useMemo(() => (raw ? applyPriceBump(raw, priceBump) : null), [raw, priceBump]);
  return { world, status, error };
}

/** The options every analysis on screen should use. */
export function useAnalysisOptions(world: World | null): AnalysisOptions {
  const margin = useConfigStore((s) => s.margin);
  const credibilityK = useConfigStore((s) => s.credibilityK);
  const bandConfidence = useConfigStore((s) => s.bandConfidence);
  const killSwitch = useConfigStore((s) => s.killSwitch);
  const costOverrides = useSellerStore((s) => s.costOverrides);
  const regime = useConfigStore((s) => s.regime);
  return useMemo(
    () => ({
      margin,
      credibilityK,
      bandConfidence,
      costOverrides,
      regime,
      upwardPaused: killSwitch || (world ? upwardPaused(world) : false),
    }),
    [margin, credibilityK, bandConfidence, costOverrides, regime, killSwitch, world],
  );
}

export function useSeller(): {
  world: World | null;
  seller: Seller | null;
  analyses: ListingAnalysis[];
  summary: ReturnType<typeof summariseSeller>;
  opts: AnalysisOptions;
  status: Status;
  error: string | null;
} {
  const { world, status, error } = useWorld();
  const activeSellerId = useUiStore((s) => s.activeSellerId);
  const opts = useAnalysisOptions(world);

  const seller = useMemo(
    () => world?.sellers.find((s) => s.id === activeSellerId) ?? world?.sellers[0] ?? null,
    [world, activeSellerId],
  );
  const analyses = useMemo(() => (world && seller ? analyseSeller(world, seller.id, opts) : []), [world, seller, opts]);
  const summary = useMemo(() => summariseSeller(analyses), [analyses]);

  return { world, seller, analyses, summary, opts, status, error };
}

export function useListing(listingId: string): {
  world: World | null;
  analysis: ListingAnalysis | null;
  opts: AnalysisOptions;
  status: Status;
  error: string | null;
} {
  const { world, status, error } = useWorld();
  const opts = useAnalysisOptions(world);
  const analysis = useMemo(() => {
    if (!world) return null;
    const listing = world.listings.find((l) => l.id === listingId);
    return listing ? analyseListing(world, listing, opts) : null;
  }, [world, listingId, opts]);
  return { world, analysis, opts, status, error };
}
