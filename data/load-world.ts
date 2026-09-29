/**
 * Loading the pre-generated world.
 *
 * The JSON is imported dynamically so it never lands in the initial JS bundle —
 * it is several megabytes, and the app shell should paint long before it
 * arrives. Settlement lines are rebuilt on arrival by `hydrateWorld`, which
 * reproduces exactly what the clock generated (see data/generator/serialise.ts).
 *
 * No network: this is a bundled asset, so it works with the laptop offline.
 */

import { hydrateWorld } from "./generator/serialise";
import type { World } from "@/engine/types";

let cached: World | null = null;

export async function loadWorld(): Promise<World> {
  if (cached) return cached;

  const mod = await import("./world.json");
  const raw = (mod.default ?? mod) as unknown as World;
  cached = hydrateWorld(raw);
  return cached;
}

/** Drop the cache, so a regenerate or reset starts clean. */
export function clearWorldCache(): void {
  cached = null;
}
