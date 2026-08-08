import { redirect } from "next/navigation";

export default function IdentityRecoveryPage() {
  redirect("/identity?purpose=recovery&returnTo=/account/identity");
}
