import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Collective identity verification",
  robots: { index: false, follow: false },
};

export default function CollectiveIdentityRedirectPage() {
  redirect("/trades/new?mode=collective#collective-identity");
}
