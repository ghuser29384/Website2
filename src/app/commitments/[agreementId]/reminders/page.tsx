import { redirect } from "next/navigation";

interface CommitmentReminderRedirectProps {
  params: Promise<{ agreementId: string }>;
}

export default async function CommitmentReminderRedirect({
  params,
}: CommitmentReminderRedirectProps) {
  const { agreementId } = await params;
  redirect(`/trade-agreements/${encodeURIComponent(agreementId)}/reminders`);
}
