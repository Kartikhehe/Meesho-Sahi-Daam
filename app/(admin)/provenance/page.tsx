import { PARAMS, type ParamKind } from "@/engine/constants";
import { Card } from "@/components/ui/card";
import { inr, pct, ratio } from "@/lib/format";
import { Page, PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Data Provenance — Sahi Daam" };

const KIND_COPY: Record<ParamKind, { label: string; tone: string; note: string }> = {
  benchmark: {
    label: "Published benchmark",
    tone: "text-[var(--success)] bg-[var(--success-bg)] border-[var(--success)]/25",
    note: "Taken from published industry data. The source is named in full.",
  },
  assumption: {
    label: "Our assumption",
    tone: "text-[var(--warning)] bg-[var(--warning-bg)] border-[var(--warning)]/25",
    note: "Our own modelling choice. Stated as such rather than dressed up as data.",
  },
  derived: {
    label: "Derived",
    tone: "text-[var(--info)] bg-[var(--info-bg)] border-[var(--info)]/25",
    note: "Computed from the parameters above.",
  },
};

function formatValue(value: number, unit: string): string {
  switch (unit) {
    case "INR":
      return inr(value, 2);
    case "PCT":
      return pct(value);
    case "RATIO":
      return ratio(value);
    case "DAYS":
      return `${value} days`;
    default:
      return String(value);
  }
}

export default function ProvenancePage() {
  const counts = PARAMS.reduce<Record<string, number>>((acc, p) => {
    acc[p.kind] = (acc[p.kind] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Page>
      <PageHeader
        title="Data provenance"
        description={<>Every parameter behind every number this product shows a seller, with its source. Where a figure comes from published research, the study is named. Where it is our own modelling choice, it says so — being candid about that distinction is the point of this screen.</>}
      />

      <Card className="mb-5 p-4">
        <h2 className="text-sm font-semibold text-[var(--text)]">Why this world is simulated</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Public product datasets carry names, prices, ratings and review counts. None of them
          carry cost of goods, settlement lines, RTO or return outcomes — which are exactly the
          fields this product reasons about, and nobody publishes per-order settlement ledgers.
          Rather than present a scraped catalogue as though it contained that data, we simulate a
          world from published benchmark parameters, listed in full below. The arithmetic applied
          to it is real, and a CSV adapter maps a genuine catalogue file onto these same types when
          one is available.
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(KIND_COPY) as ParamKind[]).map((kind) => (
          <span
            key={kind}
            className={`rounded-[var(--radius-chip)] border px-2.5 py-1 text-[12px] font-medium ${KIND_COPY[kind].tone}`}
          >
            {KIND_COPY[kind].label} · {counts[kind] ?? 0}
          </span>
        ))}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="sticky top-0 bg-[var(--surface-sunken)]">
              <tr className="border-b border-[var(--border)]">
                <th scope="col" className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">
                  Parameter
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-[var(--text-muted)]">
                  Value
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">
                  Kind
                </th>
                <th scope="col" className="px-4 py-2.5 font-semibold text-[var(--text-muted)]">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {PARAMS.map((p) => (
                <tr key={p.key} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-sunken)]">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-[var(--text)]">{p.label}</div>
                    <code className="mt-0.5 block text-[11px] text-[var(--text-subtle)]">{p.key}</code>
                  </td>
                  <td className="tabular px-4 py-3 text-right align-top font-medium text-[var(--text)]">
                    {formatValue(p.value, p.unit)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`whitespace-nowrap rounded-[var(--radius-chip)] border px-2 py-0.5 text-[11px] font-medium ${KIND_COPY[p.kind].tone}`}
                    >
                      {KIND_COPY[p.kind].label}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-3 align-top leading-relaxed text-[var(--text-muted)]">
                    {p.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-[12px] text-[var(--text-subtle)]">
        This table is rendered directly from <code>engine/constants.ts</code>. There is no separate
        copy of these numbers — what the engine computes with is what you are reading.
      </p>
    </Page>
  );
}
