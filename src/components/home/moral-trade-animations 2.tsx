export function MoralTradeAnimations() {
  return (
    <section className="section section-white" id="animations">
      <div className="section-head">
        <p className="eyebrow">Intuitive illustrations</p>
        <h2>See what moral trade is doing</h2>
        <p>
          These diagrams show three recurring structures from Ord&apos;s paper and the Forethought
          essays: reciprocal action, redirection away from cancellation, and shared moral public
          goods.
        </p>
      </div>

      <div className="animation-grid">
        <article className="panel animation-card">
          <div aria-hidden="true" className="animation-frame animation-frame-swap">
            <div className="animation-person animation-person-left">
              <span className="animation-person-name">A</span>
              <span className="animation-person-view">Cares most about poverty</span>
              <div className="animation-meter">
                <span className="animation-meter-fill animation-meter-fill-swap-left" />
              </div>
            </div>

            <div className="animation-person animation-person-right">
              <span className="animation-person-name">B</span>
              <span className="animation-person-view">Cares most about animals</span>
              <div className="animation-meter">
                <span className="animation-meter-fill animation-meter-fill-swap-right" />
              </div>
            </div>

            <div className="animation-cause animation-cause-top">Animal welfare</div>
            <div className="animation-cause animation-cause-bottom">Global poverty</div>

            <div className="animation-line animation-line-swap-left" />
            <div className="animation-line animation-line-swap-right" />
            <span className="animation-token animation-token-swap-left" />
            <span className="animation-token animation-token-swap-right" />
          </div>

          <p className="detail-kicker">Pledge swap</p>
          <h3>Each side can do what the other values more</h3>
          <p>
            One person takes the act that matters most to the other side, and vice versa. If each
            action is cheaper for the actor than it is valuable on the other view, both sides can
            judge the resulting world better than acting alone.
          </p>
        </article>

        <article className="panel animation-card">
          <div aria-hidden="true" className="animation-frame animation-frame-offset">
            <div className="animation-offset-row animation-offset-row-conflict">
              <div className="animation-cause animation-offset-cause-left">Opposed campaign A</div>
              <div className="animation-cancel-mark">cancel</div>
              <div className="animation-cause animation-offset-cause-right">Opposed campaign B</div>
              <span className="animation-token animation-token-conflict-left" />
              <span className="animation-token animation-token-conflict-right" />
            </div>

            <div className="animation-offset-row animation-offset-row-compromise">
              <div className="animation-offset-label">redirect instead</div>
              <div className="animation-cause animation-offset-cause-center">
                <span>Compromise cause</span>
                <span className="animation-compromise-fill" />
              </div>
              <div className="animation-offset-meters">
                <div className="animation-meter">
                  <span className="animation-meter-fill animation-meter-fill-offset-left" />
                </div>
                <div className="animation-meter">
                  <span className="animation-meter-fill animation-meter-fill-offset-right" />
                </div>
              </div>
              <span className="animation-token animation-token-offset-left" />
              <span className="animation-token animation-token-offset-right" />
            </div>
          </div>

          <p className="detail-kicker">Donation offset</p>
          <h3>Redirection can beat cancellation</h3>
          <p>
            If opposed efforts would mostly cancel out, both sides can redirect the same resources
            into a compromise destination. The point is not agreement about the best cause, but a
            move away from mutual negation.
          </p>
        </article>

        <article className="panel animation-card">
          <div aria-hidden="true" className="animation-frame animation-frame-public-good">
            <div className="animation-crowd-row">
              <span className="animation-crowd-dot animation-crowd-dot-1" />
              <span className="animation-crowd-dot animation-crowd-dot-2" />
              <span className="animation-crowd-dot animation-crowd-dot-3" />
              <span className="animation-crowd-dot animation-crowd-dot-4" />
              <span className="animation-crowd-dot animation-crowd-dot-5" />
            </div>

            <div className="animation-public-box">
              <span className="animation-public-label">Shared moral public good</span>
              <span className="animation-public-fill" />
            </div>

            <div className="animation-public-caption">Many people each care a little</div>
            <span className="animation-token animation-token-public-1" />
            <span className="animation-token animation-token-public-2" />
            <span className="animation-token animation-token-public-3" />
            <span className="animation-token animation-token-public-4" />
            <span className="animation-token animation-token-public-5" />
          </div>

          <p className="detail-kicker">Moral public goods</p>
          <h3>Many weakly shared values can add up</h3>
          <p>
            A future can contain goods that many views each value somewhat. When many small gains
            point in the same direction, coordination around a shared moral public good can produce
            more total value than a collection of isolated, idiosyncratic projects.
          </p>
        </article>
      </div>
    </section>
  );
}
