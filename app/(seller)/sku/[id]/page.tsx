import { ComingSoon } from "@/components/shared/coming-soon";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <ComingSoon
      section="S3"
      title={`SKU ${id}`}
      description="The signature screen. Five tabs: Price (the Daam Meter), Cost (the unit-economics waterfall), Market (your cluster and its twins), History (price against triggers and stages), Experiment (the running price ladder)."
      phase={6}
    />
  );
}
