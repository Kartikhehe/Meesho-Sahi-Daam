# UPGRADE_PLAN.md — Round-2

Maps every Round-2 claim to what the prototype already has. Only the gaps get built.

## Before anything: the golden numbers are internally consistent

Checked with a literal implementation of the deck's formula (`scripts/_golden.ts`) before any engine
change. Every figure in section 1 reproduces exactly, including two that look arbitrary but are not:

- **The day-zero band is the credibility formula.** ±28 / ±20 / ±14 / ±9 at n = 0 / 30 / 90 / 270 is
  exactly `28 · √(30 / (n + 30))` — the posterior spread shrinking with the same constant (30) the
  blending rule uses. So the band is *derived*, not hardcoded.
- **85% follows from the band.** An 80% half-width of ₹28 means σ₀ = ₹21.85; with the floor at ₹374.98,
  P(floor > ₹352) = Φ(1.05) = 85.4%. σ₀ itself comes from propagating prior uncertainty on the rates
  through the floor formula (delta method): σ_returns ≈ 4.2 pts, σ_RTO,COD ≈ 2.1 pts. Those two SDs go
  in `constants.ts` labelled as modelling assumptions.

**The cost model changes.** The Round-2 deck's model differs from the round-1 brief's, and the deck
now wins (rule 5: fix the engine, not the screen):

| Term | Round 1 (current engine) | Round 2 (deck) |
|---|---|---|
| Forward freight | Every dispatch, credited back on RTO | Delivered units only (equivalent) |
| Reverse freight | ₹75.60 on every failed parcel | ₹153 on **customer returns only**; the RTO leg is borne by Valmo |
| Goods on failed parcels | 15% written down | Recovery ρ = 0.83 (17% lost) |
| GST | 18% on freight both ways | 18% on **forward freight and ads** |
| Ads | `paidFraction − a` | `k − 1.18·a` (GST on ads) |
| RTO | 26% COD / 2% prepaid × 0.78 dampening | 20% COD / 5% prepaid |

Case 1 still lands at ₹375; the waterfall now ends at −₹42.34 rather than −₹42.96.

## Item-by-item

| # | Item | Status | Notes |
|---|---|---|---|
| §1 | Golden numbers as tests | **Missing** | `scripts/verify.ts` holds round-1 references; replace |
| 2.1 | Fallback ladder (own → cluster → category×zone → platform) | **Missing** | rates come from category constants today |
| 2.1 | Credibility blending, n exposed in trace | **Missing** | |
| 2.1 | Floor as 80% band when n < 30; band-narrowing chart | **Missing** | |
| 2.1 | Buyer-side RTO (pincode tier × payment) | **Partial** | tiers exist in the clock's outcome model; the floor still uses seller COD share |
| 2.1 | TraceDrawer source chips | **Partial** | source colour dots exist; no SELLER / MEESHO·exact / MEESHO·prior chip with n |
| 2.2.1 | "I'm not sure" cost ladder, mock bill OCR | **Missing** | |
| 2.2.2 | No-twins fallback, ±10% ladder, NEW/THIN tag | **Missing** | twin retriever always returns matches |
| 2.2.3 | "My cost is different" override, audited | **Missing** | only Admin can change cost inputs (A1) |
| 2.2.4 | Meesho-specific floor copy | **Missing** | |
| 2.2.5 | Hindi voice preview (speechSynthesis) | **Missing** | WhatsApp preview exists on Alerts |
| 2.2.6 | Implausible-cost warning | **Missing** | |
| 2.3 | Regime classifier (4 regimes) | **Missing** | |
| 2.3 | Regime params in Admin, audited, blast radius | **Missing** | A1 pattern exists to copy |
| 2.3 | 7th trigger REGIME SHIFT under the 2/week cap | **Missing** | cap machinery exists |
| 2.3 | Lifecycle by product type (trend / evergreen / seasonal) | **Partial** | S0–S5 machine exists, one length for all |
| 2.3 | Regime chip on rows + SKU; 2×2 regime map on M3 | **Missing** | |
| 2.4 | Band = [floor·(1+m), ceiling], m = 3% | **Partial** | band is [floor, ceiling], no margin |
| 2.4 | ≤0 DON'T LIST · 0–5% DIFFERENTIATE · 5–15% profit-max · >15% PRICE FOR MARGIN + C2M flag | **Partial** | first two exist; launch is floor + 35% of band, not argmax; no margin verdict |
| 2.5 | Trust ladder, Auto-Pilot after 40 accepts, undo, "why did this change?" | **Missing** | Admin can only toggle availability |
| 2.6 | No-viable-band cluster list → intervention queue | **Exists** | M3 + `STRUCTURAL_NO_BAND` reason in M5 |
| 2.6 | Regime distribution; kill-criteria panel (20% / 40% / 100 / 10%) | **Missing** | BPI exists on M4 and A3 |
| 2.6 | Admin: regime thresholds, m, credibility constant, band confidence | **Missing** | |
| 2.7 | Personas with deck price points (₹449, ₹299, zari dupattas…) | **Partial** | names and archetypes exist; price points emerge, not seeded |
| 2.7 | Story Mode rewritten to the deck's 9 steps | **Partial** | 9-step rail exists, different steps |

## Phases

1. Golden numbers: rewrite the cost model, waterfall, settlement lines and demand prior to the deck;
   add `engine/uncertainty.ts`; replace `verify.ts` references; regenerate the world.
2. Band rule + profit-max launch.
3. Fallback ladder, blending, ranges, buyer-side RTO, source chips.
4. Six hard cases.
5. Regimes, REGIME SHIFT, product-type lifecycle, chips and map.
6. Trust ladder + Auto-Pilot.
7. Manager and Admin additions.
8. Personas + Story Mode.
9. Polish, README "real vs simulated", clean build.
