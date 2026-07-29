import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create a collective commitment",
  robots: { index: false, follow: false },
};

export default function NewCollectiveCommitmentRedirectPage() {
  redirect("/trades/new?mode=collective#collective-commitment-form");
}
