import { permanentRedirect } from "next/navigation";

// The former radar used demonstration campaigns, not live funding records.
// Do not carry fictitious campaign IDs or pledge amounts into a real workflow.
export default function ThresholdRadarPage() {
  permanentRedirect("/pools");
}
