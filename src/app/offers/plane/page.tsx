import { permanentRedirect } from "next/navigation";

// Existing bookmarks lead to the authoritative directory, never to inferred scores.
export default function LegacyOfferPlanePage() {
  permanentRedirect("/discover");
}
