/**
 * Hindi scripts for the voice preview. Short sentences, one idea each, numbers
 * as digits (speech engines read them naturally). Every number is passed in
 * from the engine — nothing here is a figure of its own.
 */

import type { LaunchVerdict } from "@/engine/types";

const r = (n: number) => `${Math.round(n)} रुपये`;

export function verdictScript(v: LaunchVerdict, n: { floor: number; ceiling: number; launch?: number; lever?: string }): string {
  switch (v) {
    case "DONT_LIST":
      return `इस सामान को अभी मत डालिए। इसे भेजकर बराबरी पर आने के लिए कम से कम ${r(n.floor)} चाहिए। लेकिन ग्राहक ${r(n.ceiling)} से ऊपर इसे देखते ही नहीं। ${n.lever ? `पहले ${n.lever} बदलना होगा।` : "पहले लागत कम करनी होगी।"}`;
    case "DIFFERENTIATE":
      return `इसमें जगह बहुत कम है। ${r(n.floor)} से ${r(n.ceiling)} के बीच ही दाम रख सकते हैं। सिर्फ़ दाम से नहीं जीत पाएँगे। कुछ अलग दिखाइए।`;
    case "PROFIT_MAX":
      return `यह सामान डाल सकते हैं। ${n.launch ? `${r(n.launch)} पर शुरू कीजिए। इस दाम पर सबसे ज़्यादा कमाई होगी।` : ""}`;
    case "PRICE_FOR_MARGIN":
      return `इसमें अच्छी जगह है। ${n.launch ? `${r(n.launch)} पर अच्छा मुनाफ़ा होगा।` : ""} ऐसा डिज़ाइन और भी बनवाइए।`;
  }
}

export function alertScript(messageHi: string, rupeesPerMonth: number): string {
  return `${messageHi} इससे हर महीने लगभग ${r(rupeesPerMonth)} का फ़र्क पड़ता है।`;
}
