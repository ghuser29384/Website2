"use client";

// Next exposes redirect() publicly, but not the client-side helpers required to
// recognize and decode the redirect error returned by a directly awaited
// Server Action. Keep this compatibility boundary centralized. The executable
// contract in evidence-weighted-payment-lifecycle.test.ts is intentionally
// coupled to the lockfile and must pass before any Next upgrade is accepted.
import {
  getRedirectTypeFromError,
  getURLFromRedirectError,
} from "next/dist/client/components/redirect";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import type { ComponentPropsWithoutRef } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

export function FullNavigationActionForm({
  action,
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"form">, "action" | "onSubmit"> & {
  action: ServerAction;
}) {
  async function submitWithFullNavigation(formData: FormData) {
    try {
      await action(formData);
    } catch (error) {
      if (!isRedirectError(error)) {
        throw error;
      }

      const target = getURLFromRedirectError(error);
      if (getRedirectTypeFromError(error) === "replace") {
        window.location.replace(target);
      } else {
        window.location.assign(target);
      }
    }
  }

  return (
    <form action={submitWithFullNavigation} {...props}>
      {children}
    </form>
  );
}
