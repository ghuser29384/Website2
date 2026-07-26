import { submitRecommendationOutcomeFeedbackAction } from "@/app/recommendation-outcome-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { createClient } from "@/lib/supabase/server";

interface TradeOutcomeFeedbackProps {
  agreementId: string;
  profileId: string;
}

interface FeedbackRow {
  own_lights_gain: number;
  satisfaction: number;
  would_happen_without_trade_percent: number;
  externality_concern: string;
  notes: string;
  updated_at: string;
}

export async function TradeOutcomeFeedback({
  agreementId,
  profileId,
}: TradeOutcomeFeedbackProps) {
  const supabase = await createClient();
  const result = await (supabase as any)
    .from("recommendation_outcome_feedback")
    .select(
      "own_lights_gain,satisfaction,would_happen_without_trade_percent,externality_concern,notes,updated_at",
    )
    .eq("agreement_id", agreementId)
    .eq("profile_id", profileId)
    .maybeSingle();
  const feedback = result.error ? null : (result.data as FeedbackRow | null);

  return (
    <article className="panel data-card data-card-wide" aria-labelledby="outcome-feedback-heading">
      <p className="detail-kicker">Private outcome feedback</p>
      <h3 id="outcome-feedback-heading">
        Did this completed trade improve matters by your lights?
      </h3>
      <p className="route-text">
        Each participant reports separately. Moral Trade does not collapse different moral views into one
        platform utility score. These answers train acceptance, completion, satisfaction, and additionality
        estimates only after minimum-data and calibration gates pass.
      </p>

      <form action={submitRecommendationOutcomeFeedbackAction} className="stack-form">
        <input name="agreement_id" type="hidden" value={agreementId} />
        <div className="field-grid">
          <label className="field">
            <span>Gain by your own lights</span>
            <select defaultValue={String(feedback?.own_lights_gain ?? 3)} name="own_lights_gain" required>
              <option value="1">1 — clearly worse than no trade</option>
              <option value="2">2 — somewhat worse</option>
              <option value="3">3 — roughly neutral or uncertain</option>
              <option value="4">4 — meaningfully better</option>
              <option value="5">5 — much better</option>
            </select>
          </label>
          <label className="field">
            <span>Overall satisfaction</span>
            <select defaultValue={String(feedback?.satisfaction ?? 3)} name="satisfaction" required>
              <option value="1">1 — very dissatisfied</option>
              <option value="2">2 — dissatisfied</option>
              <option value="3">3 — neutral or uncertain</option>
              <option value="4">4 — satisfied</option>
              <option value="5">5 — very satisfied</option>
            </select>
          </label>
          <label className="field">
            <span>Chance this outcome would have happened without the trade</span>
            <input
              defaultValue={feedback?.would_happen_without_trade_percent ?? 50}
              max={100}
              min={0}
              name="would_happen_without_trade_percent"
              required
              step={1}
              type="number"
            />
            <small>0% means fully additional; 100% means it would have happened anyway.</small>
          </label>
          <label className="field">
            <span>Concern about harms or negative externalities</span>
            <select
              defaultValue={feedback?.externality_concern ?? "none"}
              name="externality_concern"
              required
            >
              <option value="none">None observed</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>Optional private note</span>
          <textarea
            defaultValue={feedback?.notes ?? ""}
            maxLength={2_000}
            name="notes"
            placeholder="What made the agreement work or fail? Do not include unrelated sensitive information."
            rows={3}
          />
        </label>
        <p className="panel-note">
          This record is visible only to you and the server-side learning system. It is not published on the
          evidence page and does not alter the frozen agreement terms.
        </p>
        <PendingSubmitButton pendingLabel="Saving private feedback...">
          {feedback ? "Update outcome feedback" : "Save outcome feedback"}
        </PendingSubmitButton>
      </form>
    </article>
  );
}
