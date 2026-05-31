"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  ANALYTICS_OPT_OUT_COOKIE_NAME,
  ANALYTICS_OPT_OUT_MAX_AGE_SECONDS,
  ATTRIBUTION_COOKIE_NAME,
} from "@/lib/growth";
import { getSafeInternalPath } from "@/lib/paths";

function readOptional(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getCookieOptions() {
  return {
    httpOnly: false,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function saveAnalyticsPreferenceAction(formData: FormData) {
  const returnTo = getSafeInternalPath(
    readOptional(formData, "return_to"),
    "/privacy#analytics-preferences",
  );
  const preference = readOptional(formData, "analytics_preference");
  const cookieStore = await cookies();
  const cookieOptions = getCookieOptions();

  if (preference === "off") {
    cookieStore.set(ANALYTICS_OPT_OUT_COOKIE_NAME, "1", {
      ...cookieOptions,
      maxAge: ANALYTICS_OPT_OUT_MAX_AGE_SECONDS,
    });
    cookieStore.set(ATTRIBUTION_COOKIE_NAME, "", {
      ...cookieOptions,
      maxAge: 0,
    });
  } else if (preference === "on") {
    cookieStore.set(ANALYTICS_OPT_OUT_COOKIE_NAME, "", {
      ...cookieOptions,
      maxAge: 0,
    });
  }

  redirect(returnTo);
}
