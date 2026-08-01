import Link from "next/link";

import { oauthSignInAction, signInAction, signUpAction } from "@/app/actions";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  buildAuthPath,
  getOAuthProviderLabel,
  getAuthReturnTo,
  normalizeAuthMethod,
  normalizeAuthMode,
  type AuthMode,
  type OAuthProvider,
} from "@/lib/auth-routes";
import { getEnabledOAuthProviders } from "@/lib/auth-provider-settings";
import { getFormMessage } from "@/lib/form-state";
import { getOnePersonAccountConfig } from "@/lib/identity/one-person-account";
import { hasSupabaseEnv } from "@/lib/supabase/config";

import styles from "./auth-card.module.css";

type SearchParams = Record<string, string | string[] | undefined>;

const featuredProviderSet = new Set<OAuthProvider>(["google", "apple", "github"]);

const providerMonograms: Record<OAuthProvider, string> = {
  apple: "A",
  azure: "M",
  bitbucket: "B",
  discord: "D",
  facebook: "f",
  figma: "F",
  fly: "F",
  github: "GH",
  gitlab: "GL",
  google: "G",
  kakao: "K",
  keycloak: "K",
  linkedin: "in",
  linkedin_oidc: "in",
  notion: "N",
  slack: "S",
  slack_oidc: "S",
  spotify: "S",
  twitch: "T",
  twitter: "T",
  workos: "W",
  x: "X",
  zoom: "Z",
};

function getProviderCopy(provider: OAuthProvider) {
  const providerLabel = getOAuthProviderLabel(provider);
  return {
    label: `Continue with ${providerLabel}`,
    pending: `Opening ${providerLabel}...`,
  };
}

function BrandMark() {
  return (
    <span className={styles.brandMark} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M3 17.5h7.5v-11H21" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="3" cy="17.5" r="2" fill="#5be7b7" />
        <circle cx="21" cy="6.5" r="2" fill="#7890ff" />
      </svg>
    </span>
  );
}

function CoordinationGraphic() {
  return (
    <div className={styles.graphicFrame} aria-hidden="true">
      <svg
        className={styles.coordinationGraphic}
        viewBox="0 0 620 360"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id="auth-accent-line"
            x1="64"
            y1="260"
            x2="556"
            y2="88"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#5be7b7" />
            <stop offset="0.48" stopColor="#7890ff" />
            <stop offset="1" stopColor="#c4ceff" />
          </linearGradient>
          <radialGradient id="auth-node-glow">
            <stop stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#7890ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <path
          className={styles.graphicMuted}
          d="M42 286C150 286 180 244 248 210S376 145 572 118"
        />
        <path
          className={styles.graphicMuted}
          d="M42 222C150 222 186 228 248 210S368 188 572 198"
        />
        <path
          className={styles.graphicMuted}
          d="M42 150C148 150 185 177 248 210S376 250 572 272"
        />
        <path
          className={styles.graphicAccent}
          d="M42 286C150 286 180 244 248 210S376 145 572 118"
        />
        <path className={styles.graphicSuccess} d="M248 210C354 156 428 136 572 118" />

        <g fill="none" stroke="rgba(206, 216, 238, 0.18)" strokeWidth="1">
          <circle cx="248" cy="210" r="70" />
          <circle cx="248" cy="210" r="104" />
        </g>

        <circle cx="248" cy="210" r="44" fill="url(#auth-node-glow)" opacity="0.28" />
        <circle cx="248" cy="210" r="8" fill="#ffffff" />
        <circle cx="248" cy="210" r="3.2" fill="#3158ff" />

        <g fill="#d9e1f5" opacity="0.88">
          <circle cx="42" cy="286" r="5" />
          <circle cx="42" cy="222" r="5" />
          <circle cx="42" cy="150" r="5" />
        </g>
        <circle cx="572" cy="118" r="7" fill="#5be7b7" />
        <circle cx="572" cy="198" r="5" fill="#aab7d5" opacity="0.72" />
        <circle cx="572" cy="272" r="5" fill="#aab7d5" opacity="0.48" />

        <g
          fill="rgba(232, 237, 250, 0.58)"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="11"
        >
          <text x="38" y="318">
            different priorities
          </text>
          <text x="221" y="278">
            agreement
          </text>
          <text x="492" y="96">
            mutual gain
          </text>
        </g>
      </svg>
    </div>
  );
}

