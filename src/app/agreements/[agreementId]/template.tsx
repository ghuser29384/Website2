import type { ReactNode } from "react";

import { ReminderLauncher } from "@/components/core-trade/reminder-launcher";

interface AgreementTemplateProps {
  children: ReactNode;
  params: Promise<{ agreementId: string }>;
}

export default async function AgreementTemplate({
  children,
  params,
}: AgreementTemplateProps) {
  const { agreementId } = await params;
  return (
    <>
      {children}
      <ReminderLauncher agreementId={agreementId} />
    </>
  );
}
