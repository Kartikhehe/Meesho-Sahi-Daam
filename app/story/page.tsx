import { ComingSoon } from "@/components/shared/coming-soon";

export default function Page() {
  return (
    <ComingSoon
      section="Story"
      title="Story Mode"
      description="A nine-step guided walkthrough that drives the real app with a narration rail: the ₹95 gap, the three archetypes, floor and ceiling, the DON'T LIST verdict, the unlock simulator, the band opening, the ladder running, triggers firing over 90 simulated days, and cohort impact. Esc exits at any point."
      phase={9}
    />
  );
}
