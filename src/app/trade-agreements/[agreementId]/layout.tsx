import type { ReactNode } from "react";

import { ReminderLauncher } from "@/components/core-trade/reminder-launcher";

interface TradeAgreementLayoutProps {
  children: ReactNode;
  params: Promise<{ agreementId: string }>;
}

export default async function TradeAgreementLayout({
  children,
  params,
}: TradeAgreementLayoutProps) {
  const { agreementId } = await params;
  return (
    <>
      {children}
      <ReminderLauncher agreementId={agreementId} />
    </>
  );
}
