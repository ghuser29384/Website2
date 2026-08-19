import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ProfilePriorityEditor } from "@/components/profile/profile-priority-editor";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getSafeInternalPath } from "@/lib/paths";
import {
  buildInitialProfilePriorityAllocation,
  normalizePersistedProfilePriorityAllocation,
  PROFILE_PRIORITY_OPTIONS,
  type ProfilePriorityAllocation,
  type ProfilePriorityResourceAllocationMap,
} from "@/lib/profile-priorities";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Profile priorities",
  description: "Adjust the private 100-spark priority allocation used by your Moral Trade feed.",
  robots: {
    follow: false,
    index: false,
  },
};

interface ProfilePrioritiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function fallbackAllocation(causes: readonly string[]) {
  const causeSet = new Set(causes);
  const prioritized = PROFILE_PRIORITY_OPTIONS.filter((priority) => causeSet.has(priority.causeArea));
  const remaining = PROFILE_PRIORITY_OPTIONS.filter((priority) => !causeSet.has(priority.causeArea));
  return buildInitialProfilePriorityAllocation(
    [...prioritized, ...remaining].map((priority) => priority.id),
  );
}

export default async function ProfilePrioritiesPage({
  searchParams,
}: ProfilePrioritiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const returnTo = getSafeInternalPath(firstParam(resolvedSearchParams.returnTo), "/feed");
  const pagePath = `/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`;
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;

  if (!viewer) {
    redirect(`/login?returnTo=${encodeURIComponent(pagePath)}`);
  }

  const supabase = await createClient();
  const typedSupabase = supabase as any;
  const [
    onboardingResult,
    resourceAllocationsResult,
    wishProfileResult,
    savedSearchesResult,
  ] = await Promise.all([
    typedSupabase
      .from("cohort_onboarding_profiles")
      .select("priority_allocations,cause_areas")
      .eq("profile_id", viewer.authUser.id)
      .maybeSingle(),
    supabase
      .from("profile_priority_resource_allocations")
      .select("resource_type,allocation")
      .eq("profile_id", viewer.authUser.id),
    typedSupabase
      .from("wish_profiles")
      .select("causes")
      .eq("profile_id", viewer.authUser.id)
      .maybeSingle(),
    typedSupabase
      .from("saved_searches")
      .select("causes")
      .eq("profile_id", viewer.authUser.id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  const savedSearchCauses = savedSearchesResult.error
    ? []
    : (savedSearchesResult.data ?? []).flatMap((search: { causes?: unknown }) =>
        asStringArray(search.causes),
      );
  const fallbackCauses = [
    ...asStringArray(onboardingResult.data?.cause_areas),
    ...asStringArray(wishProfileResult.data?.causes),
    ...savedSearchCauses,
  ];
  const initialAllocation =
    normalizePersistedProfilePriorityAllocation(
      onboardingResult.data?.priority_allocations,
    ) ??
    fallbackAllocation(fallbackCauses);
  const initialResourceAllocations: ProfilePriorityResourceAllocationMap = {};
  let invalidResourceAllocation = false;
  for (const row of resourceAllocationsResult.data ?? []) {
    const allocation = normalizePersistedProfilePriorityAllocation(row.allocation);
    if (!allocation) {
      invalidResourceAllocation = true;
      continue;
    }
    initialResourceAllocations[row.resource_type] = allocation;
  }
  const loadError =
    onboardingResult.error ||
    resourceAllocationsResult.error ||
    wishProfileResult.error ||
    savedSearchesResult.error ||
    invalidResourceAllocation;

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
      {loadError ? (
        <div className="status-banner status-banner-error" role="alert">
          Some existing priority data could not be loaded. Review the allocation carefully before
          saving.
        </div>
      ) : null}
      <ProfilePriorityEditor
        initialAllocation={initialAllocation}
        initialResourceAllocations={initialResourceAllocations}
        returnTo={returnTo}
      />
    </>
  );
}
