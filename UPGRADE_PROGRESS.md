# UPGRADE_PROGRESS.md — Round-2

**Resume point.** Read this, then `UPGRADE_PLAN.md`.

- **Live:** https://sahi-daam-livid.vercel.app
- **Repo:** https://github.com/Kartikhehe/sahi-daam
- Redeploy: `vercel deploy --prod --yes --name sahi-daam`. Never run `npm run build` while `npm run dev` is running — both write `.next`.

| | |
|---|---|
| **Phase in progress** | All Round-2 phases complete |
| **Next file to touch** | — |
| **Known breakage** | None. Build and lint clean; `npm run verify` → 89/89; all routes and all nine story steps checked in a production build |

## Phases

- [x] **1 · Golden numbers** — every figure in deck §1 is an engine test and passes.
- [x] **2 · Band rule** — `[floor·(1+m), ceiling]`, four launch verdicts, profit-max suggestion everywhere
- [x] **3 · Day-zero data** — fallback ladder, credibility blending, floor range + narrowing chart, buyer-side RTO, basis chips
- [x] **4 · Six hard cases** — cost ladder + mock bill reader, no-twins prior, "My cost is different" (audited), Meesho-only note, Hindi voice, plausibility nudge
- [x] **5 · Regimes** — classifier with hysteresis, chips, REGIME SHIFT trigger, trend/seasonal lifecycles, 2×2 map and distribution on Cluster Health, thresholds editable in Model Settings
- [x] **6 · Trust ladder + Auto-Pilot** — `/autopilot`: Guided → Assisted (10 accepts, our assumption) → Auto-Pilot (40), bounded by floor × (1 + m) and the ceiling, paused by kill switch / BPI, one-tap undo with "why did this change?"
- [x] **7 · Manager and Admin** — `/model` (m, K, confidence, regime thresholds; blast radius; audited), kill-criteria panel on M4, structural-cost designs routed to M5, real BPI lever on A3
- [x] **8 · Personas + Story Mode** — the deck's reference kurti in the world; Story Mode is now exactly the deck's nine steps, each deep-linked to real state
- [x] **9 · Polish** — README Round-2 section, clean build, production smoke test of every route

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

## Phase 2 notes

- `classifyBand` takes a margin (default `BAND_MARGIN` 3%) and returns `bandLow` and a `launch` verdict
  (DONT_LIST / DIFFERENTIATE / PROFIT_MAX / PRICE_FOR_MARGIN) by width as a share of the ceiling.
- Every "we suggest" is now the argmax of expected monthly contribution inside the band
  (`bestPriceInBand` for listings, `profitMaxPrice` for a demand prior). Clusters may carry a measured
  `demandPrior`; when present, demand uses it everywhere.
- **Done early, from Phase 4** (they live in the same wizard code): the New Listing wizard was split
  into `lib/new-listing-market.ts` + step components. It now has the no-twins category prior with a
  ±10% range and NEW / THIN tag (new `dupatta` category has no clusters by design), the day-zero floor
  range with "N% likely no viable price", the "I'm not sure" cost ladder, a labelled mock bill reader,
  the plausibility nudge, the Hindi voice preview and the Meesho-only note.
- DON'T LIST now names the lever that moves the floor *most* at a realistic move (`components/listing/levers.ts`),
  and says whether it alone is enough.

## Phases 3–4 notes

- `engine/priors.ts`: returns fall back own → design cluster → category → platform (first level with ≥100
  parcels); RTO is buyer-side (pincode tier × payment mode) at her COD mix. Both blended with her own by
  K = 30, and each carries a trace showing n, prior level and the blend.
- The **UI** analysis (`lib/selectors.ts → costInputsBlended`) uses blended rates; the **clock** keeps the
  faster constant-rate inputs for its daily simulation. They agree closely (both centre on the same
  rates) but are not identical — documented rather than hidden.
- Every trace row now carries a basis chip: SELLER / SELLER · custom / MEESHO · exact / MEESHO · prior: …, n=… / Statutory.
- `lib/store/config-store.ts` holds margin, K, band confidence, regime thresholds, kill switch and the
  admin's price lever; `lib/use-seller.ts` turns them into the options every analysis uses.
- The BPI guardrail is real now: `lib/guardrails.ts` computes it from listed prices, and a breach holds
  back every upward suggestion in `analyseListing`.
- `engine/regime.ts` (written early, needed by the config store): credible rival = 4.0★+ with ≥ 2.5% of
  orders; crowded at ≥ 10; dispersed at price CV ≥ 3%. Regime chips are on catalogue rows and SKU detail.

## Phase 5 / 8 notes

- `engine/environment.ts`: a dated, slab-specific freight re-card (501–1000 g, ×1.12, three weeks before
  "today") and a July–September monsoon return multiplier (×1.25). The clock and the floor both use them,
  and COST_DRIFT now receives the band as it stood 30 days earlier — before this it could never fire.
- The clock now steps running price ladders daily (Thompson sampling, 100 shows a day), and enforces the
  5% loss cap only after every rung has had a week of shows — judged earlier, the cap halted on day one.
- Listings no longer sell before their listing day; trend SKUs exit after ~10 weeks; seasonal SKUs listed
  in the festive run-up have their exit pre-scheduled at season end.
- `data/generator/reference.ts`: the reference cluster's rivals are held still (`stable`) so its ceiling
  stays ₹352 and the deck's numbers stay reproducible; its listings carry measured rates.

## Phases 6–9 notes

- Rekha's cost-drift alerts are real (33 fired from the slab re-card) but her larger below-floor alerts
  take the two weekly slots, so they are held back. `/alerts?trigger=COST_DRIFT` shows one trigger in full,
  held-back ones labelled as such — Story step 7 uses it rather than bending the cap.
- Kill criteria: the "alerts muted by sellers" rate needed something to measure, so alerts now have a Mute
  control. Acceptance = accepted recommendations ÷ alerts sent to treated sellers.
- Survival: Kaplan–Meier over listing lifetimes (until S5 exit), treated vs control, Greenwood 95% bands.
- The New Listing wizard is keyed on its query string, so consecutive Story deep links start fresh.
