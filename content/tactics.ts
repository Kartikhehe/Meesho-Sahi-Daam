/**
 * "How do I actually do this?"
 *
 * A slider that moves a number is a toy unless it is attached to something a
 * seller can physically do on Monday morning. Each lever here carries concrete
 * tactics, with the rough size of the effect and how long it takes — because
 * "reduce your returns" is advice nobody can act on.
 */

export type Lever = "cogs" | "returnRate" | "codShare" | "adRate";

export type Tactic = {
  title: string;
  titleHi: string;
  detail: string;
  /** Rough effect, stated as a range so it does not read as a promise. */
  effect: string;
  effort: "days" | "weeks" | "months";
};

export const TACTICS: Record<Lever, { label: string; labelHi: string; tactics: Tactic[] }> = {
  cogs: {
    label: "What your goods cost",
    labelHi: "माल की लागत",
    tactics: [
      {
        title: "Buy in one larger lot instead of three small ones",
        titleHi: "एक बड़े लॉट में खरीदें",
        detail:
          "Most wholesale markets price in slabs. Moving from 50 pieces to 150 of the same design usually crosses a slab, and the whole order gets the lower rate.",
        effect: "6-12% off your cost",
        effort: "weeks",
      },
      {
        title: "Drop a weight slab with lighter packaging",
        titleHi: "हल्की पैकिंग से वज़न घटाएँ",
        detail:
          "Shipping is charged by weight slab, not by the gram. A parcel at 520g and one at 490g cost you very different amounts. Thinner polybags and no cardboard insert often save 40-60g.",
        effect: "₹17-22 on every single parcel",
        effort: "days",
      },
      {
        title: "Ask your supplier for the same design in a lighter fabric",
        titleHi: "हल्के कपड़े में वही डिज़ाइन",
        detail:
          "The same kurti in a lighter rayon often looks identical in photographs, costs less, and ships in a cheaper slab. Two savings from one change.",
        effect: "8-15% off, plus a slab",
        effort: "weeks",
      },
    ],
  },
  returnRate: {
    label: "How often things come back",
    labelHi: "कितना सामान वापस आता है",
    tactics: [
      {
        title: "Put a real size chart in the second photo",
        titleHi: "दूसरी फ़ोटो में साइज़ चार्ट",
        detail:
          "Measure the garment flat — chest, length, sleeve — and photograph the tape. Most clothing returns are size, and most size returns are a buyer guessing.",
        effect: "3-6 percentage points off returns",
        effort: "days",
      },
      {
        title: "Photograph the true colour in daylight",
        titleHi: "दिन की रोशनी में सही रंग",
        detail:
          "Colour mismatch is the second reason things come back. One honest daylight photo beats five edited ones, because the buyer is not surprised when she opens the parcel.",
        effect: "2-4 percentage points off returns",
        effort: "days",
      },
      {
        title: "Name the fabric plainly in the title",
        titleHi: "कपड़े का नाम साफ़ लिखें",
        detail:
          "A buyer expecting cotton who receives rayon sends it back. Saying 'rayon' loses you a few orders and saves you many more returns.",
        effect: "1-3 percentage points off returns",
        effort: "days",
      },
    ],
  },
  codShare: {
    label: "How many pay cash on delivery",
    labelHi: "कितने ग्राहक कैश पर लेते हैं",
    tactics: [
      {
        title: "Offer a small discount for paying in advance",
        titleHi: "पहले पैसे देने पर छूट",
        detail:
          "Cash-on-delivery parcels are refused about thirteen times more often than prepaid ones. A ₹10 discount that converts a COD order to prepaid pays for itself many times over.",
        effect: "Each 10% shifted cuts refusals by ~2 points",
        effort: "days",
      },
      {
        title: "Do not ship cash-on-delivery to your worst pincodes",
        titleHi: "जहाँ सबसे ज़्यादा मना होता है, वहाँ कैश बंद",
        detail:
          "A handful of postcodes usually account for a large share of refusals. Turning off cash on delivery for just those keeps the rest of your business untouched.",
        effect: "1-3 points off refusals",
        effort: "days",
      },
    ],
  },
  adRate: {
    label: "What you spend on ads",
    labelHi: "विज्ञापन पर खर्च",
    tactics: [
      {
        title: "Stop advertising listings priced below their floor",
        titleHi: "घाटे वाले सामान का विज्ञापन बंद करें",
        detail:
          "Advertising a listing that loses money on every parcel makes you lose money faster. Fix the price first, then advertise it.",
        effect: "Immediate, and it stops a bleed",
        effort: "days",
      },
      {
        title: "Concentrate the budget on listings already inside their band",
        titleHi: "जो सही दाम पर हैं, उन्हीं पर खर्च करें",
        detail:
          "Spreading a small budget across eighty listings buys nothing anywhere. The same money on your ten healthiest listings actually moves them.",
        effect: "Same spend, more orders that pay",
        effort: "days",
      },
    ],
  },
};
