import Link from "next/link";

import { oauthSignInAction, signInAction, signUpAction } from "@/app/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  buildAuthPath,
  getEnabledOAuthProviders,
  getOAuthProviderLabel,
  getAuthReturnTo,
  normalizeAuthMethod,
  normalizeAuthMode,
  type AuthMode,
  type OAuthProvider,
} from "@/lib/auth-routes";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type SearchParams = Record<string, string | string[] | undefined>;

const providerCopy: Record<OAuthProvider, { label: string; pending: string }> = {
  apple: {
    label: "Continue with Apple",
    pending: "Opening Apple...",
  },
  google: {
    label: "Continue with Google",
    pending: "Opening Google...",
  },
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="auth-provider-icon" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.72-.06-1.25-.18-1.8h-9.2v3.52h5.4c-.11.88-.7 2.2-2.02 3.09l-.02.12 2.93 2.2.2.02c1.86-1.68 2.9-4.15 2.9-7.15Z"
        fill="#4285F4"
      />
      <path
        d="M12.22 21.55c2.66 0 4.9-.86 6.53-2.35l-3.11-2.35c-.83.57-1.95.96-3.42.96-2.6 0-4.8-1.68-5.59-4l-.11.01-3.05 2.3-.04.11a9.84 9.84 0 0 0 8.79 5.32Z"
        fill="#34A853"
      />
      <path
        d="M6.63 13.8a5.9 5.9 0 0 1-.32-1.9c0-.66.12-1.3.31-1.9l-.01-.13-3.1-2.34-.1.05a9.5 9.5 0 0 0-1.05 4.32c0 1.55.38 3.01 1.05 4.32l3.22-2.42Z"
        fill="#FBBC05"
      />
      <path
        d="M12.22 5.99c1.85 0 3.1.78 3.8 1.44l2.78-2.65a9.6 9.6 0 0 0-6.58-2.5 9.84 9.84 0 0 0-8.8 5.3L6.62 10c.8-2.32 3-4.01 5.6-4.01Z"
        fill="#EB4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" className="auth-provider-icon" viewBox="0 0 24 24">
      <path
        d="M16.55 12.78c-.02-2.17 1.78-3.22 1.86-3.27-1.02-1.49-2.6-1.69-3.15-1.71-1.34-.14-2.62.78-3.3.78-.68 0-1.72-.76-2.84-.74-1.46.02-2.82.85-3.57 2.15-1.52 2.64-.39 6.54 1.1 8.68.72 1.04 1.59 2.21 2.72 2.17 1.09-.04 1.5-.7 2.82-.7 1.31 0 1.69.7 2.84.68 1.17-.02 1.92-1.06 2.64-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.29-.88-2.31-3.49Zm-2.16-6.4c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.55 1.3-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  return provider === "google" ? <GoogleIcon /> : <AppleIcon />;
}

function ProviderButton({
  mode,
  provider,
  returnTo,
}: {
  mode: AuthMode;
  provider: OAuthProvider;
  returnTo: string;
}) {
  const copy = providerCopy[provider];

  return (
    <form action={oauthSignInAction}>
      <input name="provider" type="hidden" value={provider} />
      <input name="mode" type="hidden" value={mode} />
      <input name="return_to" type="hidden" value={returnTo} />
      <AuthSubmitButton className="auth-provider-button" pendingLabel={copy.pending}>
        <ProviderIcon provider={provider} />
        <span>{copy.label}</span>
      </AuthSubmitButton>
    </form>
  );
}

