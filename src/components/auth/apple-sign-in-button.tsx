"use client";

import { useEffect, useState, type FormEvent } from "react";

import type { AuthMode } from "@/lib/auth-routes";
import {
  APPLE_SIGN_IN_SCRIPT_URL,
  buildAppleCompletionPath,
  DEFAULT_APPLE_SERVICES_ID,
  getAppleAuthorizationState,
  getAppleIdentityToken,
  getAppleSignInErrorMessage,
  getAppleUserMetadata,
  type AppleSignInResponse,
} from "@/lib/apple-sign-in";
import { createClient } from "@/lib/supabase/browser";
import { getSupabaseEnv } from "@/lib/supabase/config";

import styles from "./auth-card.module.css";

type AppleSignInConfig = {
  clientId: string;
  scope: string;
  redirectURI: string;
  state: string;
  nonce: string;
  usePopup: boolean;
};

type AppleSignInSdk = {
  auth: {
    init(config: AppleSignInConfig): void;
    signIn(): Promise<AppleSignInResponse> | void;
  };
};

declare global {
  interface Window {
    AppleID?: AppleSignInSdk;
  }
}

const APPLE_SDK_LOAD_TIMEOUT_MS = 15_000;
let appleSdkPromise: Promise<AppleSignInSdk> | null = null;

function loadAppleSignInSdk() {
  if (window.AppleID?.auth) {
    return Promise.resolve(window.AppleID);
  }

  if (appleSdkPromise) {
    return appleSdkPromise;
  }

  appleSdkPromise = new Promise<AppleSignInSdk>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${APPLE_SIGN_IN_SCRIPT_URL}"]`,
    );
    const script = existingScript ?? document.createElement("script");
    let settled = false;

    const finish = (sdk: AppleSignInSdk | null, error?: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);

      if (sdk) {
        resolve(sdk);
        return;
      }

      appleSdkPromise = null;
      reject(error ?? new Error("Apple sign-in could not load."));
    };
    const handleLoad = () => {
      finish(
        window.AppleID?.auth ? window.AppleID : null,
        new Error("Apple sign-in loaded without an authentication API."),
      );
    };
    const handleError = () => {
      finish(null, new Error("Apple sign-in could not load."));
    };
    const timeoutId = window.setTimeout(() => {
      finish(null, new Error("Apple sign-in timed out while loading."));
    }, APPLE_SDK_LOAD_TIMEOUT_MS);

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existingScript) {
      script.async = true;
      script.src = APPLE_SIGN_IN_SCRIPT_URL;
      document.head.append(script);
    }
  });

  return appleSdkPromise;
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

export function AppleSignInButton({
  mode,
  returnTo,
}: {
  mode: AuthMode;
  returnTo: string;
}) {
  const [sdkState, setSdkState] = useState<"loading" | "ready" | "failed">("loading");
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void loadAppleSignInSdk()
      .then(() => {
        if (active) {
          setSdkState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setSdkState("failed");
          setErrorMessage("Apple sign-in could not load. Refresh the page or use email.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const appleAuth = window.AppleID?.auth;
    if (!appleAuth) {
      setSdkState("failed");
      setErrorMessage("Apple sign-in could not load. Refresh the page or use email.");
      return;
    }

    const nonce = crypto.randomUUID();
    const state = crypto.randomUUID();
    const { url: supabaseUrl } = getSupabaseEnv(window.location.hostname);
    const clientId =
      process.env.NEXT_PUBLIC_APPLE_SERVICES_ID?.trim() || DEFAULT_APPLE_SERVICES_ID;

    setPending(true);

    try {
      appleAuth.init({
        clientId,
        scope: "name email",
        redirectURI: `${supabaseUrl.replace(/\/$/, "")}/auth/v1/callback`,
        state,
        nonce,
        usePopup: true,
      });

      const signInPromise = appleAuth.signIn();
      if (!signInPromise) {
        throw new Error("Apple sign-in did not start.");
      }

      const response = await signInPromise;
      if (response.error) {
        throw response;
      }

      if (getAppleAuthorizationState(response) !== state) {
        throw new Error("Apple sign-in state validation failed.");
      }

      const token = getAppleIdentityToken(response);
      if (!token) {
        throw new Error("Apple did not return an identity token.");
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token,
        nonce,
      });

      if (error) {
        throw error;
      }

      const userMetadata = getAppleUserMetadata(response);
      if (userMetadata) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: userMetadata,
        });

        if (metadataError) {
          console.warn("Apple sign-in succeeded, but the one-time name could not be saved.", {
            message: metadataError.message,
          });
        }
      }

      window.location.assign(buildAppleCompletionPath(mode, returnTo));
    } catch (error) {
      setErrorMessage(getAppleSignInErrorMessage(error));
      setPending(false);
    }
  }

  const disabled = pending || sdkState !== "ready";
  const buttonLabel = pending ? "Opening Apple..." : "Continue with Apple";

  return (
    <form className={styles.providerForm} onSubmit={handleSubmit}>
      <input name="provider" type="hidden" value="apple" />
      <input name="mode" type="hidden" value={mode} />
      <input name="return_to" type="hidden" value={returnTo} />
      <button
        aria-busy={pending || sdkState === "loading"}
        aria-describedby={errorMessage ? "apple-sign-in-error" : undefined}
        className={styles.providerButton}
        disabled={disabled}
        type="submit"
      >
        <AppleIcon />
        <span>{buttonLabel}</span>
      </button>
      {errorMessage ? (
        <p
          className={`${styles.statusBanner} ${styles.statusError}`}
          id="apple-sign-in-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
