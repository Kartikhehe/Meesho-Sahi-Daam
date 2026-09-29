/**
 * Translation.
 *
 * Eight languages are structured; Hindi and English are fully populated and the
 * rest are honestly marked as stubs rather than machine-filled. A half-
 * translated interface is worse than an English one for a seller who cannot
 * read English — she gets stranded mid-flow. `languageStatus()` reports which
 * is which, and the language switcher shows it.
 *
 * Seller screens lead in Hindi with English beneath, so `t()` returns both.
 */

export type Lang = "hi" | "en" | "bn" | "ta" | "te" | "mr" | "gu" | "kn";

export const LANGUAGES: { code: Lang; label: string; native: string; complete: boolean }[] = [
  { code: "hi", label: "Hindi", native: "हिन्दी", complete: true },
  { code: "en", label: "English", native: "English", complete: true },
  { code: "bn", label: "Bengali", native: "বাংলা", complete: false },
  { code: "ta", label: "Tamil", native: "தமிழ்", complete: false },
  { code: "te", label: "Telugu", native: "తెలుగు", complete: false },
  { code: "mr", label: "Marathi", native: "मराठी", complete: false },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", complete: false },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", complete: false },
];

/** The product's core vocabulary. Hindi first — these are the words on screen. */
export const DICT = {
  survivalPrice: { hi: "सुरक्षा दाम", en: "Survival price" },
  winningPrice: { hi: "जीतने वाला दाम", en: "Winning price" },
  visibilityCeiling: { hi: "दिखने की सीमा", en: "Visibility ceiling" },
  yourPrice: { hi: "आपका दाम", en: "Your price" },
  suggestedPrice: { hi: "सुझाया दाम", en: "Suggested price" },
  seeTheMaths: { hi: "हिसाब देखें", en: "See the maths" },
  perParcel: { hi: "हर पार्सल पर", en: "per parcel shipped" },
  youEarn: { hi: "आपकी कमाई", en: "You earn" },
  youLose: { hi: "आपका नुकसान", en: "You lose" },
  today: { hi: "आज का हिसाब", en: "Today's reckoning" },
  myCatalogue: { hi: "मेरा सामान", en: "My catalogue" },
  moneyAtRisk: { hi: "खतरे में पैसा", en: "Money at risk right now" },
  doThese: { hi: "ये तीन काम करें", en: "Do these three things" },
  returns: { hi: "वापसी", en: "Returns" },
  rto: { hi: "मना किए पार्सल", en: "Refused parcels" },
  freight: { hi: "भाड़ा", en: "Shipping" },
  packaging: { hi: "पैकिंग", en: "Packaging" },
  ads: { hi: "विज्ञापन", en: "Ads" },
  gst: { hi: "जीएसटी", en: "GST" },
  cogs: { hi: "माल की लागत", en: "Cost of goods" },
  daamScore: { hi: "दाम स्कोर", en: "Daam Score" },
  accept: { hi: "मंज़ूर करें", en: "Accept" },
  setMyOwn: { hi: "अपना दाम रखें", en: "Set my own" },
  dontListYet: { hi: "अभी मत डालें", en: "Don't list yet" },
} as const;

export type DictKey = keyof typeof DICT;

/** Both scripts, for the Hindi-first / English-beneath pattern. */
export function t(key: DictKey): { hi: string; en: string } {
  return DICT[key];
}

export function languageStatus(code: Lang): "complete" | "stub" {
  return LANGUAGES.find((l) => l.code === code)?.complete ? "complete" : "stub";
}

/**
 * The WhatsApp message body for an alert — the real delivery channel. Only
 * Hindi and English are written out; asking for another language returns the
 * English text with a flag, so the UI can say so rather than pretend.
 */
export function alertMessage(
  alert: { message: string; messageHi: string },
  lang: Lang,
): { text: string; translated: boolean } {
  if (lang === "hi") return { text: alert.messageHi, translated: true };
  if (lang === "en") return { text: alert.message, translated: true };
  return { text: alert.message, translated: false };
}
