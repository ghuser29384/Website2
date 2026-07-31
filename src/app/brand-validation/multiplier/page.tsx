import type { Metadata } from "next";
import Image from "next/image";

import styles from "./multiplier-validation.module.css";

export const metadata: Metadata = {
  title: "Multiplier identity validation",
  description: "A non-production application-validation route for Candidate E2.",
  robots: {
    index: false,
    follow: false,
  },
};

const BRAND_ROOT = "/brand-validation/multiplier";

const principles = [
  {
    index: "01",
    title: "Distinctness",
    body: "Each module remains separate. Participants do not merge into one worldview.",
  },
  {
    index: "02",
    title: "Coordination",
    body: "The modules adopt a shared structure around one reviewable agreement.",
  },
  {
    index: "03",
    title: "Amplification",
    body: "Repeated inputs create a larger stable field and a measurable multiplier.",
  },
] as const;

const opticalMasters = [
  { label: "32 px and above", file: "field-full.svg", size: 90 },
  { label: "24-31 px", file: "field-small.svg", size: 62 },
  { label: "16-23 px", file: "field-micro.svg", size: 44 },
] as const;

const motionFrames = [
  { label: "Unit", modules: 1 },
  { label: "Pair", modules: 2 },
  { label: "Four", modules: 4 },
  { label: "Eight", modules: 8 },
  { label: "Lock", modules: 8 },
  { label: "Core", modules: 8 },
] as const;

function FieldConstruction({ modules }: { modules: number }) {
  const visible = Array.from({ length: 8 }, (_, index) => index < modules);

  return (
    <span className={styles.constructedField} aria-hidden="true">
      {visible.map((isVisible, index) => (
        <span
          className={`${styles.constructedModule} ${isVisible ? styles.isVisible : ""}`}
          data-index={index + 1}
          key={index}
        />
      ))}
    </span>
  );
}

