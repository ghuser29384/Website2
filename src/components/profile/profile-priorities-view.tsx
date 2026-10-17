import { redirect } from "next/navigation";

import { DashboardTools } from "@/components/dashboard/dashboard-tools";
import { ProfilePriorityEditor } from "@/components/profile/profile-priority-editor";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getSafeInternalPath } from "@/lib/paths";
import {
  normalizeProfilePriorityAllocation,
  PROFILE_PRIORITY_OPTIONS,
  serializeProfilePriorityAllocation,
  type ProfilePriorityAllocation,
  type ProfilePriorityId,
} from "@/lib/profile-priorities";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

interface ProfilePrioritiesViewProps {
  dashboard?: boolean;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function allocationFromPersisted(value: unknown): ProfilePriorityAllocation | null {
  if (!Array.isArray(value)) return null;

  const allocation = Object.fromEntries(
    PROFILE_PRIORITY_OPTIONS.map((priority) => [priority.id, 0]),
  ) as ProfilePriorityAllocation;
  const allowedIds = new Set<string>(PROFILE_PRIORITY_OPTIONS.map((priority) => priority.id));

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
    const id = String((candidate as { id?: unknown }).id ?? "");
    const sparks = Number((candidate as { sparks?: unknown }).sparks);
    if (!allowedIds.has(id) || !Number.isInteger(sparks) || sparks < 0) continue;
    allocation[id as ProfilePriorityId] = sparks;
  }

  return normalizeProfilePriorityAllocation(serializeProfilePriorityAllocation(allocation));
}

export async function ProfilePrioritiesView({
  searchParams,
  dashboard = false,
}: ProfilePrioritiesViewProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const returnTo = dashboard ? "/dashboard" : getSafeInternalPath(firstParam(resolvedSearchParams.returnTo), "/feed");
  const pagePath = dashboard ? "/dashboard" : `/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`;
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;

  if (!viewer) {
    redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`);
  }

  const supabase = await createClient();
  const typedSupabase = supabase as any;
  const onboardingResult = await typedSupabase
    .from("cohort_onboarding_profiles")
    .select("priority_allocations,cause_areas")
    .eq("profile_id", viewer.authUser.id)
    .maybeSingle();
  const initialAllocation = allocationFromPersisted(onboardingResult.data?.priority_allocations) ??
    Object.fromEntries(PROFILE_PRIORITY_OPTIONS.map((priority) => [priority.id, 0])) as ProfilePriorityAllocation;
  const loadError = onboardingResult.error;

  return (
    <>
      {formMessage ? (
        <div
          className={`status-banner ${
            formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
          }`}
          role={formMessage.tone === "error" ? "alert" : "status"}
        >
          {formMessage.text}
        </div>
      ) : null}
      {loadError && dashboard ? <DashboardTools active="priorities" /> : null}
      {loadError ? (
        <div className="status-banner status-banner-error" role="alert">
          Existing priority data could not be loaded. Editing is unavailable until it can be read;
          no allocation will be inferred or overwritten. Reload to retry.
        </div>
      ) : null}
      {!loadError ? (
        <ProfilePriorityEditor
          initialAllocation={initialAllocation}
          returnTo={returnTo}
          returnPath={pagePath}
          cancelTo={dashboard ? "/feed" : returnTo}
          navigation={dashboard ? <DashboardTools active="priorities" /> : undefined}
        />
      ) : null}
    </>
  );
}
