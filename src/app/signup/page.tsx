import type { Metadata } from "next";
import Link from "next/link";

import { signUpAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign up",
};

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const supabaseReady = hasSupabaseEnv();
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Account setup</p>
            <h1>Create your Moral Trade account.</h1>
            <p className="hero-text">
              Sign up with email and password so you can publish structured offers, express
              interest in public commitments, and manage your dashboard.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/login">
                Already have an account?
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Why accounts matter</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Create durable offers</strong>
                  <p>Offers can move beyond browser-local prototypes into a real shared board.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Track interest</strong>
                  <p>People can express interest in your offer and keep the exchange visible.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Manage commitments</strong>
                  <p>Your dashboard becomes the home for offers, interests, and future agreements.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <section className="section section-white">
          <div className="auth-grid">
            <article className="panel auth-card">
              <div className="section-head auth-head">
                <p className="eyebrow">Email and password</p>
                <h2>Sign up</h2>
                <p>Keep the first step minimal. You can expand profile details later.</p>
              </div>

              {!supabaseReady ? (
                <div className="status-banner status-banner-error">
                  Supabase is not configured yet. Add the required environment variables before
                  using live auth.
                </div>
              ) : null}

              {formMessage ? (
                <div
                  className={`status-banner ${
                    formMessage.tone === "error"
                      ? "status-banner-error"
                      : "status-banner-success"
                  }`}
                >
                  {formMessage.text}
                </div>
              ) : null}

              <form action={signUpAction} className="stack-form">
                <label className="field">
                  <span>Display name</span>
                  <input name="display_name" placeholder="e.g. Victoria" type="text" />
                </label>

                <label className="field">
                  <span>Email</span>
                  <input name="email" placeholder="you@example.com" type="email" />
                </label>

                <div className="field-grid">
                  <label className="field">
                    <span>City</span>
                    <input name="city" placeholder="e.g. Boston" type="text" />
                  </label>

                  <label className="field">
                    <span>Region</span>
                    <input name="region" placeholder="e.g. Massachusetts" type="text" />
                  </label>
                </div>

                <label className="field">
                  <span>Password</span>
                  <input name="password" placeholder="Create a password" type="password" />
                </label>

                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Create account
                  </button>
                  <Link className="button button-secondary" href="/login">
                    Go to login
                  </Link>
                </div>
              </form>
            </article>

            <article className="panel auth-side-card">
              <p className="eyebrow">What happens next</p>
              <div className="clean-stack">
                <div>
                  <h3>Confirm your email</h3>
                  <p>
                    Supabase can require email confirmation before the account is fully active.
                  </p>
                </div>
                <div>
                  <h3>Create your first offer</h3>
                  <p>Once signed in, head to the new offer route and publish a live offer.</p>
                </div>
                <div>
                  <h3>Review interest on the dashboard</h3>
                  <p>Your dashboard will show your offers plus the interest you expressed.</p>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
