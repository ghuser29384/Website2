import type { Metadata } from "next";
import Link from "next/link";

import { signInAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { PRIMARY_NAV_LINKS } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Login",
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const next =
    (Array.isArray(resolvedSearchParams.next)
      ? resolvedSearchParams.next[0]
      : resolvedSearchParams.next) || "/dashboard";
  const supabaseReady = hasSupabaseEnv();
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={PRIMARY_NAV_LINKS.map((link) => ({ ...link }))}
          authLink={
            viewer
              ? { href: "/dashboard", label: "Dashboard" }
              : { href: "/login", label: "Log in" }
          }
          primaryAction={
            viewer
              ? { href: "/offers", label: "Browse offers" }
              : { href: "/signup", label: "Sign up" }
          }
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Account access</p>
            <h1>Log in to Moral Trade.</h1>
            <p className="hero-text">
              Sign in with email and password to publish public offers, respond to structured
              commitments, and review your dashboard.
            </p>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Member actions</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Publish public offers</strong>
                  <p>Move from browser-local experimentation into real stored offers.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Express interest</strong>
                  <p>Register interest in a live offer and leave a short message.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Review your activity</strong>
                  <p>See your own offers and interests in one place.</p>
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
                <h2>Login</h2>
                <p>Use the same credentials you created during signup.</p>
              </div>

              {!supabaseReady ? (
                <div className="status-banner status-banner-error">
                  Supabase is not configured yet. Add the environment variables before using
                  live auth.
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

              <form action={signInAction} className="stack-form">
                <input name="next" type="hidden" value={next} />

                <label className="field">
                  <span>Email</span>
                  <input name="email" placeholder="you@example.com" type="email" />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input name="password" placeholder="Your password" type="password" />
                </label>

                <div className="form-actions">
                  <button className="button button-primary" type="submit">
                    Log in
                  </button>
                  <Link className="button button-secondary" href="/signup">
                    Create account
                  </Link>
                </div>
              </form>
            </article>

            <article className="panel auth-side-card">
              <p className="eyebrow">What unlocks after login</p>
              <div className="clean-stack">
                <div>
                  <h3>Create offers</h3>
                  <p>Publish a real offer at `/offers/new` instead of keeping it only local.</p>
                </div>
                <div>
                  <h3>Track interest</h3>
                  <p>Your dashboard lists the offers you own and the offers you engaged with.</p>
                </div>
                <div>
                  <h3>Prepare for agreements</h3>
                  <p>The data model already includes agreements, ready for a future workflow.</p>
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
