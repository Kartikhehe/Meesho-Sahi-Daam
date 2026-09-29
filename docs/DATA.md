# The data

Every simulation parameter, its value, and where it came from. This file is the prose version of
`engine/constants.ts`, which is also rendered as a live table at **Admin → Data Provenance**.

---

## Why this world is simulated

I looked for real data first. Here is what exists, and why it is not enough.

**What public datasets have.** Kaggle carries Meesho and Indian-fashion product catalogues: product
name, category, MRP, selling price, rating, review count. They need an account, their licensing is
unclear, and — critically — they contain **no cost of goods, no settlement lines, no RTO outcomes
and no return data**.

**Why that matters.** Those four fields are exactly what this product reasons about. A catalogue
tells you what a kurti *sells* for; it cannot tell you whether the seller made money on it. Nobody
publishes per-order settlement ledgers, and nobody will — that data is commercially sensitive and
exists only inside the marketplace.

**The decision.** Rather than present a scraped catalogue as though it contained data it does not, I
built a deterministic, seeded, parameterised world simulator whose parameters come from published
benchmarks. This is both the honest option and the better one: it produces internally consistent
data across products, orders, returns and settlements, which no scraped dataset can.

**Two guards against this reading as fake.**

1. Every parameter below carries a source and an explicit flag: *published benchmark* or *our
   assumption*. The Data Provenance screen renders them with those flags visible.
2. `data/import/` ships a CSV adapter that maps a real catalogue file onto the same internal types,
   plus a sample file that the test suite exercises. Real data can be dropped in without the engine
   changing — and the adapter is explicit about which fields a catalogue file *cannot* supply.

---

## Returns and refused parcels

| Parameter | Value | Kind | Source |
|---|---|---|---|
| RTO rate, cash on delivery | 26% | **Benchmark** | GoKwik India RTO report (2023), across 180M+ shoppers |
| RTO rate, prepaid | <2% | **Benchmark** | Same. Prepayment is the single biggest RTO lever available to a seller |
| Dampening factor | 0.78 | *Assumption* | Calibrates the blend to 17% at 80% COD |
| Return rate, apparel | 18–22% | **Benchmark** | Unicommerce / Shiprocket returns benchmarks for Indian online fashion |
| Return rate, home & kitchen | 6–9% | **Benchmark** | Same. Fit and colour mismatch dominate the fashion figure |
| Write-down on returned goods | 15% | *Assumption* | Returned garments recover ~85% of cost. Seller-reported range is 10–20% |

**On the dampening factor.** The published national average RTO is around 23%. Our model lands at
**16.98%** emergent across the simulated world — deliberately *below* the benchmark, so the case
this product makes stays conservative rather than flattering. A model tuned to make the problem look
worse than it is would be easy to build and worth nothing.

**On the write-down.** It applies to all failed parcels, RTO and customer return alike, because an
RTO'd parcel makes the same round trip and is handled the same way. See `docs/ENGINE.md` §2.

---

## Logistics

| Parameter | Value | Kind | Source |
|---|---|---|---|
| Freight, ≤500g | ₹65 | **Benchmark** | Meesho/Valmo forward freight, national average across zones |
| Freight, ≤1000g | ₹82 | **Benchmark** | Same |
| Freight, ≤2000g | ₹104 | **Benchmark** | Same |
| Freight, ≤5000g | ₹148 | **Benchmark** | Same |
| Reverse freight multiplier | 1.163× | *Assumption* | Reverse legs cost more: customer-address pickup, repeat attempts. Gives ₹75.60 against ₹65 |
| Forward freight reversed on RTO | yes | **Benchmark** | The marketplace credits freight back when a parcel is never delivered |
| Packaging, default | ₹8 | *Assumption* | Polybag, tape and label per parcel |

**Freight is charged by slab, not by the gram.** This is why packaging weight is a genuine lever
rather than a rounding detail: a parcel at 520g and one at 490g cost the seller ₹82 and ₹65
respectively. Dropping a slab saves ₹17 on *every single order*, which moves the survival price
rather than just this month's bill.

---

## Fees and tax

| Parameter | Value | Kind | Source |
|---|---|---|---|
| Marketplace commission | **0%** | **Benchmark** | Meesho charges zero commission — that is its central pitch to sellers |
| GST on platform fees | 18% | **Benchmark** | Statutory rate on services: freight, reverse freight, ads |
| Ad spend, default | 5% of price | *Assumption* | Mid-range for an actively promoted listing |

**Zero commission surprises sellers**, who expect one — and it is why there is no commission term in
the cost model. Meesho monetises through seller ad spend and a mark-up on logistics instead, which
is precisely why the ad rate matters so much to the floor.

**GST applies to the fees, not the goods.** This is the line sellers miss most often, because it
never appears as its own charge in their mental arithmetic. On the reference case it is ₹14.28 per
parcel.

---

## Demand

