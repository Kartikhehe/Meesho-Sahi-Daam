"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-[var(--text)]">This screen could not be drawn</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Everything else still works. Try again, or pick another screen from the menu.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-[var(--radius-input)] bg-[var(--surface-sunken)] p-3 text-[12px] text-[var(--text-muted)]">
          {error.message}
        </pre>
        <Button variant="primary" className="mt-5" onClick={reset}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
