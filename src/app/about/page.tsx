import { permanentRedirect } from "next/navigation";

export default function RetiredAboutPage() {
  permanentRedirect("/feed");
}
