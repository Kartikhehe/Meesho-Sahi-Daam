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
    id: "imran",
    title: "₹299, and ₹46 lost on every order",
    titleHi: "₹299 पर हर ऑर्डर में ₹46 का नुकसान",
    narration:
      "Imran prices his cotton kurti at ₹299 to undercut everyone. It works — about a thousand orders a month. But his survival price is ₹375, so every parcel loses ₹46, and the month loses about ₹47,500. He will not see it for fifteen days.",
    href: "/sku/sku-imran-ref",
    lookFor: "Tap the ₹375 survival price. Every line of the maths opens, and each input says whether it is his, exact from Meesho, or a measured rate.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "suresh",
    title: "₹449: above the gate, no orders",
    titleHi: "₹449: सीमा से ऊपर, एक भी ऑर्डर नहीं",
    narration:
      "Suresh lists the same kurti at ₹449 — his shop markup. By his own arithmetic it earns well. But buyers stop looking above ₹352, so the listing gets no orders at all. A price can be safe and still dead.",
    href: "/sku/sku-suresh-ref",
    lookFor: "The Daam Meter: his price sits far right, in the grey zone where buyers stop finding him. Orders in the last 30 days: zero.",
    sellerId: "slr-suresh",
    role: "seller",
  },
  {
    id: "farida",
    title: "Day zero: a floor as a range",
    titleHi: "पहला दिन: सुरक्षा दाम एक सीमा में",
    narration:
      "Farida in Bareilly has never sold online. Nothing like her zari dupattas is listed, so the market is borrowed from related designs at the same weight, and her floor is shown as a range — not a fake point — that narrows as her own orders arrive.",
    href: "/new-listing?category=dupatta&cogs=140&grams=300&step=2",
    lookFor: "The floor range and its confidence line, the NEW / THIN tag, and 'Why a range' — every input with its source and n.",
    sellerId: "slr-farida",
    role: "seller",
  },
  {
    id: "dont-list",
    title: "The ₹399 kurti: don't list it yet",
    titleHi: "₹399 की कुर्ती: अभी मत डालिए",
    narration:
      "Back to the kurti at its real costs: ₹180 goods, 20% returns, 80% cash on delivery. Its floor is ₹375; buyers stop at ₹352. No price both pays and gets seen. Every other tool would suggest a number. This one says don't list yet — and names the lever.",
    href: "/new-listing?category=kurti&cogs=180&grams=450&planned=399&cluster=cl-ref&step=2",
    lookFor: "The gap as an equation, the lever that moves the floor most, the voice note — and the line saying we will not stop her.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "unlock",
    title: "₹375 → ₹313: a band opens",
    titleHi: "₹375 → ₹313: जगह खुल गई",
    narration:
      "Three changes she controls: goods from ₹180 to ₹158, returns from 20% to 13% with a real size chart, cash on delivery from 80% to 55% with a prepaid discount. The floor falls to ₹313 — under the ₹352 ceiling. A band exists that did not before.",
    href: "/unlock?sku=sku-imran-ref&preset=deck",
    lookFor: "The 'band opened' banner and the Daam Meter's green zone. Drag any lever back to see which one mattered most.",
    sellerId: "slr-imran",
    role: "seller",
  },
  {
    id: "ladder",
    title: "90 days later: the ladder settles at ₹334",
    titleHi: "90 दिन बाद: दाम ₹334 पर टिका",
    narration:
      "Anita re-sourced the same kurti with those three changes and launched a price ladder at ₹314, ₹334 and ₹354. Ninety simulated days later the ladder has settled on ₹334 — not the cheapest rung, which sells most, but the one that earns most.",
    href: "/sku/sku-anita-ref#experiment",
    lookFor: "Shows per rung, the posterior belief for each, and the cost of learning against the 5% cap.",
    sellerId: "slr-anita",
    role: "seller",
  },
  {
    id: "rekha",
    title: "Rekha's freight slab moves",
    titleHi: "रेखा का भाड़ा बदला",
    narration:
      "Three weeks ago Valmo re-carded the 501–1000 g slab. Rekha priced her bedsheets eleven months ago and has not looked since. Her floor moved ₹16 a parcel; her prices did not. The alert reaches her where she already is — WhatsApp — and can be listened to.",
    href: "/alerts?trigger=COST_DRIFT",
    lookFor: "Open 'See the WhatsApp message and voice note' on any alert, then press सुनें.",
    sellerId: "slr-rekha",
    role: "seller",
  },
  {
    id: "survival",
    title: "Does it work? Survival, treated against control",
    titleHi: "क्या यह काम करता है?",
    narration:
      "For the category manager: listing survival for sellers who see the tool against those who do not, with honest confidence bands. With six sellers they overlap — and the screen says so, alongside the kill criteria that would stop the pilot.",
    href: "/cohort",
    lookFor: "The survival curves and their bands, then 'Open the experiment readout and kill criteria'.",
    role: "manager",
  },
  {
    id: "bpi",
    title: "Push prices up — the guardrail pauses advice",
    titleHi: "दाम बढ़ाइए — सुरक्षा कदम रुक जाता है",
    narration:
      "A pricing tool must not quietly make shopping dearer. Press 'Push prices up 6%' and treated sellers' listed prices rise; the Buyer Price Index crosses 100, and every upward suggestion in the app pauses until it falls.",
    href: "/guardrails",
    lookFor: "Press the button, watch the index breach, then open any seller's listing: upward suggestions are held. Press 'Restore prices' when done.",
    role: "admin",
  },
];

export const STORY_LENGTH = STORY.length;
