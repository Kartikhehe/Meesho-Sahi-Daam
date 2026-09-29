/**
 * The glossary.
 *
 * One plain sentence per term, then "here's yours" filled from her own data.
 * The rule: no jargon defined with more jargon. If a definition needs a second
 * term the seller does not know, it is rewritten rather than cross-linked.
 */

export type GlossaryEntry = {
  key: string;
  term: string;
  termHi: string;
  /** One plain sentence. No second unfamiliar word allowed. */
  plain: string;
  plainHi: string;
  /** What it means for her money, concretely. */
  why: string;
  /** Which figure from her own catalogue to show alongside. */
  yours: "rtoRate" | "returnRate" | "reverseFreight" | "gst" | "contribution" | "floor" | "ceiling" | "elasticity";
};

export const GLOSSARY: GlossaryEntry[] = [
  {
    key: "rto",
    term: "Refused parcel (RTO)",
    termHi: "मना किया पार्सल",
    plain: "A parcel that goes out, the customer refuses it at the door, and it comes back to you.",
    plainHi: "पार्सल भेजा गया, ग्राहक ने लेने से मना कर दिया, और वह आपके पास वापस आ गया।",
    why: "You pay to send it and to bring it back, and you sell nothing. Cash-on-delivery orders are refused far more often than prepaid ones.",
    yours: "rtoRate",
  },
  {
    key: "return",
    term: "Return",
    termHi: "वापसी",
    plain: "The customer takes the parcel, then sends it back — usually because the size or the colour was not what she expected.",
    plainHi: "ग्राहक ने पार्सल लिया, फिर वापस भेज दिया — अक्सर साइज़ या रंग सही न होने पर।",
    why: "The goods come back, but handled, so they are worth less than new. You also pay the shipping both ways.",
    yours: "returnRate",
  },
  {
    key: "reverse-freight",
    term: "Return shipping",
    termHi: "वापसी का भाड़ा",
    plain: "What it costs to bring a parcel back from the customer to you.",
    plainHi: "ग्राहक से पार्सल वापस लाने का खर्च।",
    why: "It costs more than sending it out, because the courier collects from a house rather than from a pickup point, and often has to try twice.",
    yours: "reverseFreight",
  },
  {
    key: "gst-on-fees",
    term: "GST on fees",
    termHi: "फीस पर जीएसटी",
    plain: "An 18% tax charged on the shipping and advertising you pay for — not on the goods you sell.",
    plainHi: "भाड़े और विज्ञापन पर 18% टैक्स — आपके सामान पर नहीं।",
    why: "It is easy to miss because it never appears as its own line in your head. On a typical parcel it is more than ₹14.",
    yours: "gst",
  },
  {
    key: "contribution",
    term: "What you actually earn",
    termHi: "सच्ची कमाई",
    plain: "What is left from one parcel after every cost, counted across parcels that pay and parcels that do not.",
    plainHi: "हर पार्सल से, सब खर्च निकालकर, जो बचता है — मिलाकर उन पार्सल के भी जो पैसा नहीं देते।",
    why: "This is the only number that tells you whether selling more will make you richer or poorer.",
    yours: "contribution",
  },
  {
    key: "survival-price",
    term: "Survival price",
    termHi: "सुरक्षा दाम",
    plain: "The price where you break even exactly — you neither gain nor lose on the parcels you ship.",
    plainHi: "वह दाम जिस पर न फ़ायदा होता है, न नुकसान।",
    why: "Below it, every single parcel takes money out of your pocket, however many you sell.",
    yours: "floor",
  },
  {
    key: "visibility-ceiling",
    term: "Visibility ceiling",
    termHi: "दिखने की सीमा",
    plain: "The price above which buyers stop finding your listing at all.",
    plainHi: "वह दाम जिसके ऊपर ग्राहक आपका सामान ढूँढ ही नहीं पाते।",
    why: "Buyers sort by price. Above this point you are on a page nobody scrolls to, so the listing goes quiet even though nothing is wrong with it.",
    yours: "ceiling",
  },
  {
    key: "elasticity",
    term: "How much price moves orders",
    termHi: "दाम से ऑर्डर कितने बदलते हैं",
    plain: "How many more orders you get if you drop your price a little — and how many you lose if you raise it.",
    plainHi: "दाम थोड़ा कम करने पर कितने ज़्यादा ऑर्डर मिलते हैं, और बढ़ाने पर कितने कम।",
    why: "In clothes it is strong: a small price cut can double your orders. That is exactly why cutting price feels like it is working even when each parcel loses money.",
    yours: "elasticity",
  },
];