| Parameter | Value | Kind | Source |
|---|---|---|---|
| Elasticity, kurti | 3.4 | *Assumption* | Apparel is the most price-sensitive: buyers browse a grid of near-identical items and sort by price |
| Elasticity, saree / co-ord | 3.0 / 3.2 | *Assumption* | Same |
| Elasticity, bedsheet | 2.6 | *Assumption* | |
| Elasticity, phone cover | 2.0 | *Assumption* | Competes on design more than price |
| Visibility gate width | ₹14 | *Assumption* | Sigmoid width for impression collapse above the ceiling. Smaller = sharper cliff |
| Ceiling percentile | 85th | *Assumption* | Order-weighted, so dead listings do not lift it |
| Ceiling over winning price | 1.07× | *Assumption* | Cross-checked against the percentile |
| Rating penalty knee | 3.8 ★ | *Assumption* | Below this, conversion falls sharply |

---

## Pincode tiers

RTO and cash-on-delivery propensity both vary sharply by geography, and they compound.

| Tier | Share of orders | RTO multiplier | COD propensity |
|---|---|---|---|
| 1 | 22% | 0.72× | 55% |
| 2 | 31% | 0.94× | 76% |
| 3 | 33% | 1.14× | 87% |
| 4 | 14% | 1.31× | 92% |

Tier-3 and tier-4 pincodes both order more on cash *and* refuse delivery more often. That
compounding is why a seller's own geographic mix matters so much, and why "where do you ship?" is a
cost question rather than a logistics one.

---

## Settlement and guardrails

| Parameter | Value | Kind | Source |
|---|---|---|---|
| Settlement lag | 15 days | **Benchmark** | Dispatch to bank credit |
| Alert cap | 2 per seller per week | *Assumption* | Beyond two, sellers stop reading |
| Buyer Price Index gate | 100 | *Assumption* | If treated-group buyer prices rise above control, upward nudges auto-pause |
| Ladder loss cap | 5% | *Assumption* | Exploration may not cost more than this. Enforced in code |
| Ladder arms | 0.94× / 1.00× / 1.06× | *Assumption* | Three rungs around the launch price |

**The settlement lag is the reason this product exists.** Money reaches a seller about 15 days after
she ships. A pricing mistake therefore runs for two to three weeks before it appears in her bank —
by which time she has shipped hundreds more parcels at the same price.

---

## The generated world

Seed **230540**. Everything below is reproducible from that number alone.

| Entity | Count |
|---|---|
| Sellers | 6 |
| Design clusters | 60, across 7 categories |
| Seller listings | 355 |
| Competing listings | ~1,921 |
| Days of history | 548 (~18 months) |
| Orders simulated | ~155,000 |

### The six sellers

Each is defined **only by behavioural parameters** — cash-on-delivery share, ad rate, packaging
cost, and a pricing *rule*. The outcomes are what the demand and cost models produce when run on
those parameters. There is no `if (seller === "imran")` anywhere in the engine.

| Seller | City | Rule | COD | What emerges |
|---|---|---|---|---|
| Suresh Agarwal | Tirupur | Cost × 3.3 markup, ignores the grid | 88% | 43 listings above the ceiling, ~205 orders/month between them — dying unseen |
| Imran Sheikh | Surat | Undercut the prevailing price by ₹6 | 84% | 37 listings below floor, **−₹54k/month** |
| Rekha Devi | Kanpur | Priced once, 11 months ago | 79% | 35 listings slipped under a floor that rose without her |
| Anita Rao | Jaipur | Prices inside her band | 61% | **+₹22k/month** — the aspiration state |
| Farida Begum | Bareilly | No listings yet | 85% | The cold-start path |
| Vikram Joshi | Jaipur | Mixed: some banded, some undercut | 74% | The realistic messy case |

The independent archetype classifier in `lib/cohort.ts` reads these behaviours *back* from the
simulated outcomes and re-derives each seller's type without being told. It classifies Imran as
`matcher` and Suresh as `shopkeeper`, agreeing with the generator — which is evidence the simulation
is coherent rather than staged.

---

## The CSV import adapter

`data/import/csv-adapter.ts` maps a real catalogue onto `DesignCluster` and `Listing`:

```
product_name, category, mrp, selling_price, rating, num_ratings
```

It groups rows into clusters by (category, price band), derives order shares through the same
softmax the engine uses, and returns an **import report** naming exactly which fields it had to
model rather than read:

| Field | Why it is modelled |
|---|---|
| **COGS** | Not present in any public catalogue dataset. Must be entered by the seller — it is the one number she actually knows |
| **RTO and return rates** | Not present in any public dataset. Modelled from the benchmarks above |
| **Settlement lines** | Nobody publishes per-order ledgers. Computed by the cost model |
| **Daily demand** | Proxied from review counts, which correlate with sales but are not sales |
| **Parcel weight** | Inferred from category; catalogue files rarely carry shipping weight |

`scripts/verify.ts` runs the adapter against `data/import/sample-catalogue.csv` on every run, so the
path stays exercised rather than decorative.
