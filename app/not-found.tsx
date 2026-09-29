import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-[var(--text)]">No screen at this address</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Nothing is broken — this route does not exist. Use the menu, or start from your home
          screen.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center rounded-[var(--radius-input)] bg-[var(--brand-magenta)] px-4 text-sm font-medium text-white"
        >
          Go to start
        </Link>
      </Card>
    </div>
  );
}
