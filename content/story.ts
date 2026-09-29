/**
 * Story Mode — the nine-step walkthrough.
 *
 * A toggle, not a role. Each step deep-links to a REAL screen with real state
 * and narrates what to look at; nothing here is a screenshot or a mock. The
 * narration's job is to tell you where to point your eyes, not to substitute
 * for the screen.
 *
 * `setup` runs before the step is shown, so a step can put the app into the
 * state it needs (switch seller, set a filter) rather than hoping it is there.
 */

export type StoryStep = {
  id: string;
  /** The chapter title, shown in the rail. */
  title: string;
  titleHi?: string;
  /** Two or three sentences. Read aloud in a demo, so it has to scan. */
  narration: string;
  /** Where this step lives. */
  href: string;
  /** What to look at once it loads. */
  lookFor: string;
  /** Which seller this step is about, if any. */
  sellerId?: string;
  /** Which role the step needs. */
  role?: "seller" | "manager" | "admin";
};

export const STORY: StoryStep[] = [
  {
    id: "gap",
    title: "The ₹95 she never sees",
    titleHi: "वह ₹95 जो दिखते ही नहीं",
    narration:
      "A seller lists a kurti at ₹305. Her arithmetic says she earns ₹52: price, minus goods, minus shipping, minus packing. What actually reaches her is minus ₹43 — a ₹95 gap on a ₹305 product, and she does not find out for fifteen to twenty-five days, when the settlement file arrives.",
    href: "/dev/charts",
    lookFor:
      "The waterfall. Every bar after the first is something she did not know about, or knew about but not the size of.",
    role: "seller",
  },
  {
    id: "archetypes",
    title: "Three ways to get this wrong",
    titleHi: "गलती के तीन तरीके",
    narration:
      "Suresh ported his shop prices online and sits above the ceiling — his listings are perfectly sensible and almost nobody sees them. Imran undercuts every rival and sells plenty, at a loss on most parcels. Rekha priced once, eleven months ago, and her costs moved underneath her.",
    href: "/sellers",
    lookFor:
      "The 'how they price' column. That classification is derived from what each seller actually does, not assigned to her.",
    role: "manager",
  },
  {
    id: "floor",
    title: "The floor nobody computes",
    titleHi: "सुरक्षा दाम",
    narration:
      "Every marketplace tells a seller the price that will win. None tells her the price that lets her survive. The survival price counts the parcels that never pay, both freight legs, the tax on those fees, and the ads — and it puts the ad rate in the denominator, because ad cost grows as the price grows.",
    href: "/sku/sku-imran-071",
    lookFor:
      "Tap the survival price. The drawer shows every line and where each number came from — her own orders, the market, or a published benchmark.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "ceiling",
    title: "And the ceiling above it",
    titleHi: "और उसके ऊपर की सीमा",
    narration:
      "The ceiling is a property of the design she is selling into, not of her business. Buyers sort by price; above a certain point she is on a page nobody scrolls to. Floor and ceiling together make a band — and a price outside it fails for one of two completely different reasons.",
    href: "/sku/sku-imran-071#market",
    lookFor:
      "The scatter: every rival's price against its share of orders, with the ceiling drawn across it. Public prices only — no seller can see another's costs.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "dont-list",
    title: "Sometimes the answer is don't",
    titleHi: "कभी-कभी जवाब है — मत डालिए",
    narration:
      "For some products the floor sits above the ceiling. No price both covers her costs and gets her found. Every pricing tool in the market will still recommend a number. The honest answer is to name the gap and say don't list this yet — and then say exactly what would have to change.",
    href: "/new-listing",
    lookFor:
      "Pick a kurti, enter ₹175 for the goods and 900g. The Daam Meter inverts into a hatched gap, and the verdict names the lever instead of inventing a price.",
    sellerId: "slr-farida",
    role: "seller",
  },
  {
    id: "unlock",
    title: "What would have to change",
    titleHi: "क्या बदलना होगा",
    narration:
      "Cost, returns, cash-on-delivery share, ad rate. Four levers she actually controls. Drag any of them and the floor moves live, with a ghost marker holding where she started — and each lever carries concrete tactics, because 'reduce your returns' is advice nobody can act on.",
    href: "/unlock",
    lookFor:
      "Drag the cash-on-delivery slider down. Watch the survival price fall, and watch the band open when it crosses the ceiling.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "ladder",
    title: "Then find the price by testing",
    titleHi: "फिर जाँच कर के दाम ढूँढें",
    narration:
      "A new listing has no demand curve of its own, so we borrow one from look-alikes and then test three rungs for real. The bandit ranks rungs by rupees earned, not by how many sell — the cheapest rung almost always sells most, which is exactly the trap. Learning is capped at five percent, enforced in code.",
    href: "/sku/sku-imran-071#experiment",
    lookFor:
      "The three rungs and their posteriors. The width of each bar is how unsure we still are about that price.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "clock",
    title: "Prices go stale",
    titleHi: "दाम पुराने हो जाते हैं",
    narration:
      "Freight slabs move. Return rates drift with the season. Rivals reprice. Six triggers watch for it, ranked by what each one costs her, and at most two reach her in a week — beyond that people stop reading, and the channel stops being worth anything.",
    href: "/alerts",
    lookFor:
      "The cap, stated plainly, and the alerts it holds back. Nothing is discarded; it just waits its turn.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "cohort",
    title: "What it looks like at scale",
    titleHi: "बड़े पैमाने पर",
    narration:
      "Across the cohort, 62 percent of listings are priced below what they cost to ship. But forty percent of designs have no viable band for the median seller at all — and that is not a seller-education problem. It is the marketplace's own cost structure, which only the marketplace can move.",
    href: "/clusters",
    lookFor:
      "The count of designs where the median seller cannot make money at any price. That number is the supply-side finding.",
    role: "manager",
  },
];

export const STORY_LENGTH = STORY.length;
