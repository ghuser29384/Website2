import { getViewer } from "@/lib/app-data";
import { loadTradeDonationAgreementContext } from "@/lib/trade-donation";

import pageStyles from "./trade-agreement-page-visibility.module.css";
import { TradeAgreementStage as BaseTradeAgreementStage } from "./trade-agreement-stage-base";
import { TradeDonationAgreementStage } from "./trade-donation-agreement-stage";
import { TradeOutcomeFeedback } from "./trade-outcome-feedback";

type TradeAgreementStageProps = Parameters<typeof BaseTradeAgreementStage>[0];

export async function TradeAgreementStage(props: TradeAgreementStageProps) {
  const [context, viewer] = await Promise.all([
    loadTradeDonationAgreementContext(props.agreementId),
    getViewer(),
  ]);
  const stage = context ? (
    <TradeDonationAgreementStage
      baseProps={props}
      context={
        !context.term && !context.provider.ready
          ? { ...context, eligible: false }
          : context
      }
      viewerUserId={viewer?.authUser.id ?? ""}
    />
  ) : (
    <BaseTradeAgreementStage {...props} />
  );

  return (
    <div className={pageStyles.scope}>
      {stage}
      {props.lifecycleStatus === "completed" && viewer ? (
        <section
          aria-labelledby="outcome-learning-heading"
          className="section section-subtle"
          id="outcome-feedback"
        >
          <div className="section-head section-head-compact">
            <p className="eyebrow">Improve future matching</p>
            <h2 id="outcome-learning-heading">
              Report this trade separately, by your own lights.
            </h2>
            <p>
              The report is private, does not alter the frozen deal, and is used only after
              minimum-data, calibration, and safety gates pass.
            </p>
          </div>
          <TradeOutcomeFeedback
            agreementId={props.agreementId}
            profileId={viewer.authUser.id}
          />
        </section>
      ) : null}
    </div>
  );
}
