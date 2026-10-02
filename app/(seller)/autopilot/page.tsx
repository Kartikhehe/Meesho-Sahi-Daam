"use client";

/**
 * S9 · Auto-Pilot — the trust ladder.
 *
 * Guided → Assisted → Auto-Pilot, earned by accepting suggestions. Auto-Pilot
 * is opt-in, bounded by her own floor, paused by the kill switch or the Buyer
 * Price Index guardrail, and every automatic move can be undone in one tap
 * with a plain "why did this change?".
 */

import { useMemo, useState } from "react";
import { Check, Lock, RotateCcw } from "lucide-react";
import { Card, CardHead } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/shared/callout";
import { Page, PageHeader } from "@/components/shared/page-header";
import { Skeleton, StateGate, EmptyState } from "@/components/shared/empty-state";
import { useSeller } from "@/lib/use-seller";
import { useSellerStore, useWorldStore, type TrustMode } from "@/lib/store/world-store";
import { useConfigStore } from "@/lib/store/config-store";
import { useAudit } from "@/lib/audit";
import { ASSISTED_AT, AUTOPILOT_AT, proposedMoves, unlocked } from "@/lib/trust";
import { inr, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/cn";

const LEVELS: { key: TrustMode; label: string; labelHi: string; what: string; at: number }[] = [
  { key: "guided", label: "Guided", labelHi: "सलाह", what: "We suggest. You change prices yourself.", at: 0 },
  { key: "assisted", label: "Assisted", labelHi: "मदद", what: "Suggestions queue up; approve each with one tap.", at: ASSISTED_AT },
  { key: "autopilot", label: "Auto-Pilot", labelHi: "ऑटो-पायलट", what: "We move prices inside your bounds. Undo any move in one tap.", at: AUTOPILOT_AT },
];

export default function AutoPilotPage() {
  const { world, seller, analyses, status, error } = useSeller();
  const setPrice = useWorldStore((s) => s.setPrice);
  const store = useSellerStore();
  const available = useConfigStore((s) => s.autoPilotAvailable && !s.killSwitch);
  const audit = useAudit();
  const [ran, setRan] = useState<number | null>(null);

  const id = seller?.id ?? "";
  const accepted = store.accepted[id] ?? 0;
  const mode = store.trustMode[id] ?? "guided";
  const open = unlocked(accepted);
  const moves = useMemo(() => proposedMoves(analyses), [analyses]);
  const log = store.autoMoves.filter((m) => analyses.some((a) => a.listing.id === m.listingId));

  const approve = (listingId: string, to: number) => {
    setPrice(listingId, to);
    store.recordAccept(id);
  };

  const runAutoPilot = () => {
    const day = world?.day ?? 0;
    const made = moves.map((m) => ({ id: `auto-${m.listingId}-${day}-${Date.now()}`, listingId: m.listingId, from: m.from, to: m.to, day, why: m.why }));
    for (const m of made) setPrice(m.listingId, m.to);
    store.logAutoMoves(made);
    audit({ capability: "seller.autoPilot", action: "Auto-Pilot moved prices", subject: seller?.businessName ?? "", after: `${made.length} listings repriced`, blastRadius: `${made.length} of her own listings, each inside her floor and ceiling` });
    setRan(made.length);
  };

  const undo = (moveId: string, listingId: string, from: number) => {
    setPrice(listingId, from);
    store.markUndone(moveId);
  };

  return (
    <Page className="seller-flow">
      <PageHeader titleHi="ऑटो-पायलट" title="Auto-Pilot" description="Trust is earned: accept suggestions and more of the work can be handed over — always inside your own floor, always undoable." />
      <StateGate status={status} error={error} skeleton={<Skeleton className="h-80 w-full" />}>
        <Card className="mb-4 p-4 sm:p-5">
          <CardHead title="Your trust ladder" titleHi="भरोसे की सीढ़ी" description={`${accepted} suggestions accepted so far.`} />
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
            <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${Math.min(100, (accepted / AUTOPILOT_AT) * 100)}%` }} />
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-3">
            {LEVELS.map((l) => {
              const isOpen = open[l.key];
              const active = mode === l.key;
              return (
                <li key={l.key}>
                  <button type="button" disabled={!isOpen || (l.key === "autopilot" && !available)} onClick={() => store.setTrustMode(id, l.key)} aria-pressed={active}
                    className={cn("h-full w-full rounded-[var(--radius-card)] p-3 text-left transition-colors disabled:opacity-55", active ? "bg-[var(--brand-magenta-50)] shadow-[inset_0_0_0_1.5px_var(--brand-magenta)]" : "shadow-[inset_0_0_0_1px_var(--border)] hover:bg-[var(--surface-sunken)]")}>
                    <span className="flex items-center gap-1.5">
                      {isOpen ? <Check size={14} className="text-[var(--success)]" aria-hidden /> : <Lock size={13} className="text-[var(--text-subtle)]" aria-hidden />}
                      <span className="hi text-[14px] font-semibold text-[var(--text)]">{l.labelHi}</span>
                      <span className="text-[12px] text-[var(--text-muted)]">· {l.label}</span>
                    </span>
                    <span className="type-caption mt-1 block text-[var(--text-muted)]">{l.what}</span>
                    <span className="mt-1 block text-[11.5px] text-[var(--text-subtle)]">{isOpen ? (active ? "Active" : "Unlocked — tap to switch") : `Unlocks at ${l.at} accepted (${l.at - accepted} to go)`}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {!available ? <p className="type-caption mt-3 text-[var(--warning)]">Auto-Pilot is switched off platform-wide right now.</p> : null}
        </Card>

        {mode === "guided" ? (
          <Callout tone="neutral" title="You are in Guided mode">
            Accept suggestions on any listing (or apply them in bulk from My Catalogue). Each one counts toward Assisted at {ASSISTED_AT} and Auto-Pilot at {AUTOPILOT_AT}.
          </Callout>
        ) : null}

        {mode === "assisted" || mode === "autopilot" ? (
          <Card className="mb-4 p-4 sm:p-5">
            <CardHead title={mode === "assisted" ? "Waiting for your approval" : "What Auto-Pilot will do"} titleHi={mode === "assisted" ? "आपकी मंज़ूरी" : "ऑटो-पायलट क्या करेगा"}
              description={`${moves.length} listings, each kept between your survival price plus margin and the visibility ceiling.`}
              action={mode === "autopilot" && moves.length ? <Button variant="primary" onClick={runAutoPilot}>Run Auto-Pilot now</Button> : null} />
            {ran !== null ? <p className="type-small mt-3 text-[var(--success)]">Moved {ran} prices. Every move is listed below with an undo.</p> : null}
            {moves.length === 0 ? (
              <EmptyState className="mt-3" tone="success" title="Nothing to move" description="Every listing already sits at the price that earns most inside its band." />
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {moves.slice(0, 12).map((m) => (
                  <li key={m.listingId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[var(--text)]">{m.name}</p>
                      <p className="type-caption text-[var(--text-muted)]">{m.why}</p>
                    </div>
                    <p className="tabular shrink-0 text-[14px] font-semibold"><span className="text-[var(--text-muted)] line-through">{inr(m.from)}</span> → {inr(m.to)}</p>
                    {mode === "assisted" ? <Button size="sm" variant="secondary" onClick={() => approve(m.listingId, m.to)}>Approve</Button> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        <Card className="p-4 sm:p-5">
          <CardHead title="Automatic moves" titleHi="अपने आप हुए बदलाव" description="Why each price changed — and one tap to put it back." />
          {log.length === 0 ? (
            <p className="type-small mt-3 text-[var(--text-muted)]">No automatic moves yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--border)]">
              {log.slice(0, 20).map((m) => (
                <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[var(--text)]">{inr(m.from)} → {inr(m.to)} <span className="font-normal text-[var(--text-subtle)]">· {formatDateShort(m.day)}</span></p>
                    <p className="type-caption text-[var(--text-muted)]"><strong>Why did this change?</strong> {m.why}</p>
                  </div>
                  {m.undone ? <span className="text-[12px] text-[var(--text-subtle)]">Undone</span> : (
                    <Button size="sm" variant="ghost" onClick={() => undo(m.id, m.listingId, m.from)}><RotateCcw size={13} aria-hidden /> Undo</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </StateGate>
    </Page>
  );
}
