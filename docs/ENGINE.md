# The engine

> **Round-2 model (current).** The cost model now follows the Round-2 deck:
> `floor = [C·(1−ρ(1−k)) + C_pack + 1.18·C_fwd·d + C_rev·r] ÷ [k − 1.18·a]` — forward freight on
> delivered units, a ₹153 return leg on customer returns only (Valmo bears the RTO leg), resale
> recovery ρ = 0.83, 18% GST on forward freight and ads, RTO 20% COD / 5% prepaid. The floor is
> shown as a credibility-weighted band while a seller's own data is thin (`engine/uncertainty.ts`).
> `npm run verify` checks every golden number in the deck. Sections 2–4 and 8 below describe the
> round-1 model and are kept for the record of how the floor was first calibrated.

Every formula, with its derivation. Written so the maths can be audited without reading TypeScript.

All of it lives in `/engine`, which imports nothing from React and touches no browser globals —
`npm run verify` executes it in a plain Node process and checks 55 assertions.

---

## 1. Paid fraction

The share of **dispatched** parcels that actually pay.

```
paidFraction = (1 − rtoRate) × (1 − returnRate)
```

Two independent hurdles. An RTO never reaches the customer; a return reaches her and comes back.
Both legs must survive for the money to stay.

| Case | RTO | Returns | paidFraction |
|---|---|---|---|
| 1 | 17% | 20% | **0.6640** |
| 2 | 12% | 13% | **0.7656** |

At 17/20, **one parcel in three never pays** — and the seller still paid for the goods, the freight
out, the freight back and the packaging on every one of them.

---

## 2. Cost to serve — the numerator

Per parcel **dispatched**, not per parcel sold. That distinction is the whole point: costs are
incurred on everything that ships, revenue only on what sticks.

```
costToServe = cogs × paidFraction                       ① goods on units that sold
            + cogs × (1 − paidFraction) × writedown     ② value lost on goods that came back
            + forwardFreight × (1 − rtoRate)            ③ freight out, net of RTO credits
            + reverseFreight × (1 − paidFraction)       ④ freight back on failed parcels
            + (③ + ④) × 0.18                            ⑤ GST on those fees
            + packaging                                 ⑥
```

**① Goods on units that sold.** Only the parcels that paid consume inventory permanently.

**② Write-down on returned goods.** A garment that travels out and back is handled, sometimes worn.
We recover 85% of cost and write down 15%.

