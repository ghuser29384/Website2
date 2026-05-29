import type { Metadata } from "next";
import Link from "next/link";

import { updatePasswordAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getSafeInternalPath } from "@/lib/paths";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Choose New Password",
  description: "Choose a new password after confirming your Moral Trade password reset link.",
  robots: {
    index: false,
    follow: false,
  },
};

interface PasswordUpdatePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PasswordUpdatePage({ searchParams }: PasswordUpdatePageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const formMessage = getFormMessage(resolvedSearchParams);
  const requestedReturnTo = Array.isArray(resolvedSearchParams.returnTo)
    ? resolvedSearchParams.returnTo[0]
    : resolvedSearchParams.returnTo;
  const returnTo = getSafeInternalPath(requestedReturnTo, "/dashboard");
  const resetHref =
    returnTo === "/dashboard"
      ? "/password-reset"
      : `/password-reset?returnTo=${encodeURIComponent(returnTo)}`;
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
        <h1>Choose a new password.</h1>
        <p>
          This page is for users arriving from a password reset email. Use at least 12 characters,
          then sign in again with the updated credential.
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
          <form action={updatePasswordAction} className="stack-form">
            <input name="return_to" type="hidden" value={returnTo} />
            <label className="field">
              <span>New password</span>
              <input name="password" placeholder="At least 12 characters" type="password" />
            </label>
            <label className="field">
              <span>Confirm password</span>
              <input name="confirm_password" placeholder="Repeat password" type="password" />
            </label>
            <div className="form-actions">
              <button className="button button-primary" type="submit">
                Update password
              </button>
              <Link className="button button-secondary" href={resetHref}>
                Request new link
              </Link>
            </div>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
