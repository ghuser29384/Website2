import type { ReactNode } from "react";

import { ReminderLauncher } from "@/components/core-trade/reminder-launcher";

interface TradeAgreementTemplateProps {
  children: ReactNode;
  params: Promise<{ agreementId: string }>;
}

export default async function TradeAgreementTemplate({
  children,
  params,
}: TradeAgreementTemplateProps) {
  const { agreementId } = await params;
  return (
    <>
      {children}
      <ReminderLauncher agreementId={agreementId} />
    </>
  );
}
