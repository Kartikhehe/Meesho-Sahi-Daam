"use client";

/**
 * The shared entry point for every seller screen: loads the world once, hands
 * back the active seller and her analysed catalogue, and reports the three
 * states (loading, error, ready) so each screen can render them consistently.
 */

import { useEffect, useMemo } from "react";
import { useWorldStore } from "@/lib/store/world-store";
import { useUiStore } from "@/lib/store/ui-store";
import { analyseListing, analyseSeller, summariseSeller, type ListingAnalysis } from "@/lib/selectors";
import type { Seller, World } from "@/engine/types";

export function useWorld(): {
  world: World | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
} {
  const { world, status, error, load } = useWorldStore();

  useEffect(() => {
    if (status === "idle") void load();
  }, [status, load]);

  return { world, status, error };
}

export function useSeller(): {
  world: World | null;
  seller: Seller | null;
  analyses: ListingAnalysis[];
  summary: ReturnType<typeof summariseSeller>;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
} {
  const { world, status, error } = useWorld();
  const activeSellerId = useUiStore((s) => s.activeSellerId);

  const seller = useMemo(
    () => world?.sellers.find((s) => s.id === activeSellerId) ?? world?.sellers[0] ?? null,
    [world, activeSellerId],
  );

  const analyses = useMemo(
    () => (world && seller ? analyseSeller(world, seller.id) : []),
    [world, seller],
  );

  const summary = useMemo(() => summariseSeller(analyses), [analyses]);

  return { world, seller, analyses, summary, status, error };
}

export function useListing(listingId: string): {
  world: World | null;
  analysis: ListingAnalysis | null;
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
} {
  const { world, status, error } = useWorld();

  const analysis = useMemo(() => {
    if (!world) return null;
    const listing = world.listings.find((l) => l.id === listingId);
    if (!listing) return null;
    return analyseListing(world, listing);
  }, [world, listingId]);

  return { world, analysis, status, error };
}
