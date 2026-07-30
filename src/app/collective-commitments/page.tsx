import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Collective commitments",
  robots: { index: false, follow: false },
};

export default function CollectiveCommitmentsRedirectPage() {
  redirect("/trades/new?mode=collective#collective-commitments-list");
}