export default function MultiplierValidationPage() {
  return (
    <div className={styles.page}>
      <div className={styles.validationStrip}>
        <strong>Brand validation alpha</strong>
        <span>Non-production identity test - no public rename or product claim.</span>
        <span>Candidate E2 / Field Matrix Core</span>
      </div>

      <header className={styles.topbar}>
        <Image
          alt="Multiplier"
          height={54}
          priority
          src={`${BRAND_ROOT}/lockup-light.svg`}
          width={224}
        />
        <nav aria-label="Validation preview navigation" className={styles.nav}>
          <span>Feed</span>
          <span className={styles.active}>Discover</span>
          <span>Create</span>
          <span>Commitments</span>
          <span>Evidence</span>
        </nav>
        <span className={styles.account}>ES</span>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>
              Turn difference into <em>leverage.</em>
            </h1>
            <p>
              A protected application test for an identity intended to represent distinct
              participants, coordinated commitments, and amplified shared results.
            </p>
            <div className={styles.actions}>
              <span className={styles.primaryAction}>Explore opportunities</span>
              <span className={styles.secondaryAction}>Inspect validation evidence</span>
            </div>
          </div>
          <aside className={styles.heroPanel}>
            <Image
              alt=""
              aria-hidden="true"
              height={104}
              src={`${BRAND_ROOT}/field-full.svg`}
              width={104}
            />
            <h2>Different inputs. One reviewable agreement.</h2>
            <dl>
              <div><dt>Baseline</dt><dd>What happens without the deal</dd></div>
              <div><dt>Exposure</dt><dd>The maximum cost or obligation</dd></div>
              <div><dt>Evidence</dt><dd>What a reviewer can inspect</dd></div>
              <div><dt>Exit</dt><dd>How future obligations end</dd></div>
            </dl>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="logic-heading">
          <header className={styles.sectionHeader}>
            <div>
              <span>Identity logic</span>
              <h2 id="logic-heading">The concept must survive real product context.</h2>
            </div>
            <p>
              The mark is a brand layer. It must not replace concrete terms, ranking logic,
              authorization states, or safety language.
            </p>
          </header>
          <div className={styles.principleGrid}>
            {principles.map((principle) => (
              <article key={principle.index}>
                <span>{principle.index}</span>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.productSection}`} aria-labelledby="create-heading">
          <header className={styles.sectionHeader}>
            <div>
              <span>Create</span>
              <h2 id="create-heading">Brand identity stays separate from transaction semantics.</h2>
            </div>
            <p>
              Action Blue remains the primary interactive color. Signal Vermilion identifies the
              brand and selected display moments rather than every button.
            </p>
          </header>
          <div className={styles.createGrid}>
            <article className={styles.createPanel}>
              <h3>Create a trade, Donation Upgrade, or public-goods pool.</h3>
              <p>
                Choose what you can offer, then keep the baseline, maximum exposure, evidence,
                deadline, and exit rule visible before anyone relies on the record.
              </p>
              <div className={styles.resourceGrid}>
                <span>Commitment</span><span>Skill</span><span className={styles.selected}>Fund</span>
              </div>
              <div className={styles.modeGrid}>
                <span>Pledge swap</span><span>Donation redirect</span><span className={styles.actionSelected}>Donation Upgrade</span><span>Co-Fund</span>
              </div>
            </article>
            <article className={styles.receiptPanel}>
              <span className={styles.state}>Reviewable draft</span>
              <div className={styles.receiptRow}><b>Without this deal</b><span>$10 to a local charity</span></div>
              <div className={styles.receiptRow}><b>I authorize</b><span>$10 to an approved high-impact destination if another participant adds $10</span></div>
              <div className={styles.receiptRow}><b>Maximum exposure</b><span>$10 - never increased by the match</span></div>
              <div className={styles.multiplier}>2x</div>
              <span className={styles.primaryAction}>Continue to authorization review</span>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="discover-heading">
          <header className={styles.sectionHeader}>
            <div>
              <span>Discover</span>
              <h2 id="discover-heading">One glance shows both sides of an exchange.</h2>
            </div>
            <p>
              The identity must not obscure what a participant offers, receives, triggers, or
              proves.
            </p>
          </header>
          <div className={styles.exchangeGrid}>
            <article className={styles.exchangeCard}>
              <div className={styles.exchangeHead}><span>Pledge swap</span><b>86% fit</b></div>
              <h3>Replace car trips for clinic outreach.</h3>
              <div className={styles.exchangeTerms}>
                <div><small>You offer</small><p>Replace eight car trips with transit before 31 August.</p></div>
                <span aria-hidden="true">↔</span>
                <div><small>You receive</small><p>Mina contributes $20 to a reviewed vaccination outreach effort.</p></div>
              </div>
            </article>
            <article className={styles.exchangeCard}>
              <div className={styles.exchangeHead}><span>Skill exchange</span><b>79% fit</b></div>
              <h3>Research review for implementation help.</h3>
              <div className={styles.exchangeTerms}>
                <div><small>You offer</small><p>Review a 2,000-word animal-welfare research brief within ten days.</p></div>
                <span aria-hidden="true">↔</span>
                <div><small>You receive</small><p>Five hours of TypeScript implementation on an AI-safety project.</p></div>
              </div>
            </article>
          </div>
          <article className={styles.poolCard}>
            <div>
              <span>Threshold pool / global health</span>
              <h3>Fund only if enough verified people join.</h3>
              <p>Principal routes only after amount, supporter, destination, review, and deadline gates pass.</p>
            </div>
            <div>
              <strong>8.4x</strong>
              <p>Expected additional funding caused per dollar of this tested pledge.</p>
              <span className={styles.progress}><i /></span>
            </div>
          </article>
        </section>

        <section className={`${styles.section} ${styles.controlSection}`} aria-labelledby="controls-heading">
          <header className={styles.sectionHeader}>
            <div>
              <span>Control confusion</span>
              <h2 id="controls-heading">The complete mark is not an interface control.</h2>
            </div>
            <p>
              Close and destructive controls retain explicit containers, semantic icons, and
              conventional states. The central core is never extracted.
            </p>
          </header>
          <div className={styles.controlGrid}>
            <article className={styles.lightControlPanel}>
              <h3>Light interface</h3>
              <div className={styles.controlRow}>
                <span className={styles.brandSample}><Image alt="" height={42} src={`${BRAND_ROOT}/field-full.svg`} width={42}/><span><b>Multiplier</b><small>Static brand mark</small></span></span>
                <span>Not interactive</span>
              </div>
              <div className={styles.controlRow}><span><b>Close panel</b><small>Contained neutral control</small></span><button aria-label="Close panel" type="button">x</button></div>
              <div className={styles.controlRow}><span><b>Remove obligation</b><small>Danger copy and semantic icon</small></span><button className={styles.dangerButton} aria-label="Remove obligation" type="button">Delete</button></div>
              <p className={styles.passNote}>Pass: the mark remains a multipart square object while controls have explicit affordances.</p>
            </article>
            <article className={styles.darkControlPanel}>
              <h3>Dark interface</h3>
              <div className={styles.controlRow}>
                <span className={styles.brandSample}><Image alt="" height={42} src={`${BRAND_ROOT}/field-full.svg`} width={42}/><span><b>Multiplier</b><small>Static brand mark</small></span></span>
                <span>Not interactive</span>
              </div>
              <div className={styles.controlRow}><span><b>Close modal</b><small>Contained neutral control</small></span><button aria-label="Close modal" type="button">x</button></div>
              <div className={styles.controlRow}><span><b>Delete draft</b><small>Semantic text required</small></span><button className={styles.dangerButton} aria-label="Delete draft" type="button">Delete</button></div>
              <p className={styles.riskNote}>Residual risk: below 24 px the core becomes more prominent. Never use it alone.</p>
            </article>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="responsive-heading">
          <header className={styles.sectionHeader}>
            <div>
              <span>Responsive identity</span>
              <h2 id="responsive-heading">Use optical masters, not automatic downscaling.</h2>
            </div>
            <p>
              Signal Vermilion on light backgrounds is reserved for the mark and large display
              moments. Normal text remains Near Black.
            </p>
          </header>
          <div className={styles.identityGrid}>
            <article className={styles.lightLockup}>
              <small>Primary light lockup</small>
              <Image alt="Multiplier" height={90} src={`${BRAND_ROOT}/lockup-light.svg`} width={380}/>
            </article>
            <article className={styles.darkLockup}>
              <small>Primary dark lockup</small>
              <Image alt="Multiplier" height={90} src={`${BRAND_ROOT}/lockup-dark.svg`} width={380}/>
            </article>
            <article className={styles.opticalPanel}>
              <small>Full / small / micro</small>
              <div>
                {opticalMasters.map((master) => (
                  <span key={master.file}>
                    <Image alt="" height={master.size} src={`${BRAND_ROOT}/${master.file}`} width={master.size}/>
                    <b>{master.label}</b>
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className={`${styles.section} ${styles.motionSection}`} aria-labelledby="motion-heading">
          <header className={styles.sectionHeaderDark}>
            <div>
              <span>Motion</span>
              <h2 id="motion-heading">One - two - four - eight - field.</h2>
            </div>
            <p>
              A finite formal operation. No spinning, bouncing, particles, glow, or explosion.
            </p>
          </header>
          <div className={styles.motionGrid}>
            {motionFrames.map((frame) => (
              <article key={frame.label}>
                <small>{frame.label}</small>
                <FieldConstruction modules={frame.modules} />
              </article>
            ))}
          </div>
        </section>

        <section className={styles.decision} aria-labelledby="decision-heading">
          <div>
            <span>Gate decision</span>
            <h2 id="decision-heading">Visual identity: testable. Public name: not cleared.</h2>
            <p>
              Candidate E2 passes the internal application gate with strict usage constraints.
              This route does not authorize a public rebrand, domain migration, or production
              metadata change.
            </p>
          </div>
          <dl>
            <div><dt>Geometry</dt><dd>Pass</dd></div>
            <div><dt>Application</dt><dd>Pass with rules</dd></div>
            <div><dt>Control confusion</dt><dd>Residual risk</dd></div>
            <div><dt>Name clearance</dt><dd>Hold</dd></div>
            <div><dt>Production</dt><dd>No change</dd></div>
          </dl>
        </section>
      </main>

      <footer className={styles.footer}>
        <Image alt="Multiplier" height={42} src={`${BRAND_ROOT}/lockup-light.svg`} width={176}/>
        <span>Identity Alpha 0.9 / Non-production validation route</span>
      </footer>
    </div>
  );
}
