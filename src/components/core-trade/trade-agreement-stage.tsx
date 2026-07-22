import { getViewer } from "@/lib/app-data";
import { loadTradeDonationAgreementContext } from "@/lib/trade-donation";

import { TradeAgreementStage as BaseTradeAgreementStage } from "./trade-agreement-stage-base";
import { TradeDonationAgreementStage } from "./trade-donation-agreement-stage";

type TradeAgreementStageProps = Parameters<typeof BaseTradeAgreementStage>[0];

export async function TradeAgreementStage(props: TradeAgreementStageProps) {
  const [context, viewer] = await Promise.all([
    loadTradeDonationAgreementContext(props.agreementId),
    getViewer(),
  ]);
  if (!context) return <BaseTradeAgreementStage {...props} />;

  const visibleContext =
    !context.term && !context.provider.ready
      ? { ...context, eligible: false }
      : context;

  return (
    <TradeDonationAgreementStage
      baseProps={props}
      context={visibleContext}
      viewerUserId={viewer?.authUser.id ?? ""}
    />
  );
}
