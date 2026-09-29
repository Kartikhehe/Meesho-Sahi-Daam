"use client";

/**
 * The audit log.
 *
 * This is a real product requirement, not decoration: changing a cost model
 * changes what sellers are told about their own businesses, and a manager
 * opening one seller's cost detail is a privacy event. Both leave a record
 * with an actor, a timestamp, a before and an after, and — for config changes
 * — the computed blast radius.
 */

import { useCallback } from "react";
import { useUiStore } from "./store/ui-store";
import { useWorldStore } from "./store/world-store";
import { isAudited, type Capability, type Role } from "./access";
import type { AuditEntry } from "@/engine/types";

export type AuditInput = {
  capability: Capability;
  action: string;
  subject: string;
  before?: string;
  after?: string;
  blastRadius?: string;
};

/** Actor names are the role, since there is no real auth in this prototype. */
function actorFor(role: Role): string {
  return role === "admin" ? "Admin" : role === "manager" ? "Category Manager" : "Seller";
}

export function useAudit() {
  const role = useUiStore((s) => s.role);
  const appendAudit = useWorldStore((s) => s.appendAudit);
  const world = useWorldStore((s) => s.world);

  const day = world?.day ?? 0;

  // Stable across renders, so effects that audit do not re-fire on every paint.
  return useCallback(
    (input: AuditInput) => {
      if (!isAudited(input.capability)) return;
      appendAudit({
        day,
        actor: actorFor(role),
        action: input.action,
        subject: input.subject,
        before: input.before,
        after: input.after,
        blastRadius: input.blastRadius,
      });
    },
    [appendAudit, role, day],
  );
}

export function auditEntries(world: { auditLog: AuditEntry[] } | null): AuditEntry[] {
  if (!world) return [];
  return [...world.auditLog].sort((a, b) => b.timestamp - a.timestamp);
}
