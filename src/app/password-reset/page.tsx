import type { Metadata } from "next";
import Link from "next/link";

import { requestPasswordResetAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getSafeInternalPath } from "@/lib/paths";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a password reset email for your Moral Trade account.",
  robots: {
    index: false,
    follow: false,
  },
};

interface PasswordResetPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PasswordResetPage({ searchParams }: PasswordResetPageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const formMessage = getFormMessage(resolvedSearchParams);
  const requestedReturnTo = Array.isArray(resolvedSearchParams.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams.returnTo;
  const returnTo = getSafeInternalPath(requestedReturnTo, "/dashboard");
  const supabaseReady = hasSupabaseEnv();

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Account access</p>
        <h1>Reset your password.</h1>
        <p>
          Enter your account email and Moral Trade will send a reset link. The response does not
          reveal whether the address already has an account.
        </p>

        <section className="panel data-card data-card-wide">
          {!supabaseReady ? (
            <div className="status-banner status-banner-error">
              Supabase is not configured yet. Email support@moraltrade.org for account help.
            </div>
          ) : null}
          {formMessage ? (
            <div
              className={`status-banner ${
                formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
              }`}
            >
              {formMessage.text}
            </div>
          ) : null}
          <form action={requestPasswordResetAction} className="stack-form">
            <input name="return_to" type="hidden" value={returnTo} />
            <label className="field">
              <span>Email</span>
              <input name="email" placeholder="you@example.com" type="email" />
            </label>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Send reset link
              </button>
              <Link className="button button-secondary" href="/login">
                Back to login
              </Link>
            </div>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
