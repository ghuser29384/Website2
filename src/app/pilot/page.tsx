import { permanentRedirect } from "next/navigation";

export default function LegacyPilotPage() {
  permanentRedirect("/start");
}