export function AuthPage({
  initialMode,
  isAuthenticated,
  searchParams,
}: {
  initialMode: AuthMode;
  isAuthenticated: boolean;
  searchParams: SearchParams;
}) {
  const mode = normalizeAuthMode(
    Array.isArray(searchParams.mode) ? searchParams.mode[0] : searchParams.mode,
    initialMode,
  );
  const method = normalizeAuthMethod(
    Array.isArray(searchParams.method) ? searchParams.method[0] : searchParams.method,
  );
  const returnTo = getAuthReturnTo(searchParams, mode);
  const formMessage = getFormMessage(searchParams);
  const supabaseReady = hasSupabaseEnv();
  const enabledOAuthProviders = getEnabledOAuthProviders();
  const hasSocialProviders = enabledOAuthProviders.length > 0;
  const providerOptionLabel = enabledOAuthProviders.map(getOAuthProviderLabel).join(", ");
  const isSignup = mode === "signup";
  const authPath = buildAuthPath({ mode, returnTo, route: isSignup ? "/signup" : "/login" });
  const loginHref = buildAuthPath({ mode: "login", returnTo, route: "/login" });
  const signupHref = buildAuthPath({ mode: "signup", returnTo, route: "/signup" });
  const emailHref = buildAuthPath({
    method: "email",
    mode,
    returnTo,
    route: isSignup ? "/signup" : "/login",
  });
  const providersHref = buildAuthPath({
    mode,
    returnTo,
    route: isSignup ? "/signup" : "/login",
  });
  const resetHref =
    returnTo === "/dashboard"
      ? "/password-reset"
      : `/password-reset?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="page-shell auth-page-shell">
      <header className="simple-header auth-page-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="auth-page-main" id="main-content" tabIndex={-1}>
        <section className="auth-card-shell" aria-labelledby="auth-heading">
          <article className="auth-unified-card">
            <div className="auth-mode-tabs" aria-label="Authentication mode">
              <Link
                aria-current={!isSignup ? "page" : undefined}
                className={!isSignup ? "is-active" : undefined}
                href={loginHref}
              >
                Log in
              </Link>
              <Link
                aria-current={isSignup ? "page" : undefined}
                className={isSignup ? "is-active" : undefined}
                href={signupHref}
              >
                Create account
              </Link>
            </div>

            <div className="auth-card-head">
              <h1 id="auth-heading">
                {isSignup ? "Create your Moral Trade account" : "Log in to Moral Trade"}
              </h1>
              <p>
                {isSignup
                  ? "Start with one low-risk action. You can add profile details later."
                  : "Access offers, private matches, and account settings."}
              </p>
            </div>

            {!supabaseReady ? (
              <div className="status-banner status-banner-error" role="alert">
                Supabase is not configured yet. Add the environment variables before using live
                auth.
              </div>
            ) : null}

            {formMessage ? (
              <div
                aria-live={formMessage.tone === "error" ? "assertive" : "polite"}
                className={`status-banner ${
                  formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
                }`}
                role={formMessage.tone === "error" ? "alert" : "status"}
              >
                {formMessage.text}
              </div>
            ) : null}

            <div className="auth-provider-stack" aria-label="Sign in options">
              {enabledOAuthProviders.map((provider) => (
                <ProviderButton
                  key={provider}
                  mode={mode}
                  provider={provider}
                  returnTo={returnTo}
                />
              ))}
              <Link className="auth-provider-button auth-email-reveal" href={emailHref}>
                <span className="auth-provider-icon auth-provider-icon-mail" aria-hidden="true">
                  @
                </span>
                <span>Continue with Email</span>
              </Link>
            </div>

            {method === "email" ? (
              <div className="auth-email-panel" id="email-auth">
                <div className="auth-divider">
                  <span>Email</span>
                </div>
                <form action={isSignup ? signUpAction : signInAction} className="stack-form">
                  <input name={isSignup ? "return_to" : "next"} type="hidden" value={returnTo} />

                  <label className="field">
                    <span>Email</span>
                    <input
                      autoComplete="email"
                      name="email"
                      placeholder="you@example.com"
                      required
                      type="email"
                    />
                  </label>

                  <label className="field">
                    <span>Password</span>
                    <input
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      minLength={isSignup ? 8 : undefined}
                      name="password"
                      placeholder={isSignup ? "At least 8 characters" : "Your password"}
                      required
                      type="password"
                    />
                  </label>

                  {!isSignup ? (
                    <p className="auth-recovery-link">
                      <Link href={resetHref}>Forgot password?</Link>
                    </p>
                  ) : null}

                  <AuthSubmitButton
                    className="button button-primary auth-submit-button"
                    pendingLabel={isSignup ? "Creating account..." : "Logging in..."}
                  >
                    {isSignup ? "Create account with Email" : "Log in with Email"}
                  </AuthSubmitButton>
                </form>
              </div>
            ) : (
              <p className="auth-email-note">
                {hasSocialProviders
                  ? "Prefer email and password? Use Continue with Email."
                  : "Email and password sign-in is available for this deployment."}
              </p>
            )}

            {isSignup ? (
              <p className="auth-legal">
                By creating an account, you agree to the{" "}
                <Link href="/terms">Terms of Service</Link> and{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </p>
            ) : null}

            <p className="auth-secondary-link">
              {isSignup ? "Already have an account? " : "New to Moral Trade? "}
              <Link href={isSignup ? loginHref : signupHref}>
                {isSignup ? "Log in" : "Create an account"}
              </Link>
            </p>

            {method === "email" ? (
              <p className="auth-provider-back">
                <Link href={providersHref}>
                  {hasSocialProviders
                    ? `Back to ${providerOptionLabel} and email options`
                    : "Back to sign-in options"}
                </Link>
              </p>
            ) : null}

            <span hidden data-auth-mode={mode} data-auth-path={authPath} />
          </article>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
