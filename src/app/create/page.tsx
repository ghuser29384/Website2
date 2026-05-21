import type { Metadata } from "next";

import NewOfferPage from "@/app/offers/new/page";

export const metadata: Metadata = {
  title: "Create trade",
  description: "Create an account or sign in to save and publish a structured moral trade proposal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CreateTradePage() {
  return <NewOfferPage searchParams={Promise.resolve({})} />;
}
