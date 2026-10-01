import { Info } from "lucide-react";

/**
 * For the seller who also sells elsewhere: these numbers are Meesho's, not
 * hers in general. Another marketplace charges commission, ships on other
 * lanes and sees different refusal rates, so the same product has a
 * different floor there.
 */
export function MeeshoScope() {
  return (
    <p className="flex gap-2 text-[12px] leading-relaxed text-[var(--text-subtle)]">
      <Info size={14} aria-hidden className="mt-[3px] shrink-0" />
      <span>
        This floor is for Meesho only — zero commission, Valmo shipping lanes, and Meesho&rsquo;s own refusal and
        return rates. If you also sell on another marketplace, your floor there is different: it charges commission
        and ships differently.
      </span>
    </p>
  );
}