The write-down applies to **all** failed parcels — RTO *and* customer return. An RTO'd parcel makes
the same round trip and is handled the same way. (Charging it on customer returns alone understates
the floor by about 2% and breaks the reference waterfall's −₹51.1 line; see §8.)

**③ Forward freight, net of RTO reversals.** Charged on every dispatch, but the marketplace credits
it back when a parcel is refused and never delivered. Customer returns get no such credit — the
parcel *was* delivered.

**④ Reverse freight.** Modelled at 1.163× forward: collecting from a customer address costs more
than shipping from a pickup hub, and often needs a second attempt.

**⑤ GST at 18% on the platform fees** — freight, reverse freight and ads. **Not on the goods.** This
is the line sellers miss most often, because it never appears as a separate charge in their mental
arithmetic. On the reference case it is ₹14.28.

**⑥ Packaging**, on every parcel that ships.

Worked, for case 1 (COGS ₹180, RTO 17%, returns 20%, freight ₹65/₹75.60, packing ₹8):

| Term | ₹ |
|---|---|
| ① 180 × 0.664 | 119.52 |
| ② 180 × 0.336 × 0.15 | 9.07 |
| ③ 65 − (65 × 0.17) | 53.95 |
| ④ 75.60 × 0.336 | 25.40 |
| ⑤ 0.18 × (53.95 + 25.40) | 14.28 |
| ⑥ | 8.00 |
| **Total** | **230.22** |

---

## 3. Survival price — the floor

```
                 costToServe
SurvivalPrice = ─────────────────────────
                paidFraction − adSpendRate
```

### Why the ad rate is in the denominator

Ad spend is a **percentage of price**, not a flat cost. Raise the price and the ad bill rises with
it, so it cannot be added to the numerator as rupees. Solve properly — let `P` be the price, `a` the
ad rate, `f` the paid fraction, `C` the cost to serve:

```
revenue kept  =  P·f − P·a   =  P(f − a)
break even    :  P(f − a) = C
              ⟹  P = C / (f − a)
```

Putting a flat ad figure in the numerator instead understates the floor, and is the most common way
a naive implementation of this gets it wrong.

**Case 1:** 230.22 / (0.664 − 0.05) = 230.22 / 0.614 = **₹374.96**
**Case 2:** 222.92 / (0.7656 − 0.05) = 222.92 / 0.7156 = **₹311.52**

When `adSpendRate ≥ paidFraction` the denominator is zero or negative: ads consume every paying
parcel and **no finite price breaks even.** The engine returns `Infinity` and the band classifier
reports `NO_BAND` rather than printing a nonsense number.

---

## 4. Contribution per dispatched order

```
contribution(P) = (P − SurvivalPrice) × (paidFraction − adSpendRate)
```

Every rupee above the floor is only partly hers, because only some parcels pay and ads take a slice
of each. At ₹334 on case 2: (334 − 311.52) × 0.7156 = **₹16.08**.

---

## 5. The visibility ceiling

A property of the **design cluster**, not of the seller. Buyers sort by price; above a certain point
a listing sits on a page nobody scrolls to.

```
prevailing  = order-weighted 50th percentile of rival prices
winning     = price of the highest-order-share listing
anchor      = max(winning, prevailing × 0.94)
ceiling     = (order-weighted 85th percentile + anchor × 1.07) / 2
```

Weighting by **order share** rather than listing count matters: ten dead listings at ₹500 should not
lift the ceiling.

The `max(...)` guard is a correction found during calibration. Under a price softmax the
highest-share listing is always the *cheapest* in the cluster, which in a cluster with one
rock-bottom outlier sits well below where the market actually trades — dragging the ceiling under
the median rival and making almost every seller look unviable. Blending in the order-weighted median
fixes that while still reproducing the reference fixture (winning ₹329 → ceiling ₹352) exactly.

---

## 6. Band classification

```
width = ceiling − floor

width ≤ 0            → NO_BAND        no price both covers cost and gets seen
price < floor        → BELOW_FLOOR    every parcel loses money
price > ceiling      → ABOVE_GATE     safe for her, invisible to buyers
width/ceiling < 5%   → THIN           real, but one rival's move closes it
otherwise            → HEALTHY
```

`NO_BAND` is the case that matters. Every pricing tool in the market will still recommend a number
here. The honest answer is to name the gap and say *don't list this yet* — then name the specific
lever and how far it must move.

**Recommended price** sits 35% of the way up the band, snapped to a price ending in 9:

```
recommended = snapTo9(floor + (ceiling − floor) × 0.35)
```

Low enough to win visibility while a listing has no reviews; high enough that a small cost drift
does not immediately push it under water. Snapping never pushes the recommendation past the ceiling.

---

## 7. Demand

```
ordersPerDay = clusterDailyDemand(day)      seasonal + festive multipliers
             × priceShare                   softmax over −elasticity × ln(price)
             × visibilityGate                sigmoid collapse above the ceiling
             × ratingFactor
             × stockFactor
             × noise                         lognormal, σ = 0.22, seeded
```

**Price share** — a softmax over `−elasticity × ln(price)`. The log form gives constant elasticity:
a 10% cut moves share by the same proportion at ₹300 or ₹3,000. The cheapest credible listing takes
the large majority, which is exactly why undercutting *feels* like it is working.

**Visibility gate** — the term that makes the Shopkeeper archetype fail:

```
gate(P) = 1 / (1 + exp((P − ceiling) / 14))
```

At the ceiling, half of impressions. Fourteen rupees above it, about 27%. Forty above, under 6%.
Impressions fall off a cliff rather than tapering, so a listing priced sensibly by its owner's
arithmetic simply dies unseen.

**Rating factor** — below 3.8 stars conversion falls sharply; above it the gain is modest.

Noise is keyed by `(seed, listingId, day)`, so adding a listing never perturbs another listing's
history.

---

## 8. The waterfall — belief against reality

At a given price `P`, what she thinks she earns versus what lands:

```
believed = P − cogs − forwardFreight − packaging
lost     = −(P × failed − cogs × failed × 0.85)   revenue lost, net of goods recovered
credit   = +forwardFreight × rtoRate
reverse  = −reverseFreight × failed
gst      = −0.18 × (forwardNet + reverseFreight × failed)
ads      = −P × adSpendRate
```

Reference case, P = ₹305 — every line matches the brief exactly:

| | ₹ | running |
|---|---|---|
| What she thinks she earns | +52.0 | 52.0 |
| Lost to refused and returned parcels | −51.1 | 0.9 |
| Shipping refunded on refused parcels | +11.1 | 12.0 |
| Return shipping | −25.4 | −13.4 |
| GST on the fees | −14.3 | −27.7 |
| Ads | −15.3 | **−43.0** |

Gap: **₹95.0 — 31% of the list price.**

---

## 9. The price ladder

Three rungs at 0.94× / 1.00× / 1.06× the launch price. Each carries a Beta posterior on conversion,
starting at Beta(1,1) — genuinely undecided.

Thompson sampling: draw once from each posterior, then play the arm with the highest **expected
rupee contribution**:

```
score(arm) = conversionDraw(arm) × contribution(priceOf(arm))
```

Ranking by rupees rather than by conversion is the point. The cheapest rung converts best and would
win every time on conversion alone — which is precisely the mistake the Matcher archetype makes by
hand.

**The loss cap is enforced in code, not by policy.** Exploration may not cost more than 5% of what
the listing would have contributed at its base price; past that the experiment halts and settles on
the best arm so far.

---

## 10. Twin retrieval

Cold start: a new listing has no demand curve, so one is borrowed from look-alikes by cosine
similarity over a real attribute vector.

Categoricals are one-hot encoded with per-field weights (category 3.0, fabric 1.6, MRP band 1.4,
weight 1.0, occasion 0.9, colour 0.7, sleeve 0.6); numerics are log-scaled so a ₹200-vs-₹400 gap
counts like ₹2,000-vs-₹4,000. Category dominates — a bedsheet is never a twin for a kurti however
well the other fields line up.

Ties break on listing id, so the same query always returns the same twins in the same order.

The ceiling is then read from the cluster the twins **concentrate** in, weighted by similarity —
not from whichever twin sorted first. Clusters within one category span a wide price range (kurti
ceilings run ₹197 to ₹376 in the generated world), so taking the first match can hand back a
ceiling from a far cheaper corner of the market.

---

## 11. Triggers

Six pure evaluators, each returning `{ fired, severity, rupeeImpact, message, trace }`:

| Trigger | Fires when |
|---|---|
| `BELOW_FLOOR` | Price is under the listing's own survival price |
| `RETURN_SPIKE` | 30-day return rate exceeds the 90-day baseline by >5 points |
| `COST_DRIFT` | The floor moved ≥ ₹4 against 30 days ago |
| `RIVAL_UNDERCUT` | A rival is >₹8 cheaper *and* matching would still clear the floor |
| `STOCK_RISK` | Under 10 days of stock on a listing that earns |
| `STAGE_CHANGE` | Reviews now support a higher price, and the band allows it |

Alerts rank by **rupeeImpact — what it costs per month** — because ranking by severity or recency
puts a ₹40 problem above a ₹4,000 one. At most **two per seller per week**; beyond that people stop
reading and the channel stops being worth anything. Suppressed alerts are kept and marked `muted`
rather than discarded, and sellers can see them.

---

## 12. Lifecycle

```
S0 LIST → S1 DISCOVER (d1–21) → S2 CLIMB (d22–90) → S3 HARVEST (m4–9) → S4 DEFEND (m10+) → S5 EXIT
```

Age drives the progression, with two overrides: a listing with no stock and no orders exits, and a
listing still invisible after its discovery window **does not get to "climb" just because time
passed**.

Each stage targets a different position in the band — discovery sits at 30% (priced to be found
while there are no reviews), harvest at 60% (an established rating buys tolerance for a higher
price).

---

## 13. Determinism

Everything derives from **seed 230540** via mulberry32. Draws are keyed by content
(`hashSeed(seed, listingId, day)`) rather than by call order, so the same seed produces the same
world on any machine, and adding an entity never perturbs an existing one's history.

`scripts/verify.ts` asserts this: the same seed twice gives identical listing prices, identical twin
ordering and an identical order count after advancing the clock.
