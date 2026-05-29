import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Saved offers",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CartRedirectPage() {
  redirect("/saved-offers");
}
