import { redirect } from "next/navigation";

interface AgreementReminderRedirectProps {
  params: Promise<{ agreementId: string }>;
}

export default async function AgreementReminderRedirect({
  params,
}: AgreementReminderRedirectProps) {
  const { agreementId } = await params;
  redirect(`/trade-agreements/${encodeURIComponent(agreementId)}/reminders`);
}
