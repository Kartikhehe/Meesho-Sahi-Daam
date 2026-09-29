"use client";

/**
 * A4 · Rollout.
 *
 * Feature flags by category, city and cohort percentage, and which sellers in
 * the simulated world that actually puts in treatment. The point of showing
 * the resulting seller list is that a percentage is easy to set and hard to
 * picture — seeing the names makes the blast radius concrete.
 */

import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { StatusChip } from "@/components/shared/status-chip";
import { Skeleton, StateGate } from "@/components/shared/empty-state";
import { useWorld } from "@/lib/use-seller";
import { useAudit } from "@/lib/audit";
import { count, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Page, PageHeader } from "@/components/shared/page-header";

const PILOT_CITIES = ["Surat", "Tirupur", "Kanpur"];

const CATEGORIES = [
  "kurti",
  "saree",
  "co-ord-set",
  "bedsheet",
  "kitchen-storage",
  "phone-cover",
  "jewellery-set",
];

export default function RolloutPage() {
  const { world, status, error } = useWorld();
  const audit = useAudit();

  const [cities, setCities] = useState<string[]>(PILOT_CITIES);
  const [categories, setCategories] = useState<string[]>(["kurti", "saree", "co-ord-set"]);
  const [cohortPct, setCohortPct] = useState(0.5);

  /**
   * Who this actually reaches. Seller selection is deterministic — a stable
   * hash of the seller id against the percentage — so the same settings always
   * produce the same cohort rather than reshuffling on every render.
   */
  const inScope = useMemo(() => {
    if (!world) return [];
    return world.sellers.filter((s) => {
      if (!cities.includes(s.city)) return false;
      const listingCategories = new Set(
        world.listings.filter((l) => l.sellerId === s.id).map((l) => l.category),
      );
      const overlaps =
        listingCategories.size === 0 || categories.some((c) => listingCategories.has(c as never));
      if (!overlaps) return false;

      let h = 0;
      for (let i = 0; i < s.id.length; i++) h = (h * 31 + s.id.charCodeAt(i)) >>> 0;
      return (h % 1000) / 1000 < cohortPct;
    });
  }, [world, cities, categories, cohortPct]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const cityCounts = useMemo(() => {
    if (!world) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const s of world.sellers) m.set(s.city, (m.get(s.city) ?? 0) + 1);
    return m;
  }, [world]);

  return (
    <Page>
      <PageHeader
        title="Rollout"
        description={<>Who sees the tool, and who is in the control group</>}
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-96 w-full" />}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            <Card className="p-4">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">Pilot cities</h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                Surat, Tirupur and Kanpur — chosen because each concentrates one archetype.
              </p>
              <ul className="mt-3 space-y-1.5">
                {[...cityCounts.keys()].sort().map((city) => (
                  <li key={city}>
                    <label
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-input)] border px-3 py-2",
                        cities.includes(city)
                          ? "border-[var(--brand-magenta)] bg-[var(--brand-magenta-50)]"
                          : "border-[var(--border)] hover:bg-[var(--surface-sunken)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={cities.includes(city)}
                        onChange={() => toggle(cities, setCities, city)}
                        className="h-4 w-4 accent-[var(--brand-magenta)]"
                      />
                      <MapPin size={13} aria-hidden className="text-[var(--text-subtle)]" />
                      <span className="flex-1 text-[13px] text-[var(--text)]">{city}</span>
                      <span className="tabular text-[12px] text-[var(--text-subtle)]">
                        {count(cityCounts.get(city) ?? 0)} sellers
                      </span>
                      {PILOT_CITIES.includes(city) ? (
                        <StatusChip tone="info">pilot</StatusChip>
                      ) : null}
                    </label>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">Categories</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggle(categories, setCategories, c)}
                    className={cn(
                      "rounded-[var(--radius-chip)] border px-2.5 py-1.5 text-[12px]",
                      categories.includes(c)
                        ? "border-[var(--brand-magenta)] bg-[var(--brand-magenta-50)] text-[var(--text)]"
                        : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]",
                    )}
                  >
                    {c.replace(/-/g, " ")}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <Slider
                label="Share of eligible sellers in treatment"
                labelHi="कितने विक्रेताओं को दिखे"
                value={cohortPct}
                ghost={0.5}
                min={0}
                max={1}
                step={0.05}
                format={(v) => pct(v, 0)}
                onChange={setCohortPct}
                help={
                  <p className="text-[11px] leading-relaxed text-[var(--text-subtle)]">
                    The rest stay as control, so the experiment readout stays meaningful. Selection
                    is deterministic — the same settings always pick the same sellers.
                  </p>
                }
              />
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-semibold text-[var(--text)]">
                Who this reaches right now
              </h2>
              <span className="tabular text-sm font-semibold text-[var(--text)]">
                {count(inScope.length)}
                <span className="font-normal text-[var(--text-subtle)]">
                  {" "}
                  / {count(world?.sellers.length ?? 0)}
                </span>
              </span>
            </div>

            {inScope.length === 0 ? (
              <p className="mt-3 rounded-[var(--radius-input)] bg-[var(--surface-sunken)] px-3 py-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
                Nobody. With these settings the tool reaches no sellers at all — worth checking
                before you ship it.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {inScope.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-1.5 text-[12px] last:border-0"
                  >
                    <span className="min-w-0 flex-1 truncate text-[var(--text)]">
                      {s.businessName}
                    </span>
                    <span className="shrink-0 text-[var(--text-subtle)]">{s.city}</span>
                    <StatusChip tone={s.treatment === "treated" ? "success" : "neutral"}>
                      {s.treatment}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            )}

            <Button
              variant="secondary"
              className="mt-4"
              onClick={() =>
                audit({
                  capability: "admin.rollout",
                  action: "Changed the rollout scope",
                  subject: `${cities.join(", ")} · ${categories.length} categories · ${pct(cohortPct, 0)}`,
                  after: `${count(inScope.length)} sellers in scope`,
                  blastRadius: `The tool would reach ${count(inScope.length)} of ${count(world?.sellers.length ?? 0)} sellers.`,
                })
              }
            >
              Save this scope
            </Button>
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-subtle)]">
              Saving writes an audit entry with the resulting seller count.
            </p>
          </Card>
        </div>
      </StateGate>
    </Page>
  );
}
