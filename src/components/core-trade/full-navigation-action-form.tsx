"use client";

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
