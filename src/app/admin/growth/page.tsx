import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { evaluateAdminOperatorAccess, isAdminEmail } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { FUNNEL_EVENT_TYPES } from "@/lib/growth";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Growth dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

interface CountRow {
  label: string;
  count: number;
}

function increment(map: Map<string, number>, key: string) {
  const normalized = key || "Unattributed";
  map.set(normalized, (map.get(normalized) ?? 0) + 1);
}

function toRows(map: Map<string, number>, limit = 12): CountRow[] {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

async function loadGrowthDashboard() {
  const supabase = createServiceClient();
  const [events, onboarding, rsvps, attributions] = await Promise.all([
    (supabase as any)
      .from("funnel_events")
      .select("event_type, partner_slug, referral_code, utm_source, path, created_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    (supabase as any)
      .from("cohort_onboarding_profiles")
      .select("primary_goal, participant_kind, first_action, status, created_at, completed_at")
      .order("updated_at", { ascending: false })
      .limit(500),
    (supabase as any)
      .from("webinar_rsvps")
      .select("status, community, session_preference, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    (supabase as any)
      .from("cohort_attributions")
      .select("partner_slug, referral_code, utm_source, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500),
  ]);

  const errors = [events.error, onboarding.error, rsvps.error, attributions.error]
    .filter(Boolean)
    .map((error) => error?.message)
    .join(" ");

  if (errors) {
    throw new Error(errors);
  }

  const eventRows = (events.data ?? []) as Array<{
    event_type: string;
    partner_slug: string;
    referral_code: string;
    utm_source: string;
  }>;
  const onboardingRows = (onboarding.data ?? []) as Array<{
    primary_goal: string;
    participant_kind: string;
    first_action: string;
    status: string;
  }>;
  const rsvpRows = (rsvps.data ?? []) as Array<{
    community: string;
    status: string;
  }>;
  const attributionRows = (attributions.data ?? []) as Array<{
    partner_slug: string;
    referral_code: string;
    utm_source: string;
  }>;

  const eventsByType = new Map<string, number>();
  const eventsByPartner = new Map<string, number>();
  const eventsBySource = new Map<string, number>();
  const onboardingByAction = new Map<string, number>();
  const onboardingByRole = new Map<string, number>();
  const rsvpsByCommunity = new Map<string, number>();
  const attributionByPartner = new Map<string, number>();

  for (const event of eventRows) {
    increment(eventsByType, event.event_type);
    increment(eventsByPartner, event.partner_slug);
    increment(eventsBySource, event.utm_source || event.referral_code);
  }

  for (const profile of onboardingRows) {
    increment(onboardingByAction, profile.first_action);
    increment(onboardingByRole, profile.participant_kind);
  }

  for (const rsvp of rsvpRows) {
    increment(rsvpsByCommunity, rsvp.community);
  }

  for (const attribution of attributionRows) {
    increment(attributionByPartner, attribution.partner_slug || attribution.utm_source);
  }

  return {
    attributionByPartner: toRows(attributionByPartner),
    eventRows,
    eventsByPartner: toRows(eventsByPartner),
    eventsBySource: toRows(eventsBySource),
    eventsByType: FUNNEL_EVENT_TYPES.map((eventType) => ({
      label: eventType,
      count: eventsByType.get(eventType) ?? 0,
    })),
    onboardingByAction: toRows(onboardingByAction),
    onboardingByRole: toRows(onboardingByRole),
    onboardingRows,
    rsvpRows,
    rsvpsByCommunity: toRows(rsvpsByCommunity),
  };
}

function MetricTable({ rows }: { rows: CountRow[] }) {
  return (
    <div className="cohort-progress-list admin-growth-list">
      {rows.length ? (
        rows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.count}</strong>
          </div>
        ))
      ) : (
        <div>
          <span>No records yet</span>
          <strong>0</strong>
        </div>
      )}
    </div>
  );
}

export default async function AdminGrowthPage() {
  const viewer = hasSupabaseEnv() ? await requireViewer("/admin/growth") : null;
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  const adminMfaSummary = isAdmin ? await loadBackgroundAccountSecuritySummary() : null;
  const adminAccess = evaluateAdminOperatorAccess({
    email: viewer?.authUser.email,
    mfaSummary: adminMfaSummary,
  });
  let dashboard: Awaited<ReturnType<typeof loadGrowthDashboard>> | null = null;
  let loadError: string | null = null;

  if (adminAccess.allowed) {
    try {
      dashboard = await loadGrowthDashboard();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to load growth dashboard.";
    }
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Operations</p>
            <h1>Growth dashboard.</h1>
            <p className="hero-text">
              Inspect UTM, partner, RSVP, onboarding, invite, and funnel events from the founding
              cohort launch.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/admin">
                Back to admin
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Access</p>
            <h2>{adminAccess.allowed ? "MFA-verified admin view" : "Admin step-up required"}</h2>
            <p>
              This page is gated by the same admin email allowlist as the review console and an
              active authenticator MFA session.
            </p>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {!isAdmin ? (
          <section className="section section-white">
            <article className="panel">
              <h2>Not authorized</h2>
              <p>Sign in with an admin email to view growth reporting.</p>
            </article>
          </section>
        ) : !adminAccess.allowed ? (
          <section className="section section-white">
            <article className="panel">
              <h2>Authenticator MFA required</h2>
              <p>{adminAccess.message}</p>
              <p>
                Current session level: {adminMfaSummary?.currentLevel ?? "unknown"} · verified
                factors: {adminMfaSummary?.verifiedTotpCount ?? 0}
              </p>
              <Link className="button button-secondary" href="/dashboard#account-security">
                Open account security
              </Link>
            </article>
          </section>
        ) : null}

        {loadError ? (
          <div className="status-banner status-banner-error">{loadError}</div>
        ) : null}

        {dashboard ? (
          <section className="section section-white admin-growth-grid" aria-label="Growth metrics">
            <article className="panel cohort-card">
              <h2>Funnel events</h2>
              <MetricTable rows={dashboard.eventsByType} />
            </article>
            <article className="panel cohort-card">
              <h2>Partners</h2>
              <MetricTable rows={dashboard.eventsByPartner} />
            </article>
            <article className="panel cohort-card">
              <h2>Sources</h2>
              <MetricTable rows={dashboard.eventsBySource} />
            </article>
            <article className="panel cohort-card">
              <h2>First actions</h2>
              <MetricTable rows={dashboard.onboardingByAction} />
            </article>
            <article className="panel cohort-card">
              <h2>Roles</h2>
              <MetricTable rows={dashboard.onboardingByRole} />
            </article>
            <article className="panel cohort-card">
              <h2>Demo RSVPs</h2>
              <MetricTable rows={dashboard.rsvpsByCommunity} />
            </article>
          </section>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
