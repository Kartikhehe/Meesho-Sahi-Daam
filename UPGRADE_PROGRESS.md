# UPGRADE_PROGRESS.md — Round-2

**Resume point.** Read this, then `UPGRADE_PLAN.md`.

| | |
|---|---|
| **Phase in progress** | Phase 2 — band rule fix + profit-max launch |
| **Next file to touch** | `engine/band.ts` (`classifyBand`, `recommendedPrice`) |
| **Known breakage** | None. Build clean; `npm run verify` → 70/70 |

## Phases

- [x] **1 · Golden numbers** — every figure in deck §1 is an engine test and passes.
- [ ] 2 · Band rule [floor·(1+m), ceiling], four verdicts, profit-max launch
- [ ] 3 · Fallback ladder, credibility blending, ranges, buyer-side RTO, source chips
- [ ] 4 · Six hard cases
- [ ] 5 · Regimes, REGIME SHIFT trigger, product-type lifecycle, chips, 2×2 map
- [ ] 6 · Trust ladder + Auto-Pilot
- [ ] 7 · Manager and Admin additions
- [ ] 8 · Personas + Story Mode
- [ ] 9 · Polish, README, clean build

## Phase 1 notes

- **Cost model replaced** with the deck's (see the table in `UPGRADE_PLAN.md`). New: `engine/launch.ts`
  (monthly contribution, profit-max price), `engine/uncertainty.ts` (floor band, P(floor > price)),
  `engine/reference.ts` (the worked kurti, one definition), `priorOrdersPerDay` in `engine/demand.ts`.
- **The day-zero band is derived, not typed.** Prior SDs (returns 4.2 pts, COD refusals 2.1 pts) are
  propagated through the floor by the delta method and shrunk by √(30/(n+30)); that reproduces
  ±28/20/14/9 and the 85%.
- **World regenerated.** Emergent RTO 17.3% (deck: 17%).
- **Carried to Phase 8:** under the new model Rekha classifies as `matcher` (70% of her listings below
  floor) rather than set-and-forgetter, and Imran's catalogue loses −₹65k/month against the deck's
  −₹47.5k. Phase 8 seeds the deck's exact persona price points; re-check both there.
- `RETURN_WRITEDOWN` is now derived as 1 − ρ = 0.17, so existing callers stay correct.
