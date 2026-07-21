"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/app-data";
import { getCoreAgreementForUser } from "@/lib/core-trade";
import { createServiceClient } from "@/lib/supabase/server";
import {
  deriveAgreementReminderMilestones,
  type ReminderCalendarFeed,
  type ReminderPreferences,
  type SaveReminderConfigurationInput,
  type SaveReminderRuleInput,
} from "@/lib/trade-reminders";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => any;
};

export interface ReminderActionResult {
  ok: boolean;
  message: string;
  calendarFeed?: ReminderCalendarFeed | null;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const KEY_PATTERN = /^[a-z0-9:_-]{1,180}$/i;

function validTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function validatePreferences(preferences: ReminderPreferences) {
  if (!validTimezone(preferences.timezone)) {
    throw new Error("Choose a valid IANA timezone.");
  }
  if (!TIME_PATTERN.test(preferences.quietHoursStart)) {
    throw new Error("Quiet-hours start time is invalid.");
  }
  if (!TIME_PATTERN.test(preferences.quietHoursEnd)) {
    throw new Error("Quiet-hours end time is invalid.");
  }
}

function validateRule(rule: SaveReminderRuleInput, index: number) {
  if (rule.source !== "agreement" && rule.source !== "custom") {
    throw new Error(`Reminder ${index + 1} has an invalid source.`);
  }
  if (!KEY_PATTERN.test(rule.milestoneKey)) {
    throw new Error(`Reminder ${index + 1} has an invalid milestone key.`);
  }
  if (!rule.milestoneLabel.trim() || rule.milestoneLabel.trim().length > 180) {
    throw new Error(`Reminder ${index + 1} needs a label of 180 characters or fewer.`);
  }
  if (Number.isNaN(Date.parse(rule.dueAt))) {
    throw new Error(`Reminder ${index + 1} has an invalid due time.`);
  }
  if (
    !Number.isInteger(rule.offsetMinutes) ||
    rule.offsetMinutes < -43_200 ||
    rule.offsetMinutes > 43_200
  ) {
    throw new Error(`Reminder ${index + 1} has an invalid offset.`);
  }
}

async function requireReminderAgreement(agreementId: string, userId: string) {
  const detail = await getCoreAgreementForUser(agreementId, userId);
  if (!detail) {
    throw new Error("Agreement not found or reminder access denied.");
  }
  return detail;
}

function revalidateReminderRoutes(agreementId: string) {
  revalidatePath(`/trade-agreements/${agreementId}`);
  revalidatePath(`/trade-agreements/${agreementId}/reminders`);
  revalidatePath("/commitments");
}

export async function saveReminderConfigurationAction(
  input: SaveReminderConfigurationInput,
): Promise<ReminderActionResult> {
  const viewer = await requireViewer(
    `/trade-agreements/${encodeURIComponent(input.agreementId)}/reminders`,
  );

  try {
    const detail = await requireReminderAgreement(input.agreementId, viewer.authUser.id);
    validatePreferences(input.preferences);
    if (input.rules.length > 100) {
      throw new Error("A commitment can have at most 100 personal reminder rules.");
    }

    const canonicalMilestones = new Map(
      deriveAgreementReminderMilestones(detail).map((milestone) => [milestone.key, milestone]),
    );
    const uniqueRules = new Set<string>();
    const normalizedRules = input.rules.map((rule, index) => {
      validateRule(rule, index);
      const uniqueKey = `${rule.milestoneKey}:${rule.offsetMinutes}`;
      if (uniqueRules.has(uniqueKey)) {
        throw new Error(`Only one reminder may use ${rule.milestoneLabel} at that offset.`);
      }
      uniqueRules.add(uniqueKey);

      if (rule.source === "custom") {
        return {
          ...rule,
          milestoneLabel: rule.milestoneLabel.trim(),
          dueAt: new Date(rule.dueAt).toISOString(),
        };
      }

      const canonicalMilestone = canonicalMilestones.get(rule.milestoneKey);
      if (!canonicalMilestone) {
        throw new Error(
          `${rule.milestoneLabel} is no longer an active agreement milestone. Reload the page before saving.`,
        );
      }

      return {
        ...rule,
        source: "agreement" as const,
        milestoneLabel: canonicalMilestone.label,
        dueAt: canonicalMilestone.dueAt,
      };
    });

    const supabase = createServiceClient() as SupabaseServiceAny;
    const { error } = await supabase.rpc("replace_agreement_reminder_configuration", {
      p_agreement_id: input.agreementId,
      p_user_id: viewer.authUser.id,
      p_preferences: input.preferences,
      p_rules: normalizedRules.map((rule) => ({
        source: rule.source,
        milestone_key: rule.milestoneKey,
        milestone_label: rule.milestoneLabel,
        due_at: rule.dueAt,
        offset_minutes: rule.offsetMinutes,
        enabled: rule.enabled,
        in_app_enabled: rule.inAppEnabled,
        email_enabled: rule.emailEnabled,
        calendar_enabled: rule.calendarEnabled,
      })),
    });

    if (error) {
      throw new Error(`Could not save reminders: ${error.message}`);
    }

    revalidateReminderRoutes(input.agreementId);
    return {
      ok: true,
      message: input.preferences.paused
        ? "Reminder rules saved and paused."
        : "Reminder rules saved.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save reminder rules.",
    };
  }
}

export async function setReminderCalendarFeedAction(input: {
  agreementId: string;
  enabled: boolean;
  includeCommitmentTitle: boolean;
}): Promise<ReminderActionResult> {
  const viewer = await requireViewer(
    `/trade-agreements/${encodeURIComponent(input.agreementId)}/reminders`,
  );

  try {
    await requireReminderAgreement(input.agreementId, viewer.authUser.id);
    const supabase = createServiceClient() as SupabaseServiceAny;
    const existing = await supabase
      .from("reminder_calendar_feeds")
      .select("feed_token")
      .eq("user_id", viewer.authUser.id)
      .maybeSingle();

    if (existing.error) {
      throw new Error(`Could not load calendar integration: ${existing.error.message}`);
    }

    if (input.enabled && !existing.data) {
      const savedPlan = await supabase
        .from("agreement_reminder_preferences")
        .select("id")
        .eq("agreement_id", input.agreementId)
        .eq("user_id", viewer.authUser.id)
        .maybeSingle();
      if (savedPlan.error) {
        throw new Error(`Could not verify the reminder plan: ${savedPlan.error.message}`);
      }
      if (!savedPlan.data) {
        throw new Error(
          "Save this commitment's reminder plan before enabling its calendar subscription.",
        );
      }
    }

    const now = new Date().toISOString();
    const write = existing.data
      ? await supabase
          .from("reminder_calendar_feeds")
          .update({
            enabled: input.enabled,
            include_commitment_title: input.includeCommitmentTitle,
            updated_at: now,
          })
          .eq("user_id", viewer.authUser.id)
          .select("feed_token, enabled, include_commitment_title")
          .single()
      : await supabase
          .from("reminder_calendar_feeds")
          .insert({
            user_id: viewer.authUser.id,
            enabled: input.enabled,
            include_commitment_title: input.includeCommitmentTitle,
          })
          .select("feed_token, enabled, include_commitment_title")
          .single();

    if (write.error || !write.data) {
      throw new Error(
        `Could not update calendar integration: ${write.error?.message ?? "No row returned."}`,
      );
    }

    revalidateReminderRoutes(input.agreementId);
    return {
      ok: true,
      message: input.enabled
        ? "Calendar subscription enabled."
        : "Calendar subscription disabled.",
      calendarFeed: {
        enabled: Boolean(write.data.enabled),
        feedToken: String(write.data.feed_token),
        includeCommitmentTitle: Boolean(write.data.include_commitment_title),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not update calendar integration.",
    };
  }
}

export async function rotateReminderCalendarFeedAction(input: {
  agreementId: string;
}): Promise<ReminderActionResult> {
  const viewer = await requireViewer(
    `/trade-agreements/${encodeURIComponent(input.agreementId)}/reminders`,
  );

  try {
    await requireReminderAgreement(input.agreementId, viewer.authUser.id);
    const supabase = createServiceClient() as SupabaseServiceAny;
    const now = new Date().toISOString();
    const feedToken = randomUUID();
    const write = await supabase
      .from("reminder_calendar_feeds")
      .upsert(
        {
          user_id: viewer.authUser.id,
          feed_token: feedToken,
          enabled: true,
          updated_at: now,
        },
        { onConflict: "user_id" },
      )
      .select("feed_token, enabled, include_commitment_title")
      .single();

    if (write.error || !write.data) {
      throw new Error(
        `Could not rotate calendar URL: ${write.error?.message ?? "No row returned."}`,
      );
    }

    revalidateReminderRoutes(input.agreementId);
    return {
      ok: true,
      message: "Calendar URL rotated. Existing subscriptions will stop updating.",
      calendarFeed: {
        enabled: Boolean(write.data.enabled),
        feedToken: String(write.data.feed_token),
        includeCommitmentTitle: Boolean(write.data.include_commitment_title),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not rotate calendar URL.",
    };
  }
}