function EmailIcon() {
  return (
    <svg aria-hidden="true" className={styles.emailIcon} viewBox="0 0 24 24">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m5.5 8 6.5 5 6.5-5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" className={styles.chevron} viewBox="0 0 16 16">
      <path
        d="m4 6 4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
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
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
      <path
        d="M16.55 12.78c-.02-2.17 1.78-3.22 1.86-3.27-1.02-1.49-2.6-1.69-3.15-1.71-1.34-.14-2.62.78-3.3.78-.68 0-1.72-.76-2.84-.74-1.46.02-2.82.85-3.57 2.15-1.52 2.64-.39 6.54 1.1 8.68.72 1.04 1.59 2.21 2.72 2.17 1.09-.04 1.5-.7 2.82-.7 1.31 0 1.69.7 2.84.68 1.17-.02 1.92-1.06 2.64-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.29-.88-2.31-3.49Zm-2.16-6.4c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.55 1.3-.56.65-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
      <path
        d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
      <path
        d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
        fill="currentColor"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
      <path
        d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286ZM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189Zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
        fill="currentColor"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" className={styles.providerIcon} viewBox="0 0 24 24">
      <path
        d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993Zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") return <GoogleIcon />;
  if (provider === "apple") return <AppleIcon />;
  if (provider === "facebook") return <FacebookIcon />;
  if (provider === "github") return <GitHubIcon />;
  if (provider === "discord") return <DiscordIcon />;
  if (provider === "x") return <XIcon />;

  return (
    <span className={`${styles.providerIcon} ${styles.providerMonogram}`} aria-hidden="true">
      {providerMonograms[provider]}
    </span>
  );
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
  const copy = getProviderCopy(provider);

  return (
    <form action={oauthSignInAction} className={styles.providerForm}>
      <input name="provider" type="hidden" value={provider} />
      <input name="mode" type="hidden" value={mode} />
      <input name="return_to" type="hidden" value={returnTo} />
      <AuthSubmitButton className={styles.providerButton} pendingLabel={copy.pending}>
        <ProviderIcon provider={provider} />
        <span>{copy.label}</span>
      </AuthSubmitButton>
    </form>
  );
}

export async function AuthPage({
  initialMode,
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
  const isSignup = mode === "signup";
  const onePersonRegistrationEnforced =
    isSignup && getOnePersonAccountConfig().registrationEnforcementEnabled;
  const enabledOAuthProviders = onePersonRegistrationEnforced
    ? []
    : await getEnabledOAuthProviders();
  const featuredProviders = enabledOAuthProviders.filter((provider) =>
    featuredProviderSet.has(provider),
  );
  const visibleProviders =
    featuredProviders.length > 0 ? featuredProviders : enabledOAuthProviders.slice(0, 3);
  const additionalProviders =
    featuredProviders.length > 0
      ? enabledOAuthProviders.filter((provider) => !featuredProviderSet.has(provider))
      : enabledOAuthProviders.slice(3);
  const hasSocialProviders = enabledOAuthProviders.length > 0;
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
  const heading = isSignup ? "Create your account" : "Welcome back";
  const subtitle =
    method === "email"
      ? isSignup
        ? "Use your email and a password to create your Moral Trade account."
        : "Enter your email and password to continue."
      : isSignup
        ? onePersonRegistrationEnforced
          ? "Your private uniqueness check is complete. Create the one account attached to it."
          : "Choose a secure sign-in method. You can complete your profile later."
        : "Choose how you would like to continue to Moral Trade.";
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.page}>
      <aside className={styles.storyPanel} aria-label="About Moral Trade">
        <Link className={styles.brand} href="/" aria-label="Moral Trade, home">
          <BrandMark />
          <span>Moral Trade</span>
        </Link>

        <div className={styles.storyCore}>
          <div className={styles.storyCopy}>
            <h2>Coordinate across real differences.</h2>
            <p>
              Turn conflicting priorities into transparent, voluntary agreements with clear terms,
              evidence, and exit conditions.
            </p>
          </div>

          <CoordinationGraphic />
        </div>

        <ol className={styles.principles}>
          <li>
            <span>01</span>
            <strong>Clear terms</strong>
          </li>
          <li>
            <span>02</span>
            <strong>Named evidence</strong>
          </li>
          <li>
            <span>03</span>
            <strong>Defined exit</strong>
          </li>
        </ol>
      </aside>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <Link className={styles.mobileBrand} href="/" aria-label="Moral Trade, home">
          <BrandMark />
          <span>Moral Trade</span>
        </Link>

        <section className={styles.authShell} aria-labelledby="auth-heading">
          <p className={styles.modePrompt}>
            {isSignup ? "Already have an account? " : "New to Moral Trade? "}
            <Link href={isSignup ? loginHref : signupHref}>
              {isSignup ? "Log in" : "Create account"}
            </Link>
          </p>

          <article className={styles.card}>
            <header className={styles.cardHeader}>
              <h1 id="auth-heading">{heading}</h1>
              <p>{subtitle}</p>
            </header>

            {!supabaseReady ? (
              <div className={`${styles.statusBanner} ${styles.statusError}`} role="alert">
                Supabase is not configured yet. Add the environment variables before using live
                authentication.
              </div>
            ) : null}

            {formMessage ? (
              <div
                aria-live={formMessage.tone === "error" ? "assertive" : "polite"}
                className={`${styles.statusBanner} ${
                  formMessage.tone === "error" ? styles.statusError : styles.statusSuccess
                }`}
                role={formMessage.tone === "error" ? "alert" : "status"}
              >
                {formMessage.text}
              </div>
            ) : null}

            {method === "email" ? (
              <div className={styles.emailPanel} id="email-auth">
                <form
                  action={isSignup ? signUpAction : signInAction}
                  className={styles.emailForm}
                >
                  <input name={isSignup ? "return_to" : "next"} type="hidden" value={returnTo} />

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Email</span>
                    <input
                      autoComplete="email"
                      name="email"
                      placeholder="you@example.com"
                      required
                      type="email"
                    />
                  </label>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Password</span>
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
                    <div className={styles.formMeta}>
                      <p className={styles.recoveryLink}>
                        <Link href={resetHref}>Forgot password?</Link>
                      </p>
                    </div>
                  ) : null}

                  <AuthSubmitButton
                    className={styles.submitButton}
                    pendingLabel={isSignup ? "Creating account..." : "Logging in..."}
                  >
                    {isSignup ? "Create account" : "Log in"}
                  </AuthSubmitButton>
                </form>

                {!onePersonRegistrationEnforced ? (
                  <p className={styles.providerBack}>
                    <Link href={providersHref}>
                      {hasSocialProviders
                        ? "Use a different sign-in method"
                        : "Back to sign-in options"}
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : (
              <div className={styles.authOptions} aria-label="Authentication options">
                <Link className={styles.emailReveal} href={emailHref}>
                  <EmailIcon />
                  <span>Continue with email</span>
                </Link>

                {visibleProviders.length > 0 ? (
                  <>
                    <div className={styles.providerDivider}>or continue with</div>
                    <div className={styles.providerGrid}>
                      {visibleProviders.map((provider) => (
                        <ProviderButton
                          key={provider}
                          mode={mode}
                          provider={provider}
                          returnTo={returnTo}
                        />
                      ))}
                    </div>
                  </>
                ) : null}

                {additionalProviders.length > 0 ? (
                  <details className={styles.moreProviders}>
                    <summary>
                      <span>More sign-in options</span>
                      <ChevronIcon />
                    </summary>
                    <div className={styles.moreProviderGrid}>
                      {additionalProviders.map((provider) => (
                        <ProviderButton
                          key={provider}
                          mode={mode}
                          provider={provider}
                          returnTo={returnTo}
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
              </div>
            )}

            {isSignup ? (
              <p className={styles.legal}>
                By creating an account, you agree to the <Link href="/terms">Terms of Service</Link>{" "}
                and <Link href="/privacy">Privacy Policy</Link>.
              </p>
            ) : null}

            <span hidden data-auth-mode={mode} data-auth-path={authPath} />
          </article>
        </section>

        <footer className={styles.footer}>
          <span>© {currentYear} Moral Trade</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </footer>
      </main>
    </div>
  );
}
