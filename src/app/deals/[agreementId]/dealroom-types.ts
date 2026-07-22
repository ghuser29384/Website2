import type { getAgreementForUser } from "@/lib/app-data";

export type DealroomAgreement = NonNullable<
  Awaited<ReturnType<typeof getAgreementForUser>>
>;
