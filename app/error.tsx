"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Errors say what happened and what to do. No apologies, no vagueness.
 * One broken chart must never take down the app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-[var(--text)]">This screen could not be drawn</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The rest of the app is unaffected. Try again, or move to another screen — your prices and
          settings are untouched.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-3 text-[12px] text-[var(--text-muted)]">
          {error.message}
        </pre>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" onClick={reset}>
            Try again
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = "/")}>
            Go to start
          </Button>
        </div>
      </Card>
    </div>
  );
}
