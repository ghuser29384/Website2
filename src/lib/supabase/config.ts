const DEFAULT_PUBLIC_SUPABASE_URL = "https://jnpoxvalyjtdghnperyu.supabase.co";
const DEFAULT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Pcmy5vefKiaEhuYTOSU75Q_NklsZOrT";

const QA_PUBLIC_SUPABASE_URL = "https://hvmxfjjbdcgjjudmthdz.supabase.co";
const QA_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Sai3NlSapbvkmXa3EQrx9A_W9oNEYE8";

const QA_PREVIEW_HOSTNAMES = new Set([
  "moraltrade-site-git-agent-evidence-weighted-payo-402d27-ellen-s.vercel.app",
  "website2-git-agent-evidence-weighted-payouts-20260723-ellen-s.vercel.app",
]);

function normalizeHostname(hostname: string | null | undefined) {
  return hostname?.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "") ?? "";
}

export function isEvidencePaymentQaPreviewHost(hostname: string | null | undefined) {
  return QA_PREVIEW_HOSTNAMES.has(normalizeHostname(hostname));
}

function resolvePublicSupabaseEnv(hostname?: string | null) {
  if (isEvidencePaymentQaPreviewHost(hostname)) {
    return {
      url: QA_PUBLIC_SUPABASE_URL,
      publishableKey: QA_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    };
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_PUBLIC_SUPABASE_URL,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      DEFAULT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function hasSupabaseEnv(hostname?: string | null) {
  if (process.env.MORAL_TRADE_DISABLE_SUPABASE === "true") {
    return false;
  }

  const { url, publishableKey } = resolvePublicSupabaseEnv(hostname);
  return Boolean(url && publishableKey);
}

export function getSiteUrl() {
  const explicitSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const isProduction = process.env.NODE_ENV === "production";

  if (
    explicitSiteUrl &&
    (!isProduction || !/^https?:\/\/localhost(?::\d+)?\/?$/i.test(explicitSiteUrl))
  ) {
    return explicitSiteUrl;
  }

  if (isProduction && process.env.VERCEL_ENV === "production") {
    return "https://www.moraltrade.org";
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return isProduction ? "https://www.moraltrade.org" : "http://localhost:3000";
}

export function getSupabaseEnv(hostname?: string | null) {
  if (process.env.MORAL_TRADE_DISABLE_SUPABASE === "true") {
    throw new Error("Supabase is explicitly disabled for this process.");
  }

  const { url, publishableKey } = resolvePublicSupabaseEnv(hostname);

  if (!url || !publishableKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { url, publishableKey };
}

export function getSupabaseServiceEnv() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return { url, serviceRoleKey };
}
