"use client";

/**
 * S6 · Alerts.
 *
 * Ranked by what each one costs her, capped at two a week, with the cap stated
 * plainly rather than hidden. Each alert shows the WhatsApp message beside it,
 * because WhatsApp is the real delivery channel — a seller reads that, not an
 * inbox in a dashboard.
 */

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import { VoicePreview } from "@/components/shared/voice-preview";
import { alertScript } from "@/content/voice";
import { EmptyState, Skeleton, StateGate } from "@/components/shared/empty-state";
import { TRIGGER_COPY } from "@/engine/triggers";
import { ALERT_CAP_PER_WEEK } from "@/engine/constants";
import { useSeller } from "@/lib/use-seller";
import { useSellerStore, useWorldStore } from "@/lib/store/world-store";
import { LANGUAGES, alertMessage, type Lang } from "@/lib/i18n";
import { inr, formatDateShort, count } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { FiredTrigger, TriggerId } from "@/engine/types";
import { Page, PageHeader } from "@/components/shared/page-header";

export default function AlertsPage() {
  return (
    <Suspense fallback={null}>
      <Alerts />
    </Suspense>
  );
}

function Alerts() {
  const { world, seller, status, error } = useSeller();
  const acknowledge = useWorldStore((s) => s.acknowledgeAlert);
  const [lang, setLang] = useState<Lang>("hi");
  // ?trigger=COST_DRIFT shows every alert of one kind in full — including any
  // the weekly cap held back — so a specific story can be followed.
  const only = useSearchParams().get("trigger") as TriggerId | null;

  const { live, muted } = useMemo(() => {
    if (!world || !seller) return { live: [] as FiredTrigger[], muted: [] as FiredTrigger[] };
    const mine = world.alerts.filter((a) => a.sellerId === seller.id);
    const recent = mine.filter((a) => a.day > world.day - 28);
    if (only) {
      return { live: recent.filter((a) => a.triggerId === only).sort((a, b) => b.day - a.day || b.rupeeImpact - a.rupeeImpact), muted: [] };
    }
    return {
      live: recent.filter((a) => !a.muted).sort((a, b) => b.day - a.day || b.rupeeImpact - a.rupeeImpact),
      muted: recent.filter((a) => a.muted).sort((a, b) => b.rupeeImpact - a.rupeeImpact),
    };
  }, [world, seller, only]);

  const listingName = (id: string) => world?.listings.find((l) => l.id === id)?.name ?? id;

  return (
    <Page width="narrow">
      <PageHeader
        titleHi="सूचनाएँ"
        title="Alerts"
        description="What changed, what it costs you, and the one thing to do about it."
      />

      <StateGate status={status} error={error} skeleton={<Skeleton className="h-80 w-full" />}>
        <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
          <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">
            We send at most <strong className="text-[var(--text)]">{ALERT_CAP_PER_WEEK} a week</strong>.
            Anything beyond that waits its turn — more than two and people stop reading them, which
            helps nobody.
          </p>
          <label className="ml-auto flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
            <span className="shrink-0">Message language</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="h-9 rounded-[var(--radius-input)] border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-[12px] text-[var(--text)]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native}
                  {l.complete ? "" : " (not translated yet)"}
                </option>
              ))}
            </select>
          </label>
        </Card>

        {only ? (
          <p className="type-small mb-3 text-[var(--text-muted)]">
            Showing only <strong className="text-[var(--text)]">{TRIGGER_COPY[only]?.label ?? only}</strong> alerts from the last four weeks,
            including any the weekly cap held back. <a href="/alerts" className="link">Show all</a>
          </p>
        ) : null}

        {live.length === 0 ? (
          <EmptyState
            tone="success"
            title="Nothing needs your attention this week"
            description="We only get in touch when something moved enough to cost you money. No news here is genuinely good news."
          />
        ) : (
          <ul className="space-y-3">
            {live.map((a) => (
              <li key={a.id}>
                <AlertCard
                  alert={a}
                  lang={lang}
                  listingName={listingName(a.listingId)}
                  onAcknowledge={() => acknowledge(a.id)}
                />
              </li>
            ))}
          </ul>
        )}

        {muted.length > 0 ? (
          <section className="mt-6">
            <h2 className="text-[13px] font-semibold text-[var(--text)]">
              Waiting their turn ({count(muted.length)})
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
              Real, but smaller than the ones above. They are held back by the weekly cap, not
              discarded — you can act on any of them now.
            </p>
            <ul className="mt-2 space-y-1.5">
              {muted.slice(0, 8).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-2 rounded-[var(--radius-input)] border border-[var(--border)] px-3 py-2"
                >
                  <StatusChip tone="neutral">{TRIGGER_COPY[a.triggerId].label}</StatusChip>
                  <Link
                    href={`/sku/${a.listingId}`}
                    className="min-w-0 flex-1 truncate text-[12px] text-[var(--text-muted)] hover:text-[var(--text)] hover:underline"
                  >
                    {listingName(a.listingId)}
                  </Link>
                  <span className="tabular shrink-0 text-[12px] font-medium text-[var(--text-muted)]">
                    {inr(a.rupeeImpact)}/mo
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </StateGate>
    </Page>
  );
}

function AlertCard({
  alert,
  lang,
  listingName,
  onAcknowledge,
}: {
  alert: FiredTrigger;
  lang: Lang;
  listingName: string;
  onAcknowledge: () => void;
}) {
  const [showMessage, setShowMessage] = useState(false);
  const copy = TRIGGER_COPY[alert.triggerId];
  const message = alertMessage(alert, lang);

  const tone =
    alert.severity === "high" ? "danger" : alert.severity === "medium" ? "warning" : "neutral";

  return (
    <Card className={cn("p-4", alert.acknowledged && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone={tone}>
          <span className="hi">{copy.labelHi}</span>
        </StatusChip>
        <span className="tabular text-[12px] text-[var(--text-subtle)]">
          {formatDateShort(alert.day)}
        </span>
        {alert.muted ? <StatusChip tone="neutral" dot={false}>Held back by the weekly cap</StatusChip> : null}
        <span className="tabular ml-auto text-sm font-semibold text-[var(--danger)]">
          {inr(alert.rupeeImpact)}/month
        </span>
      </div>

      <p className="mt-2 text-[14px] leading-relaxed text-[var(--text)]">{alert.message}</p>
      <p className="hi mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
        {alert.messageHi}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={`/sku/${alert.listingId}`}>
          <Button size="sm" variant="secondary">
            Open {listingName.length > 22 ? `${listingName.slice(0, 22)}…` : listingName}
          </Button>
        </Link>
        <Button size="sm" variant="ghost" onClick={() => setShowMessage((v) => !v)}>
          <MessageCircle size={13} aria-hidden />
          {showMessage ? "Hide" : "See"} the WhatsApp message
        </Button>
        <MuteButton alertId={alert.id} />
        {!alert.acknowledged ? (
          <Button size="sm" variant="ghost" onClick={onAcknowledge}>
            <Check size={13} aria-hidden />
            Mark as done
          </Button>
        ) : (
          <span className="text-[12px] text-[var(--success)]">Done</span>
        )}
      </div>

      {showMessage ? (
        <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-sunken)] p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-subtle)]">
            How this arrives on WhatsApp
          </p>
          <div className="mt-2 max-w-sm rounded-lg rounded-tl-none bg-[var(--success-bg)] px-3 py-2">
            <p
              className={cn(
                "text-[13px] leading-relaxed text-[var(--text)]",
                lang === "hi" && "hi",
              )}
            >
              {message.text}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              सही दाम · Reply STOP to pause these
            </p>
          </div>
          <VoicePreview className="mt-3" script={alertScript(alert.messageHi, alert.rupeeImpact)} />
          {!message.translated ? (
            <p className="mt-2 text-[11px] leading-relaxed text-[var(--warning)]">
              This language is not translated yet, so the English text is shown. We would rather say
              that than send a half-translated message.
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function MuteButton({ alertId }: { alertId: string }) {
  const muted = useSellerStore((s) => s.mutedAlerts.includes(alertId));
  const mute = useSellerStore((s) => s.muteAlert);
  return muted ? (
    <span className="text-[12px] text-[var(--text-subtle)]">Muted</span>
  ) : (
    <Button size="sm" variant="ghost" onClick={() => mute(alertId)}>Mute</Button>
  );
}
