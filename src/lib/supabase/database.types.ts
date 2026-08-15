export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type SupabaseMoralTradeOperationalRow = {
  id: string;
  created_at: string;
  [key: string]: Json | undefined;
};

type SupabaseMoralTradeOperationalInsert = {
  id?: string;
  created_at?: string;
  [key: string]: Json | undefined;
};

type SupabaseMoralTradeOperationalUpdate = {
  [key: string]: Json | undefined;
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          username: string | null;
          public_invitation_mentions_enabled: boolean;
          avatar_url: string | null;
          account_kind: "individual" | "organization";
          accepts_group_invitations: boolean;
          organization_approval_count: number;
          affiliation: string;
          city: string | null;
          region: string | null;
          country: string | null;
          public_location_granularity: "hidden" | "country" | "region" | "city";
          bio: string;
          follower_count: number;
          following_count: number;
          karma: number;
          comment_count: number;
          rating_avg: number | null;
          rating_count: number;
          offer_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          username?: string | null;
          public_invitation_mentions_enabled?: boolean;
          avatar_url?: string | null;
          account_kind?: "individual" | "organization";
          accepts_group_invitations?: boolean;
          organization_approval_count?: number;
          affiliation?: string;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          public_location_granularity?: "hidden" | "country" | "region" | "city";
          bio?: string;
          follower_count?: number;
          following_count?: number;
          karma?: number;
          comment_count?: number;
          rating_avg?: number | null;
          rating_count?: number;
          offer_count?: number;
          created_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          username?: string | null;
          public_invitation_mentions_enabled?: boolean;
          avatar_url?: string | null;
          account_kind?: "individual" | "organization";
          accepts_group_invitations?: boolean;
          organization_approval_count?: number;
          affiliation?: string;
          city?: string | null;
          region?: string | null;
          country?: string | null;
          public_location_granularity?: "hidden" | "country" | "region" | "city";
          bio?: string;
          follower_count?: number;
          following_count?: number;
          karma?: number;
          comment_count?: number;
          rating_avg?: number | null;
          rating_count?: number;
          offer_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profile_username_claims: {
        Row: {
          username: string;
          profile_id: string;
          is_current: boolean;
          claimed_at: string;
          superseded_at: string | null;
        };
        Insert: {
          username: string;
          profile_id: string;
          is_current?: boolean;
          claimed_at?: string;
          superseded_at?: string | null;
        };
        Update: {
          username?: string;
          profile_id?: string;
          is_current?: boolean;
          claimed_at?: string;
          superseded_at?: string | null;
        };
        Relationships: [];
      };
      route_recommendation_profiles: {
        Row: {
          profile_id: string;
          goal: string;
          cause_priorities: string[];
          money_budget_cents: number;
          time_budget_minutes: number;
          action_budget_count: number;
          horizon: "day" | "week" | "month" | "quarter" | "year";
          route_formats: Array<"direct" | "threshold" | "redirect" | "personal" | "coalition">;
          evidence_preference: "standard" | "high" | "connected";
          uncertainty_preference: "conservative" | "balanced" | "exploratory";
          interaction_preference: "solo" | "open" | "invite";
          privacy_preference: "private" | "public-safe" | "public";
          planned_donation_baseline: boolean | null;
          planned_donation_cents: number;
          otherwise_baseline: string;
          pairwise_answers: Json;
          interview_answers: Json;
          sensitive_ciphertexts: Json;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          goal?: string;
          cause_priorities?: string[];
          money_budget_cents?: number;
          time_budget_minutes?: number;
          action_budget_count?: number;
          horizon?: "day" | "week" | "month" | "quarter" | "year";
          route_formats?: Array<
            "direct" | "threshold" | "redirect" | "personal" | "coalition"
          >;
          evidence_preference?: "standard" | "high" | "connected";
          uncertainty_preference?: "conservative" | "balanced" | "exploratory";
          interaction_preference?: "solo" | "open" | "invite";
          privacy_preference?: "private" | "public-safe" | "public";
          planned_donation_baseline?: boolean | null;
          planned_donation_cents?: number;
          otherwise_baseline?: string;
          pairwise_answers?: Json;
          interview_answers?: Json;
          sensitive_ciphertexts?: Json;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          goal?: string;
          cause_priorities?: string[];
          money_budget_cents?: number;
          time_budget_minutes?: number;
          action_budget_count?: number;
          horizon?: "day" | "week" | "month" | "quarter" | "year";
          route_formats?: Array<
            "direct" | "threshold" | "redirect" | "personal" | "coalition"
          >;
          evidence_preference?: "standard" | "high" | "connected";
          uncertainty_preference?: "conservative" | "balanced" | "exploratory";
          interaction_preference?: "solo" | "open" | "invite";
          privacy_preference?: "private" | "public-safe" | "public";
          planned_donation_baseline?: boolean | null;
          planned_donation_cents?: number;
          otherwise_baseline?: string;
          pairwise_answers?: Json;
          interview_answers?: Json;
          sensitive_ciphertexts?: Json;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      offers: {
        Row: {
          id: string;
          owner_id: string;
          owner_alias: string;
          mode: "pledge" | "offset" | "payment";
          offered_cause: string;
          requested_cause: string;
          offer_action: string;
          request_action: string;
          compromise_cause: string;
          offer_impact: number;
          min_counterparty_impact: number;
          verification: string;
          duration: string;
          payment_interval_value: number | null;
          payment_interval_unit: string | null;
          trust_level: number;
          notes: string;
          discount_note: string;
          status: "open" | "paused" | "matched" | "closed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          owner_alias: string;
          mode: "pledge" | "offset" | "payment";
          offered_cause: string;
          requested_cause: string;
          offer_action: string;
          request_action: string;
          compromise_cause?: string;
          offer_impact: number;
          min_counterparty_impact: number;
          verification: string;
          duration: string;
          payment_interval_value?: number | null;
          payment_interval_unit?: string | null;
          trust_level: number;
          notes?: string;
          discount_note?: string;
          status?: "open" | "paused" | "matched" | "closed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_alias?: string;
          mode?: "pledge" | "offset" | "payment";
          offered_cause?: string;
          requested_cause?: string;
          offer_action?: string;
          request_action?: string;
          compromise_cause?: string;
          offer_impact?: number;
          min_counterparty_impact?: number;
          verification?: string;
          duration?: string;
          payment_interval_value?: number | null;
          payment_interval_unit?: string | null;
          trust_level?: number;
          notes?: string;
          discount_note?: string;
          status?: "open" | "paused" | "matched" | "closed";
          updated_at?: string;
        };
        Relationships: [];
      };
      registered_charities: {
        Row: {
          id: string;
          name: string;
          cause_area: string;
          website_url: string;
          summary: string;
          is_active: boolean;
          is_political_campaign: boolean;
          selectable: boolean;
          is_moral_public_good: boolean;
          consensus_label: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          cause_area?: string;
          website_url?: string;
          summary?: string;
          is_active?: boolean;
          is_political_campaign?: boolean;
          selectable?: boolean;
          is_moral_public_good?: boolean;
          consensus_label?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          cause_area?: string;
          website_url?: string;
          summary?: string;
          is_active?: boolean;
          is_political_campaign?: boolean;
          selectable?: boolean;
          is_moral_public_good?: boolean;
          consensus_label?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      donation_offset_pools: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          description: string;
          compromise_charity_id: string;
          offset_ratio: number;
          time_horizon: "one_off" | "recurring";
          verification_method:
            | "proof_of_past_donations"
            | "receipts_uploaded"
            | "funds_in_escrow"
            | "third_party_audit";
          unmatched_surplus_rule:
            | "return_to_donors"
            | "donate_to_compromise_destination"
            | "donate_to_original_cause"
            | "split_evenly";
          assurance_minimum_cents: number;
          maximum_cap_cents: number;
          assurance_deadline_at: string | null;
          side_a_label: string;
          side_b_label: string;
          status: "open" | "assurance_pending" | "assurance_met" | "closed";
          moderation_status: "clear" | "flagged" | "blocked";
          moderation_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          description?: string;
          compromise_charity_id: string;
          offset_ratio: number;
          time_horizon: "one_off" | "recurring";
          verification_method:
            | "proof_of_past_donations"
            | "receipts_uploaded"
            | "funds_in_escrow"
            | "third_party_audit";
          unmatched_surplus_rule:
            | "return_to_donors"
            | "donate_to_compromise_destination"
            | "donate_to_original_cause"
            | "split_evenly";
          assurance_minimum_cents?: number;
          maximum_cap_cents?: number;
          assurance_deadline_at?: string | null;
          side_a_label?: string;
          side_b_label?: string;
          status?: "open" | "assurance_pending" | "assurance_met" | "closed";
          moderation_status?: "clear" | "flagged" | "blocked";
          moderation_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          compromise_charity_id?: string;
          offset_ratio?: number;
          time_horizon?: "one_off" | "recurring";
          verification_method?:
            | "proof_of_past_donations"
            | "receipts_uploaded"
            | "funds_in_escrow"
            | "third_party_audit";
          unmatched_surplus_rule?:
            | "return_to_donors"
            | "donate_to_compromise_destination"
            | "donate_to_original_cause"
            | "split_evenly";
          assurance_minimum_cents?: number;
          maximum_cap_cents?: number;
          assurance_deadline_at?: string | null;
          side_a_label?: string;
          side_b_label?: string;
          status?: "open" | "assurance_pending" | "assurance_met" | "closed";
          moderation_status?: "clear" | "flagged" | "blocked";
          moderation_notes?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      donation_offset_offers: {
        Row: {
          offer_id: string;
          baseline_amount_cents: number;
          baseline_opposed_cause: string;
          requested_matching_amount_cents: number;
          requested_opposed_cause: string;
          compromise_charity_id: string;
          offset_ratio: number;
          time_horizon: "one_off" | "recurring";
          verification_method:
            | "proof_of_past_donations"
            | "receipts_uploaded"
            | "funds_in_escrow"
            | "third_party_audit";
          unmatched_surplus_rule:
            | "return_to_donors"
            | "donate_to_compromise_destination"
            | "donate_to_original_cause"
            | "split_evenly";
          participation_mode: "direct" | "pool";
          pool_id: string | null;
          pool_side: "side_a" | "side_b" | null;
          assurance_minimum_cents: number;
          assurance_deadline_at: string | null;
          evidence_url: string;
          offer_expires_at: string | null;
          baseline_bond_enabled: boolean;
          baseline_bond_amount_cents: number;
          baseline_bond_currency: string;
          baseline_bond_forfeit_destination_id: string | null;
          baseline_bond_evidence_due_at: string | null;
          baseline_bond_evidence_standard: string;
          baseline_bond_evidence_url: string;
          baseline_bond_status:
            | "none"
            | "pending_payment"
            | "posted"
            | "refunded_after_match"
            | "evidence_due"
            | "evidence_submitted"
            | "refunded_after_evidence"
            | "forfeited"
            | "cancelled_by_review";
          baseline_bond_reviewed_by: string | null;
          baseline_bond_reviewed_at: string | null;
          baseline_bond_review_notes: string;
          baseline_bond_appeal_window_ends_at: string | null;
          moderation_status: "clear" | "flagged" | "blocked";
          moderation_notes: string;
          moderation_reviewed_by: string | null;
          moderation_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          offer_id: string;
          baseline_amount_cents: number;
          baseline_opposed_cause?: string;
          requested_matching_amount_cents: number;
          requested_opposed_cause?: string;
          compromise_charity_id: string;
          offset_ratio: number;
          time_horizon: "one_off" | "recurring";
          verification_method:
            | "proof_of_past_donations"
            | "receipts_uploaded"
            | "funds_in_escrow"
            | "third_party_audit";
          unmatched_surplus_rule:
            | "return_to_donors"
            | "donate_to_compromise_destination"
            | "donate_to_original_cause"
            | "split_evenly";
          participation_mode?: "direct" | "pool";
          pool_id?: string | null;
          pool_side?: "side_a" | "side_b" | null;
          assurance_minimum_cents?: number;
          assurance_deadline_at?: string | null;
          evidence_url?: string;
          offer_expires_at?: string | null;
          baseline_bond_enabled?: boolean;
          baseline_bond_amount_cents?: number;
          baseline_bond_currency?: string;
          baseline_bond_forfeit_destination_id?: string | null;
          baseline_bond_evidence_due_at?: string | null;
          baseline_bond_evidence_standard?: string;
          baseline_bond_evidence_url?: string;
          baseline_bond_status?:
            | "none"
            | "pending_payment"
            | "posted"
            | "refunded_after_match"
            | "evidence_due"
            | "evidence_submitted"
            | "refunded_after_evidence"
            | "forfeited"
            | "cancelled_by_review";
          baseline_bond_reviewed_by?: string | null;
          baseline_bond_reviewed_at?: string | null;
          baseline_bond_review_notes?: string;
          baseline_bond_appeal_window_ends_at?: string | null;
          moderation_status?: "clear" | "flagged" | "blocked";
          moderation_notes?: string;
          moderation_reviewed_by?: string | null;
          moderation_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          baseline_amount_cents?: number;
          baseline_opposed_cause?: string;
          requested_matching_amount_cents?: number;
          requested_opposed_cause?: string;
          compromise_charity_id?: string;
          offset_ratio?: number;
          time_horizon?: "one_off" | "recurring";
          verification_method?:
            | "proof_of_past_donations"
            | "receipts_uploaded"
            | "funds_in_escrow"
            | "third_party_audit";
          unmatched_surplus_rule?:
            | "return_to_donors"
            | "donate_to_compromise_destination"
            | "donate_to_original_cause"
            | "split_evenly";
          participation_mode?: "direct" | "pool";
          pool_id?: string | null;
          pool_side?: "side_a" | "side_b" | null;
          assurance_minimum_cents?: number;
          assurance_deadline_at?: string | null;
          evidence_url?: string;
          offer_expires_at?: string | null;
          baseline_bond_enabled?: boolean;
          baseline_bond_amount_cents?: number;
          baseline_bond_currency?: string;
          baseline_bond_forfeit_destination_id?: string | null;
          baseline_bond_evidence_due_at?: string | null;
          baseline_bond_evidence_standard?: string;
          baseline_bond_evidence_url?: string;
          baseline_bond_status?:
            | "none"
            | "pending_payment"
            | "posted"
            | "refunded_after_match"
            | "evidence_due"
            | "evidence_submitted"
            | "refunded_after_evidence"
            | "forfeited"
            | "cancelled_by_review";
          baseline_bond_reviewed_by?: string | null;
          baseline_bond_reviewed_at?: string | null;
          baseline_bond_review_notes?: string;
          baseline_bond_appeal_window_ends_at?: string | null;
          moderation_status?: "clear" | "flagged" | "blocked";
          moderation_notes?: string;
          moderation_reviewed_by?: string | null;
          moderation_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      interests: {
        Row: {
          id: string;
          offer_id: string;
          user_id: string;
          interested_alias: string;
          message: string;
          status: "pending" | "accepted" | "declined" | "withdrawn";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          user_id: string;
          interested_alias: string;
          message?: string;
          status?: "pending" | "accepted" | "declined" | "withdrawn";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          interested_alias?: string;
          message?: string;
          status?: "pending" | "accepted" | "declined" | "withdrawn";
          updated_at?: string;
        };
        Relationships: [];
      };
      guest_interests: {
        Row: {
          id: string;
          offer_id: string;
          contact_email: string;
          display_name: string;
          city: string | null;
          region: string | null;
          message: string;
          status: "pending" | "accepted" | "declined" | "withdrawn";
          claimed_by_profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          contact_email: string;
          display_name?: string;
          city?: string | null;
          region?: string | null;
          message?: string;
          status?: "pending" | "accepted" | "declined" | "withdrawn";
          claimed_by_profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          contact_email?: string;
          display_name?: string;
          city?: string | null;
          region?: string | null;
          message?: string;
          status?: "pending" | "accepted" | "declined" | "withdrawn";
          claimed_by_profile_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      donation_offset_matches: {
        Row: {
          id: string;
          offer_id: string;
          interest_id: string | null;
          guest_interest_id: string | null;
          owner_profile_id: string;
          counterparty_profile_id: string | null;
          counterparty_email: string | null;
          matched_baseline_cents: number;
          matched_counterparty_cents: number;
          compromise_total_cents: number;
          unmatched_baseline_cents: number;
          unmatched_counterparty_cents: number;
          status: "matched" | "completed" | "cancelled";
          owner_evidence_url: string;
          counterparty_evidence_url: string;
          compromise_evidence_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          interest_id?: string | null;
          guest_interest_id?: string | null;
          owner_profile_id: string;
          counterparty_profile_id?: string | null;
          counterparty_email?: string | null;
          matched_baseline_cents: number;
          matched_counterparty_cents: number;
          compromise_total_cents: number;
          unmatched_baseline_cents?: number;
          unmatched_counterparty_cents?: number;
          status?: "matched" | "completed" | "cancelled";
          owner_evidence_url?: string;
          counterparty_evidence_url?: string;
          compromise_evidence_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          offer_id?: string;
          interest_id?: string | null;
          guest_interest_id?: string | null;
          owner_profile_id?: string;
          counterparty_profile_id?: string | null;
          counterparty_email?: string | null;
          matched_baseline_cents?: number;
          matched_counterparty_cents?: number;
          compromise_total_cents?: number;
          unmatched_baseline_cents?: number;
          unmatched_counterparty_cents?: number;
          status?: "matched" | "completed" | "cancelled";
          owner_evidence_url?: string;
          counterparty_evidence_url?: string;
          compromise_evidence_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      donation_offset_redirect_plans: {
        Row: {
          match_id: string;
          participant_role: "owner" | "counterparty";
          participant_profile_id: string;
          registered_charity_id: string;
          plan_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          match_id: string;
          participant_role: "owner" | "counterparty";
          participant_profile_id: string;
          registered_charity_id: string;
          plan_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          match_id?: string;
          participant_role?: "owner" | "counterparty";
          participant_profile_id?: string;
          registered_charity_id?: string;
          plan_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agreements: {
        Row: {
          id: string;
          offer_id: string | null;
          interest_id: string | null;
          match_id: string | null;
          introduction_plan_id: string | null;
          source: "offer" | "introduction" | "manual";
          proposer_id: string;
          responder_id: string;
          status: "proposed" | "active" | "completed" | "cancelled";
          notes: string;
          structured_terms: string;
          no_trade_baseline: string;
          counterfactual_declaration: string;
          duration_terms: string;
          exit_conditions: string;
          evidence_rule: string;
          privacy_scope: string;
          disclosure_scope: string;
          completion_state: "pending_evidence" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved";
          challenge_window_ends_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id?: string | null;
          interest_id?: string | null;
          match_id?: string | null;
          introduction_plan_id?: string | null;
          source?: "offer" | "introduction" | "manual";
          proposer_id: string;
          responder_id: string;
          status?: "proposed" | "active" | "completed" | "cancelled";
          notes?: string;
          structured_terms?: string;
          no_trade_baseline?: string;
          counterfactual_declaration?: string;
          duration_terms?: string;
          exit_conditions?: string;
          evidence_rule?: string;
          privacy_scope?: string;
          disclosure_scope?: string;
          completion_state?: "pending_evidence" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved";
          challenge_window_ends_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          offer_id?: string | null;
          interest_id?: string | null;
          match_id?: string | null;
          introduction_plan_id?: string | null;
          source?: "offer" | "introduction" | "manual";
          status?: "proposed" | "active" | "completed" | "cancelled";
          notes?: string;
          structured_terms?: string;
          no_trade_baseline?: string;
          counterfactual_declaration?: string;
          duration_terms?: string;
          exit_conditions?: string;
          evidence_rule?: string;
          privacy_scope?: string;
          disclosure_scope?: string;
          completion_state?: "pending_evidence" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved";
          challenge_window_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agreement_ratings: {
        Row: {
          id: string;
          agreement_id: string;
          rater_id: string;
          rated_user_id: string;
          score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          rater_id: string;
          rated_user_id: string;
          score: number;
          created_at?: string;
        };
        Update: {
          score?: number;
        };
        Relationships: [];
      };
      profile_payment_accounts: {
        Row: {
          profile_id: string;
          stripe_account_id: string;
          charges_enabled: boolean;
          payouts_enabled: boolean;
          details_submitted: boolean;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          stripe_account_id: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          details_submitted?: boolean;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_account_id?: string;
          charges_enabled?: boolean;
          payouts_enabled?: boolean;
          details_submitted?: boolean;
          onboarding_completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agreement_payments: {
        Row: {
          id: string;
          agreement_id: string;
          payer_id: string;
          payee_id: string;
          amount_cents: number;
          currency: string;
          cadence_interval_value: number;
          cadence_interval_unit: "one_time" | "day" | "month" | "year" | "custom_days";
          platform_fee_cents: number;
          status: "draft" | "checkout_created" | "paid" | "failed" | "refund_requested" | "refunded" | "disputed" | "cancelled";
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_charge_id: string | null;
          receipt_url: string | null;
          authorization_mode: "direct_checkout" | "manual_review_stub" | "provider_managed_conditional_authorization";
          authorization_status: "not_required_for_stage" | "stub_blocked" | "manual_review_required" | "authorization_pending" | "authorized" | "authorization_failed" | "expired" | "capture_blocked";
          capture_policy: "direct_checkout_after_participant_request" | "no_capture_until_matched_lock_confirmed";
          authorization_gate_snapshot: string;
          authorization_expires_at: string | null;
          authorized_at: string | null;
          notes: string;
          created_at: string;
          updated_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          payer_id: string;
          payee_id: string;
          amount_cents: number;
          currency?: string;
          cadence_interval_value?: number;
          cadence_interval_unit?: "one_time" | "day" | "month" | "year" | "custom_days";
          platform_fee_cents?: number;
          status?: "draft" | "checkout_created" | "paid" | "failed" | "refund_requested" | "refunded" | "disputed" | "cancelled";
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          receipt_url?: string | null;
          authorization_mode?: "direct_checkout" | "manual_review_stub" | "provider_managed_conditional_authorization";
          authorization_status?: "not_required_for_stage" | "stub_blocked" | "manual_review_required" | "authorization_pending" | "authorized" | "authorization_failed" | "expired" | "capture_blocked";
          capture_policy?: "direct_checkout_after_participant_request" | "no_capture_until_matched_lock_confirmed";
          authorization_gate_snapshot?: string;
          authorization_expires_at?: string | null;
          authorized_at?: string | null;
          notes?: string;
          created_at?: string;
          updated_at?: string;
          paid_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          currency?: string;
          cadence_interval_value?: number;
          cadence_interval_unit?: "one_time" | "day" | "month" | "year" | "custom_days";
          platform_fee_cents?: number;
          status?: "draft" | "checkout_created" | "paid" | "failed" | "refund_requested" | "refunded" | "disputed" | "cancelled";
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_charge_id?: string | null;
          receipt_url?: string | null;
          authorization_mode?: "direct_checkout" | "manual_review_stub" | "provider_managed_conditional_authorization";
          authorization_status?: "not_required_for_stage" | "stub_blocked" | "manual_review_required" | "authorization_pending" | "authorized" | "authorization_failed" | "expired" | "capture_blocked";
          capture_policy?: "direct_checkout_after_participant_request" | "no_capture_until_matched_lock_confirmed";
          authorization_gate_snapshot?: string;
          authorization_expires_at?: string | null;
          authorized_at?: string | null;
          notes?: string;
          updated_at?: string;
          paid_at?: string | null;
        };
        Relationships: [];
      };
      agreement_payment_schedules: {
        Row: {
          id: string;
          agreement_id: string;
          payer_id: string;
          payee_id: string;
          amount_cents: number;
          currency: string;
          cadence_interval_value: number;
          cadence_interval_unit: "day" | "month" | "year" | "custom_days";
          next_due_at: string;
          status: "active" | "paused" | "cancelled";
          last_reminded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          payer_id: string;
          payee_id: string;
          amount_cents: number;
          currency?: string;
          cadence_interval_value?: number;
          cadence_interval_unit: "day" | "month" | "year" | "custom_days";
          next_due_at: string;
          status?: "active" | "paused" | "cancelled";
          last_reminded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          currency?: string;
          cadence_interval_value?: number;
          cadence_interval_unit?: "day" | "month" | "year" | "custom_days";
          next_due_at?: string;
          status?: "active" | "paused" | "cancelled";
          last_reminded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agreement_events: {
        Row: {
          id: string;
          agreement_id: string;
          actor_id: string;
          event_type:
            | "note"
            | "counterproposal"
            | "verification_submitted"
            | "cancellation_requested"
            | "dispute_opened"
            | "status_change"
            | "payment_update"
            | "terms_updated"
            | "evidence_submitted"
            | "review_status_changed"
            | "challenge_opened"
            | "appeal_requested"
            | "verification_badge_updated";
          summary: string;
          details: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          actor_id: string;
          event_type?:
            | "note"
            | "counterproposal"
            | "verification_submitted"
            | "cancellation_requested"
            | "dispute_opened"
            | "status_change"
            | "payment_update"
            | "terms_updated"
            | "evidence_submitted"
            | "review_status_changed"
            | "challenge_opened"
            | "appeal_requested"
            | "verification_badge_updated";
          summary: string;
          details?: string;
          created_at?: string;
        };
        Update: {
          event_type?:
            | "note"
            | "counterproposal"
            | "verification_submitted"
            | "cancellation_requested"
            | "dispute_opened"
            | "status_change"
            | "payment_update"
            | "terms_updated"
            | "evidence_submitted"
            | "review_status_changed"
            | "challenge_opened"
            | "appeal_requested"
            | "verification_badge_updated";
          summary?: string;
          details?: string;
        };
        Relationships: [];
      };
      agreement_evidence_items: {
        Row: {
          id: string;
          agreement_id: string;
          uploader_id: string;
          trade_type: "pledge_swap" | "donation_offset" | "mpgf" | "paid_action" | "other";
          evidence_type: "receipt" | "provider_record" | "manual_attestation" | "public_log" | "timestamped_commitment" | "third_party_review" | "other";
          schema_key: string;
          title: string;
          evidence_url: string;
          evidence_summary: string;
          status: "pending_evidence" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved";
          reviewer_confidence: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          uploader_id: string;
          trade_type?: "pledge_swap" | "donation_offset" | "mpgf" | "paid_action" | "other";
          evidence_type?: "receipt" | "provider_record" | "manual_attestation" | "public_log" | "timestamped_commitment" | "third_party_review" | "other";
          schema_key?: string;
          title: string;
          evidence_url?: string;
          evidence_summary?: string;
          status?: "pending_evidence" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved";
          reviewer_confidence?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          trade_type?: "pledge_swap" | "donation_offset" | "mpgf" | "paid_action" | "other";
          evidence_type?: "receipt" | "provider_record" | "manual_attestation" | "public_log" | "timestamped_commitment" | "third_party_review" | "other";
          schema_key?: string;
          title?: string;
          evidence_url?: string;
          evidence_summary?: string;
          status?: "pending_evidence" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved";
          reviewer_confidence?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      agreement_review_cases: {
        Row: {
          id: string;
          agreement_id: string;
          evidence_item_id: string | null;
          opened_by: string;
          assigned_reviewer_id: string | null;
          reviewer_role: "operator" | "validator" | "external_reviewer" | "admin";
          review_scope: string;
          status: "open" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved" | "appealed" | "closed";
          reviewer_conflict_state: "not_checked" | "no_conflict_declared" | "possible_conflict" | "conflict_disclosed" | "recused";
          neutral_review_assignment: "unassigned" | "operator_review_only" | "neutral_reviewer_assigned" | "neutral_panel_assigned" | "not_required_for_stage";
          conflict_of_interest_notes: string;
          review_panel_notes: string;
          reviewer_notes: string;
          public_reasoning_summary: string;
          sla_due_at: string;
          challenge_window_ends_at: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          appeal_requested_by: string | null;
          appeal_reason: string;
          appealed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agreement_id: string;
          evidence_item_id?: string | null;
          opened_by: string;
          assigned_reviewer_id?: string | null;
          reviewer_role?: "operator" | "validator" | "external_reviewer" | "admin";
          review_scope?: string;
          status?: "open" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved" | "appealed" | "closed";
          reviewer_conflict_state?: "not_checked" | "no_conflict_declared" | "possible_conflict" | "conflict_disclosed" | "recused";
          neutral_review_assignment?: "unassigned" | "operator_review_only" | "neutral_reviewer_assigned" | "neutral_panel_assigned" | "not_required_for_stage";
          conflict_of_interest_notes?: string;
          review_panel_notes?: string;
          reviewer_notes?: string;
          public_reasoning_summary?: string;
          sla_due_at?: string;
          challenge_window_ends_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          appeal_requested_by?: string | null;
          appeal_reason?: string;
          appealed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          evidence_item_id?: string | null;
          assigned_reviewer_id?: string | null;
          reviewer_role?: "operator" | "validator" | "external_reviewer" | "admin";
          review_scope?: string;
          status?: "open" | "under_review" | "challenge_window_open" | "reviewed_complete" | "disputed_unresolved" | "appealed" | "closed";
          reviewer_conflict_state?: "not_checked" | "no_conflict_declared" | "possible_conflict" | "conflict_disclosed" | "recused";
          neutral_review_assignment?: "unassigned" | "operator_review_only" | "neutral_reviewer_assigned" | "neutral_panel_assigned" | "not_required_for_stage";
          conflict_of_interest_notes?: string;
          review_panel_notes?: string;
          reviewer_notes?: string;
          public_reasoning_summary?: string;
          sla_due_at?: string;
          challenge_window_ends_at?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          appeal_requested_by?: string | null;
          appeal_reason?: string;
          appealed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      performance_bonds: {
        Row: {
          id: string;
          offer_id: string;
          swap_id: string | null;
          interest_id: string | null;
          party_id: string;
          counterparty_id: string | null;
          side: "offerer" | "taker";
          enabled: boolean;
          amount_cents: number;
          currency: string;
          evidence_due_at: string | null;
          challenge_window_days: 7 | 14 | 30;
          challenge_window_ends_at: string | null;
          evidence_schema: Json;
          additionality_statement: string;
          no_trade_baseline: string;
          forfeiture_rule: "neutral_release" | "counterparty_release" | "split_release";
          forfeiture_destination: "compromise_charity" | "mpgf" | "counterparty" | "split";
          forfeiture_destination_id: string | null;
          split_config: Json;
          reviewer_policy: string;
          status:
            | "not_enabled"
            | "draft"
            | "awaiting_funding"
            | "funded"
            | "active"
            | "evidence_due"
            | "evidence_submitted"
            | "challenge_window_open"
            | "accepted_by_counterparty"
            | "auto_refund_pending"
            | "refunded"
            | "challenged"
            | "under_review"
            | "accepted_after_review"
            | "rejected_after_review"
            | "forfeited"
            | "split_disbursed"
            | "cancelled"
            | "expired";
          funding_status:
            | "not_required"
            | "awaiting_funding"
            | "payment_pending"
            | "funded"
            | "refund_pending"
            | "refunded"
            | "release_pending"
            | "released"
            | "failed";
          payment_provider: string;
          payment_intent_id: string | null;
          counterparty_payout_consent: boolean;
          created_at: string;
          updated_at: string;
          locked_at: string | null;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          offer_id: string;
          swap_id?: string | null;
          interest_id?: string | null;
          party_id: string;
          counterparty_id?: string | null;
          side: "offerer" | "taker";
          enabled?: boolean;
          amount_cents: number;
          currency?: string;
          evidence_due_at?: string | null;
          challenge_window_days?: 7 | 14 | 30;
          challenge_window_ends_at?: string | null;
          evidence_schema?: Json;
          additionality_statement?: string;
          no_trade_baseline?: string;
          forfeiture_rule?: "neutral_release" | "counterparty_release" | "split_release";
          forfeiture_destination?: "compromise_charity" | "mpgf" | "counterparty" | "split";
          forfeiture_destination_id?: string | null;
          split_config?: Json;
          reviewer_policy?: string;
          status?:
            | "not_enabled"
            | "draft"
            | "awaiting_funding"
            | "funded"
            | "active"
            | "evidence_due"
            | "evidence_submitted"
            | "challenge_window_open"
            | "accepted_by_counterparty"
            | "auto_refund_pending"
            | "refunded"
            | "challenged"
            | "under_review"
            | "accepted_after_review"
            | "rejected_after_review"
            | "forfeited"
            | "split_disbursed"
            | "cancelled"
            | "expired";
          funding_status?:
            | "not_required"
            | "awaiting_funding"
            | "payment_pending"
            | "funded"
            | "refund_pending"
            | "refunded"
            | "release_pending"
            | "released"
            | "failed";
          payment_provider?: string;
          payment_intent_id?: string | null;
          counterparty_payout_consent?: boolean;
          created_at?: string;
          updated_at?: string;
          locked_at?: string | null;
          resolved_at?: string | null;
        };
        Update: {
          swap_id?: string | null;
          interest_id?: string | null;
          counterparty_id?: string | null;
          enabled?: boolean;
          amount_cents?: number;
          currency?: string;
          evidence_due_at?: string | null;
          challenge_window_days?: 7 | 14 | 30;
          challenge_window_ends_at?: string | null;
          evidence_schema?: Json;
          additionality_statement?: string;
          no_trade_baseline?: string;
          forfeiture_rule?: "neutral_release" | "counterparty_release" | "split_release";
          forfeiture_destination?: "compromise_charity" | "mpgf" | "counterparty" | "split";
          forfeiture_destination_id?: string | null;
          split_config?: Json;
          reviewer_policy?: string;
          status?:
            | "not_enabled"
            | "draft"
            | "awaiting_funding"
            | "funded"
            | "active"
            | "evidence_due"
            | "evidence_submitted"
            | "challenge_window_open"
            | "accepted_by_counterparty"
            | "auto_refund_pending"
            | "refunded"
            | "challenged"
            | "under_review"
            | "accepted_after_review"
            | "rejected_after_review"
            | "forfeited"
            | "split_disbursed"
            | "cancelled"
            | "expired";
          funding_status?:
            | "not_required"
            | "awaiting_funding"
            | "payment_pending"
            | "funded"
            | "refund_pending"
            | "refunded"
            | "release_pending"
            | "released"
            | "failed";
          payment_provider?: string;
          payment_intent_id?: string | null;
          counterparty_payout_consent?: boolean;
          updated_at?: string;
          locked_at?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      bond_evidence: {
        Row: {
          id: string;
          bond_id: string;
          submitted_by: string;
          submitted_at: string;
          evidence_text: string;
          evidence_urls: string[];
          attachments: Json;
          visibility: "counterparty_only" | "platform_reviewer_only" | "public_proof" | "mixed_redacted";
          redaction_notes: string;
          attestation: boolean;
          status:
            | "submitted"
            | "accepted_by_counterparty"
            | "challenged"
            | "more_evidence_requested"
            | "accepted_after_review"
            | "rejected_after_review";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bond_id: string;
          submitted_by: string;
          submitted_at?: string;
          evidence_text?: string;
          evidence_urls?: string[];
          attachments?: Json;
          visibility?: "counterparty_only" | "platform_reviewer_only" | "public_proof" | "mixed_redacted";
          redaction_notes?: string;
          attestation: boolean;
          status?:
            | "submitted"
            | "accepted_by_counterparty"
            | "challenged"
            | "more_evidence_requested"
            | "accepted_after_review"
            | "rejected_after_review";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          evidence_text?: string;
          evidence_urls?: string[];
          attachments?: Json;
          visibility?: "counterparty_only" | "platform_reviewer_only" | "public_proof" | "mixed_redacted";
          redaction_notes?: string;
          attestation?: boolean;
          status?:
            | "submitted"
            | "accepted_by_counterparty"
            | "challenged"
            | "more_evidence_requested"
            | "accepted_after_review"
            | "rejected_after_review";
          updated_at?: string;
        };
        Relationships: [];
      };
      bond_challenges: {
        Row: {
          id: string;
          bond_id: string;
          challenged_by: string;
          challenged_at: string;
          reason: string;
          specific_objection: string;
          requested_outcome: string;
          bad_faith_flag: boolean;
          status:
            | "open"
            | "under_review"
            | "accepted"
            | "rejected"
            | "more_evidence_requested"
            | "closed"
            | "bad_faith_flagged";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          bond_id: string;
          challenged_by: string;
          challenged_at?: string;
          reason: string;
          specific_objection: string;
          requested_outcome?: string;
          bad_faith_flag?: boolean;
          status?:
            | "open"
            | "under_review"
            | "accepted"
            | "rejected"
            | "more_evidence_requested"
            | "closed"
            | "bad_faith_flagged";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reason?: string;
          specific_objection?: string;
          requested_outcome?: string;
          bad_faith_flag?: boolean;
          status?:
            | "open"
            | "under_review"
            | "accepted"
            | "rejected"
            | "more_evidence_requested"
            | "closed"
            | "bad_faith_flagged";
          updated_at?: string;
        };
        Relationships: [];
      };
      bond_adjudications: {
        Row: {
          id: string;
          bond_id: string;
          challenge_id: string | null;
          reviewer_id: string;
          decision: "accept" | "reject" | "request_more_evidence";
          decision_reason: string;
          decided_at: string;
          appeal_allowed: boolean;
          appeal_deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bond_id: string;
          challenge_id?: string | null;
          reviewer_id: string;
          decision: "accept" | "reject" | "request_more_evidence";
          decision_reason: string;
          decided_at?: string;
          appeal_allowed?: boolean;
          appeal_deadline?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      bond_ledger_entries: {
        Row: {
          id: string;
          bond_id: string;
          type: "fund" | "refund" | "release" | "split_release" | "adjustment";
          amount_cents: number;
          currency: string;
          destination_type: "party" | "counterparty" | "compromise_charity" | "mpgf" | "platform_manual_review";
          destination_id: string | null;
          status:
            | "pending"
            | "completed"
            | "not_required"
            | "awaiting_funding"
            | "payment_pending"
            | "funded"
            | "refund_pending"
            | "refunded"
            | "release_pending"
            | "released"
            | "failed";
          idempotency_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bond_id: string;
          type: "fund" | "refund" | "release" | "split_release" | "adjustment";
          amount_cents: number;
          currency?: string;
          destination_type: "party" | "counterparty" | "compromise_charity" | "mpgf" | "platform_manual_review";
          destination_id?: string | null;
          status?:
            | "pending"
            | "completed"
            | "not_required"
            | "awaiting_funding"
            | "payment_pending"
            | "funded"
            | "refund_pending"
            | "refunded"
            | "release_pending"
            | "released"
            | "failed";
          idempotency_key: string;
          created_at?: string;
        };
        Update: {
          status?:
            | "pending"
            | "completed"
            | "not_required"
            | "awaiting_funding"
            | "payment_pending"
            | "funded"
            | "refund_pending"
            | "refunded"
            | "release_pending"
            | "released"
            | "failed";
        };
        Relationships: [];
      };
      performance_bond_audit_events: {
        Row: {
          id: string;
          bond_id: string;
          actor_id: string | null;
          actor_role: "party" | "counterparty" | "reviewer" | "system";
          event_type: string;
          from_status: string;
          to_status: string;
          reason: string;
          metadata: Json;
          idempotency_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bond_id: string;
          actor_id?: string | null;
          actor_role: "party" | "counterparty" | "reviewer" | "system";
          event_type: string;
          from_status: string;
          to_status: string;
          reason: string;
          metadata?: Json;
          idempotency_key: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      profile_verification_badges: {
        Row: {
          id: string;
          profile_id: string;
          badge_type: "identity_verified" | "organization_verified" | "payment_evidence_verified" | "completion_reviewed" | "repeat_counterparty";
          status: "pending" | "verified" | "rejected" | "revoked";
          evidence_summary: string;
          source: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          badge_type: "identity_verified" | "organization_verified" | "payment_evidence_verified" | "completion_reviewed" | "repeat_counterparty";
          status?: "pending" | "verified" | "rejected" | "revoked";
          evidence_summary?: string;
          source?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "verified" | "rejected" | "revoked";
          evidence_summary?: string;
          source?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      email_outbox: {
        Row: {
          id: string;
          profile_id: string | null;
          recipient_email: string;
          subject: string;
          body: string;
          status: "queued" | "sent" | "failed" | "suppressed";
          provider: string;
          attempt_count: number;
          last_error: string;
          source_kind: string | null;
          source_id: string | null;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          recipient_email: string;
          subject: string;
          body: string;
          status?: "queued" | "sent" | "failed" | "suppressed";
          provider?: string;
          attempt_count?: number;
          last_error?: string;
          source_kind?: string | null;
          source_id?: string | null;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          recipient_email?: string;
          subject?: string;
          body?: string;
          status?: "queued" | "sent" | "failed" | "suppressed";
          provider?: string;
          attempt_count?: number;
          last_error?: string;
          source_kind?: string | null;
          source_id?: string | null;
          sent_at?: string | null;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          id: string;
          profile_id: string;
          label: string;
          causes: string[];
          query: string;
          min_score: number;
          cadence: "manual" | "daily" | "weekly" | "monthly";
          status: "active" | "paused";
          last_scanned_at: string | null;
          filters_json: Json;
          notify_on_live_match: boolean;
          source_route: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          label: string;
          causes?: string[];
          query?: string;
          min_score?: number;
          cadence?: "manual" | "daily" | "weekly" | "monthly";
          status?: "active" | "paused";
          last_scanned_at?: string | null;
          filters_json?: Json;
          notify_on_live_match?: boolean;
          source_route?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          causes?: string[];
          query?: string;
          min_score?: number;
          cadence?: "manual" | "daily" | "weekly" | "monthly";
          status?: "active" | "paused";
          last_scanned_at?: string | null;
          filters_json?: Json;
          notify_on_live_match?: boolean;
          source_route?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_follows: {
        Row: {
          follower_id: string;
          followed_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          followed_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [];
      };
      offer_recommendations: {
        Row: {
          id: string;
          recommender_id: string;
          source_offer_id: string | null;
          recommended_offer_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          recommender_id: string;
          source_offer_id?: string | null;
          recommended_offer_id: string;
          created_at?: string;
        };
        Update: {
          source_offer_id?: string | null;
          recommended_offer_id?: string;
        };
        Relationships: [];
      };
      offer_comments: {
        Row: {
          id: string;
          offer_id: string;
          author_id: string;
          parent_id: string | null;
          depth: number;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          author_id: string;
          parent_id?: string | null;
          depth?: number;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comment_votes: {
        Row: {
          comment_id: string;
          user_id: string;
          value: number;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          user_id: string;
          value: number;
          created_at?: string;
        };
        Update: {
          value?: number;
        };
        Relationships: [];
      };
      offer_carts: {
        Row: {
          offer_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          offer_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
        Relationships: [];
      };
      wish_profiles: {
        Row: {
          profile_id: string;
          participant_kind: "individual" | "collective" | "institution";
          collective_name: string;
          causes: string[];
          location_city: string | null;
          location_region: string | null;
          capabilities: string;
          constraints: string;
          verification_preferences: string;
          uncertainty_notes: string;
          openness_to_payment: boolean;
          openness_to_pledges: boolean;
          background_search_enabled: boolean;
          inbound_delegate_discovery:
            | "off"
            | "cohort_only"
            | "partner_matchmaker"
            | "public_broad_preview";
          inbound_delegate_purpose_codes: string[];
          inbound_delegate_purpose_bindings: Record<string, unknown>;
          inbound_delegate_surfaces: string[];
          inbound_delegate_surface_budget_per_window: Record<string, unknown>;
          inbound_delegate_pending_intro_limit: number | null;
          inbound_delegate_cooloff_until: string | null;
          inbound_delegate_confirmed_at: string | null;
          inbound_delegate_expires_at: string | null;
          candidate_inbound_budget_version: string;
          candidate_exposure_version: string;
          allowed_cohort_ids: string[];
          manual_source_review_enabled: boolean;
          notification_email_enabled: boolean;
          notification_dashboard_enabled: boolean;
          privacy_stage: "strict" | "broad" | "limited";
          brokerage_preference: string;
          match_frequency: "manual" | "weekly" | "monthly";
          is_discoverable: boolean;
          share_public_preview: boolean;
          share_location: boolean;
          public_preview: string;
          safety_status: "clear" | "flagged" | "blocked";
          safety_notes: string;
          sensitive_ciphertexts: Record<string, string>;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          participant_kind?: "individual" | "collective" | "institution";
          collective_name?: string;
          causes?: string[];
          location_city?: string | null;
          location_region?: string | null;
          capabilities?: string;
          constraints?: string;
          verification_preferences?: string;
          uncertainty_notes?: string;
          openness_to_payment?: boolean;
          openness_to_pledges?: boolean;
          background_search_enabled?: boolean;
          inbound_delegate_discovery?:
            | "off"
            | "cohort_only"
            | "partner_matchmaker"
            | "public_broad_preview";
          inbound_delegate_purpose_codes?: string[];
          inbound_delegate_purpose_bindings?: Record<string, unknown>;
          inbound_delegate_surfaces?: string[];
          inbound_delegate_surface_budget_per_window?: Record<string, unknown>;
          inbound_delegate_pending_intro_limit?: number | null;
          inbound_delegate_cooloff_until?: string | null;
          inbound_delegate_confirmed_at?: string | null;
          inbound_delegate_expires_at?: string | null;
          candidate_inbound_budget_version?: string;
          candidate_exposure_version?: string;
          allowed_cohort_ids?: string[];
          manual_source_review_enabled?: boolean;
          notification_email_enabled?: boolean;
          notification_dashboard_enabled?: boolean;
          privacy_stage?: "strict" | "broad" | "limited";
          brokerage_preference?: string;
          match_frequency?: "manual" | "weekly" | "monthly";
          is_discoverable?: boolean;
          share_public_preview?: boolean;
          share_location?: boolean;
          public_preview?: string;
          safety_status?: "clear" | "flagged" | "blocked";
          safety_notes?: string;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          participant_kind?: "individual" | "collective" | "institution";
          collective_name?: string;
          causes?: string[];
          location_city?: string | null;
          location_region?: string | null;
          capabilities?: string;
          constraints?: string;
          verification_preferences?: string;
          uncertainty_notes?: string;
          openness_to_payment?: boolean;
          openness_to_pledges?: boolean;
          background_search_enabled?: boolean;
          inbound_delegate_discovery?:
            | "off"
            | "cohort_only"
            | "partner_matchmaker"
            | "public_broad_preview";
          inbound_delegate_purpose_codes?: string[];
          inbound_delegate_purpose_bindings?: Record<string, unknown>;
          inbound_delegate_surfaces?: string[];
          inbound_delegate_surface_budget_per_window?: Record<string, unknown>;
          inbound_delegate_pending_intro_limit?: number | null;
          inbound_delegate_cooloff_until?: string | null;
          inbound_delegate_confirmed_at?: string | null;
          inbound_delegate_expires_at?: string | null;
          candidate_inbound_budget_version?: string;
          candidate_exposure_version?: string;
          allowed_cohort_ids?: string[];
          manual_source_review_enabled?: boolean;
          notification_email_enabled?: boolean;
          notification_dashboard_enabled?: boolean;
          privacy_stage?: "strict" | "broad" | "limited";
          brokerage_preference?: string;
          match_frequency?: "manual" | "weekly" | "monthly";
          is_discoverable?: boolean;
          share_public_preview?: boolean;
          share_location?: boolean;
          public_preview?: string;
          safety_status?: "clear" | "flagged" | "blocked";
          safety_notes?: string;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wish_entries: {
        Row: {
          id: string;
          profile_id: string;
          entry_type: "wish" | "offer" | "ask";
          cause_area: string;
          title: string;
          body: string;
          body_ciphertext: string;
          body_encryption_version: string;
          trade_mode: string;
          visibility: "private" | "preview";
          safety_status: "clear" | "flagged" | "blocked";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          entry_type: "wish" | "offer" | "ask";
          cause_area?: string;
          title?: string;
          body: string;
          body_ciphertext?: string;
          body_encryption_version?: string;
          trade_mode?: string;
          visibility?: "private" | "preview";
          safety_status?: "clear" | "flagged" | "blocked";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          entry_type?: "wish" | "offer" | "ask";
          cause_area?: string;
          title?: string;
          body?: string;
          body_ciphertext?: string;
          body_encryption_version?: string;
          trade_mode?: string;
          visibility?: "private" | "preview";
          safety_status?: "clear" | "flagged" | "blocked";
          updated_at?: string;
        };
        Relationships: [];
      };
      match_suggestions: {
        Row: {
          id: string;
          profile_a_id: string;
          profile_b_id: string;
          profile_a_entry_id: string | null;
          profile_b_entry_id: string | null;
          reason_for_a: string;
          reason_for_b: string;
          score: number;
          match_basis: string[];
          shared_causes: string[];
          suggested_first_step: string;
          risk_notes: string;
          generated_by: string;
          background_owner_profile_id: string | null;
          status: "suggested" | "dismissed" | "introduced" | "archived";
          dedupe_key: string;
          identity_revealed: boolean;
          last_scored_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_a_id: string;
          profile_b_id: string;
          profile_a_entry_id?: string | null;
          profile_b_entry_id?: string | null;
          reason_for_a: string;
          reason_for_b: string;
          score?: number;
          match_basis?: string[];
          shared_causes?: string[];
          suggested_first_step?: string;
          risk_notes?: string;
          generated_by?: string;
          background_owner_profile_id?: string | null;
          status?: "suggested" | "dismissed" | "introduced" | "archived";
          dedupe_key?: string;
          identity_revealed?: boolean;
          last_scored_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reason_for_a?: string;
          reason_for_b?: string;
          score?: number;
          match_basis?: string[];
          shared_causes?: string[];
          suggested_first_step?: string;
          risk_notes?: string;
          generated_by?: string;
          background_owner_profile_id?: string | null;
          status?: "suggested" | "dismissed" | "introduced" | "archived";
          dedupe_key?: string;
          identity_revealed?: boolean;
          last_scored_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_consents: {
        Row: {
          match_id: string;
          profile_id: string;
          note: string;
          consented_at: string;
        };
        Insert: {
          match_id: string;
          profile_id: string;
          note?: string;
          consented_at?: string;
        };
        Update: {
          note?: string;
          consented_at?: string;
        };
        Relationships: [];
      };
      wish_notifications: {
        Row: {
          id: string;
          profile_id: string;
          match_id: string | null;
          kind: "match" | "consent" | "safety" | "system";
          title: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          match_id?: string | null;
          kind?: "match" | "consent" | "safety" | "system";
          title: string;
          body?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          kind?: "match" | "consent" | "safety" | "system";
          title?: string;
          body?: string;
          read_at?: string | null;
        };
        Relationships: [];
      };
      profile_sources: {
        Row: {
          id: string;
          profile_id: string;
          source_type: "manual" | "social" | "blog" | "chat_history" | "email" | "calendar" | "other";
          label: string;
          url: string;
          access_level: "none" | "manual_summary" | "metadata_only";
          content_kind:
            | "manual_summary"
            | "pasted_excerpt"
            | "public_post"
            | "email_note"
            | "chat_note"
            | "calendar_note";
          notes: string;
          snapshot_excerpt: string;
          captured_tags: string[];
          needs_review: boolean;
          imported_at: string | null;
          retention_expires_at: string;
          source_connection_id: string | null;
          is_active: boolean;
          sensitive_ciphertexts: Record<string, string>;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          source_type?: "manual" | "social" | "blog" | "chat_history" | "email" | "calendar" | "other";
          label: string;
          url?: string;
          access_level?: "none" | "manual_summary" | "metadata_only";
          content_kind?:
            | "manual_summary"
            | "pasted_excerpt"
            | "public_post"
            | "email_note"
            | "chat_note"
            | "calendar_note";
          notes?: string;
          snapshot_excerpt?: string;
          captured_tags?: string[];
          needs_review?: boolean;
          imported_at?: string | null;
          retention_expires_at?: string;
          source_connection_id?: string | null;
          is_active?: boolean;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_type?: "manual" | "social" | "blog" | "chat_history" | "email" | "calendar" | "other";
          label?: string;
          url?: string;
          access_level?: "none" | "manual_summary" | "metadata_only";
          content_kind?:
            | "manual_summary"
            | "pasted_excerpt"
            | "public_post"
            | "email_note"
            | "chat_note"
            | "calendar_note";
          notes?: string;
          snapshot_excerpt?: string;
          captured_tags?: string[];
          needs_review?: boolean;
          imported_at?: string | null;
          retention_expires_at?: string;
          source_connection_id?: string | null;
          is_active?: boolean;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_helper_runs: {
        Row: {
          id: string;
          profile_id: string;
          trigger_kind: "saved_search" | "new_summary" | "manual_scan" | "scheduled_digest";
          state: "queued" | "running" | "retry" | "done" | "failed" | "cancelled";
          attempts: number;
          next_run_at: string;
          query_fingerprint: string;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          redacted_receipt_id: string | null;
          retention_expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          trigger_kind: "saved_search" | "new_summary" | "manual_scan" | "scheduled_digest";
          state?: "queued" | "running" | "retry" | "done" | "failed" | "cancelled";
          attempts?: number;
          next_run_at?: string;
          query_fingerprint: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          trigger_kind?: "saved_search" | "new_summary" | "manual_scan" | "scheduled_digest";
          state?: "queued" | "running" | "retry" | "done" | "failed" | "cancelled";
          attempts?: number;
          next_run_at?: string;
          query_fingerprint?: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_candidate_exposure_counters: {
        Row: {
          id: string;
          candidate_profile_id: string | null;
          counter_reference_state: "active" | "redacted" | "anonymized";
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          audience_scope: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          cohort_scope_id: string;
          window_start: string;
          window_end: string;
          surface_count: number;
          pending_intro_count: number;
          suppressed_for_budget_count: number;
          budget_state: "clear" | "near_limit" | "exhausted" | "cooloff";
          candidate_inbound_budget_version_snapshot: string;
          last_surface_at: string | null;
          last_intro_request_at: string | null;
          retention_expires_at: string;
          anonymized_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_profile_id?: string | null;
          counter_reference_state?: "active" | "redacted" | "anonymized";
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          audience_scope?: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          cohort_scope_id?: string;
          window_start: string;
          window_end: string;
          surface_count?: number;
          pending_intro_count?: number;
          suppressed_for_budget_count?: number;
          budget_state?: "clear" | "near_limit" | "exhausted" | "cooloff";
          candidate_inbound_budget_version_snapshot?: string;
          last_surface_at?: string | null;
          last_intro_request_at?: string | null;
          retention_expires_at?: string;
          anonymized_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          candidate_profile_id?: string | null;
          counter_reference_state?: "active" | "redacted" | "anonymized";
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          audience_scope?: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          cohort_scope_id?: string;
          window_start?: string;
          window_end?: string;
          surface_count?: number;
          pending_intro_count?: number;
          suppressed_for_budget_count?: number;
          budget_state?: "clear" | "near_limit" | "exhausted" | "cooloff";
          candidate_inbound_budget_version_snapshot?: string;
          last_surface_at?: string | null;
          last_intro_request_at?: string | null;
          retention_expires_at?: string;
          anonymized_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_opportunity_briefs: {
        Row: {
          id: string;
          profile_id: string;
          candidate_profile_id: string | null;
          match_id: string | null;
          helper_run_id: string | null;
          title: string;
          confidence_band: "High" | "Moderate" | "Tentative" | "Exploratory";
          delivery_state: "pending" | "delivered" | "opened" | "interested" | "maybe_later" | "dismissed" | "expired";
          factor_codes: string[];
          shared_counts: Record<string, unknown>;
          safe_summary: string;
          redacted_fields: string[];
          why_text: string;
          next_step_type:
            | "answer_questions"
            | "request_intro_packet"
            | "request_detail"
            | "review_profile"
            | "mute_or_dismiss";
          hidden_fields_notice: string;
          human_review_required: boolean;
          reveal_consequence_notice: string;
          review_status: "human_review_required" | "review_cleared" | "blocked";
          status: "open" | "opened" | "dismissed" | "interested" | "maybe_later" | "muted" | "packet_requested" | "expired";
          expires_at: string;
          seen_at: string | null;
          feedback_reason:
            | "not_relevant"
            | "already_connected"
            | "bad_timing"
            | "too_vague"
            | "privacy_concern"
            | "safety_concern"
            | "maybe_later"
            | "interested"
            | null;
          cooloff_until: string | null;
          explanation_version: string;
          source_scope_version: string;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          output_schema_version: "background-opportunity-brief-card-v2";
          redacted_receipt_id: string | null;
          retention_expires_at: string;
          anonymized_at: string | null;
          generic_dependency_label: "valid" | "stale_or_unavailable" | "review_required";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          candidate_profile_id?: string | null;
          match_id?: string | null;
          helper_run_id?: string | null;
          title?: string;
          confidence_band?: "High" | "Moderate" | "Tentative" | "Exploratory";
          delivery_state?: "pending" | "delivered" | "opened" | "interested" | "maybe_later" | "dismissed" | "expired";
          factor_codes?: string[];
          shared_counts?: Record<string, unknown>;
          safe_summary?: string;
          redacted_fields?: string[];
          why_text?: string;
          next_step_type?:
            | "answer_questions"
            | "request_intro_packet"
            | "request_detail"
            | "review_profile"
            | "mute_or_dismiss";
          hidden_fields_notice?: string;
          human_review_required?: boolean;
          reveal_consequence_notice?: string;
          review_status?: "human_review_required" | "review_cleared" | "blocked";
          status?: "open" | "opened" | "dismissed" | "interested" | "maybe_later" | "muted" | "packet_requested" | "expired";
          expires_at?: string;
          seen_at?: string | null;
          feedback_reason?:
            | "not_relevant"
            | "already_connected"
            | "bad_timing"
            | "too_vague"
            | "privacy_concern"
            | "safety_concern"
            | "maybe_later"
            | "interested"
            | null;
          cooloff_until?: string | null;
          explanation_version?: string;
          source_scope_version?: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          output_schema_version?: "background-opportunity-brief-card-v2";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          anonymized_at?: string | null;
          generic_dependency_label?: "valid" | "stale_or_unavailable" | "review_required";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          candidate_profile_id?: string | null;
          match_id?: string | null;
          helper_run_id?: string | null;
          title?: string;
          confidence_band?: "High" | "Moderate" | "Tentative" | "Exploratory";
          delivery_state?: "pending" | "delivered" | "opened" | "interested" | "maybe_later" | "dismissed" | "expired";
          factor_codes?: string[];
          shared_counts?: Record<string, unknown>;
          safe_summary?: string;
          redacted_fields?: string[];
          why_text?: string;
          next_step_type?:
            | "answer_questions"
            | "request_intro_packet"
            | "request_detail"
            | "review_profile"
            | "mute_or_dismiss";
          hidden_fields_notice?: string;
          human_review_required?: boolean;
          reveal_consequence_notice?: string;
          review_status?: "human_review_required" | "review_cleared" | "blocked";
          status?: "open" | "opened" | "dismissed" | "interested" | "maybe_later" | "muted" | "packet_requested" | "expired";
          expires_at?: string;
          seen_at?: string | null;
          feedback_reason?:
            | "not_relevant"
            | "already_connected"
            | "bad_timing"
            | "too_vague"
            | "privacy_concern"
            | "safety_concern"
            | "maybe_later"
            | "interested"
            | null;
          cooloff_until?: string | null;
          explanation_version?: string;
          source_scope_version?: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          output_schema_version?: "background-opportunity-brief-card-v2";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          anonymized_at?: string | null;
          generic_dependency_label?: "valid" | "stale_or_unavailable" | "review_required";
          updated_at?: string;
        };
        Relationships: [];
      };
      background_match_feedback: {
        Row: {
          id: string;
          profile_id: string;
          opportunity_brief_id: string;
          match_id: string | null;
          outcome: "dismissed" | "maybe_later" | "interested";
          reason_code:
            | "not_relevant"
            | "already_connected"
            | "bad_timing"
            | "too_vague"
            | "privacy_concern"
            | "safety_concern"
            | "maybe_later"
            | "interested";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          opportunity_brief_id: string;
          match_id?: string | null;
          outcome: "dismissed" | "maybe_later" | "interested";
          reason_code:
            | "not_relevant"
            | "already_connected"
            | "bad_timing"
            | "too_vague"
            | "privacy_concern"
            | "safety_concern"
            | "maybe_later"
            | "interested";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          match_id?: string | null;
          outcome?: "dismissed" | "maybe_later" | "interested";
          reason_code?:
            | "not_relevant"
            | "already_connected"
            | "bad_timing"
            | "too_vague"
            | "privacy_concern"
            | "safety_concern"
            | "maybe_later"
            | "interested";
          updated_at?: string;
        };
        Relationships: [];
      };
      background_intro_packets: {
        Row: {
          id: string;
          opportunity_brief_id: string | null;
          match_id: string | null;
          requester_profile_id: string;
          counterparty_profile_id: string | null;
          purpose: string;
          requester_answers: Record<string, unknown>;
          mutual_questions: string[];
          requested_field_keys: string[];
          reveal_capsule: string;
          review_state:
            | "draft"
            | "requested"
            | "under_review"
            | "approved"
            | "changes_requested"
            | "declined"
            | "sent";
          reviewer_notes: string;
          appeal_status: "none" | "requested" | "under_review" | "resolved" | "dismissed";
          appeal_reason: string;
          appealed_at: string | null;
          appeal_resolved_at: string | null;
          appeal_resolution_note: string;
          requester_contact_approved_at: string | null;
          counterparty_contact_approved_at: string | null;
          contact_approval_status:
            | "not_requested"
            | "requester_approved"
            | "counterparty_approved"
            | "mutual_approved"
            | "withdrawn";
          contact_approval_requires_fresh_mfa: boolean;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          redacted_receipt_id: string | null;
          retention_expires_at: string;
          anonymized_at: string | null;
          sla_due_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          opportunity_brief_id?: string | null;
          match_id?: string | null;
          requester_profile_id: string;
          counterparty_profile_id?: string | null;
          purpose?: string;
          requester_answers?: Record<string, unknown>;
          mutual_questions?: string[];
          requested_field_keys?: string[];
          reveal_capsule?: string;
          review_state?:
            | "draft"
            | "requested"
            | "under_review"
            | "approved"
            | "changes_requested"
            | "declined"
            | "sent";
          reviewer_notes?: string;
          appeal_status?: "none" | "requested" | "under_review" | "resolved" | "dismissed";
          appeal_reason?: string;
          appealed_at?: string | null;
          appeal_resolved_at?: string | null;
          appeal_resolution_note?: string;
          requester_contact_approved_at?: string | null;
          counterparty_contact_approved_at?: string | null;
          contact_approval_status?:
            | "not_requested"
            | "requester_approved"
            | "counterparty_approved"
            | "mutual_approved"
            | "withdrawn";
          contact_approval_requires_fresh_mfa?: boolean;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          anonymized_at?: string | null;
          sla_due_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          opportunity_brief_id?: string | null;
          match_id?: string | null;
          counterparty_profile_id?: string | null;
          purpose?: string;
          requester_answers?: Record<string, unknown>;
          mutual_questions?: string[];
          requested_field_keys?: string[];
          reveal_capsule?: string;
          review_state?:
            | "draft"
            | "requested"
            | "under_review"
            | "approved"
            | "changes_requested"
            | "declined"
            | "sent";
          reviewer_notes?: string;
          appeal_status?: "none" | "requested" | "under_review" | "resolved" | "dismissed";
          appeal_reason?: string;
          appealed_at?: string | null;
          appeal_resolved_at?: string | null;
          appeal_resolution_note?: string;
          requester_contact_approved_at?: string | null;
          counterparty_contact_approved_at?: string | null;
          contact_approval_status?:
            | "not_requested"
            | "requester_approved"
            | "counterparty_approved"
            | "mutual_approved"
            | "withdrawn";
          contact_approval_requires_fresh_mfa?: boolean;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          anonymized_at?: string | null;
          sla_due_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_delegate_receipts: {
        Row: {
          id: string;
          profile_id: string;
          receipt_kind: "delegate_run" | "opportunity_brief" | "stale_transition" | "intro_request";
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          subject_kind: "helper_run" | "background_helper_run" | "opportunity_brief" | "intro_packet";
          subject_id: string | null;
          public_summary: string;
          factor_count_bucket: "withheld" | "none" | "1" | "2_to_3" | "4_plus";
          blocker_count_bucket: "withheld" | "none" | "1" | "2_to_3" | "4_plus";
          redacted_payload: Record<string, unknown>;
          status: "active" | "expired" | "anonymized" | "held";
          retention_expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          receipt_kind: "delegate_run" | "opportunity_brief" | "stale_transition" | "intro_request";
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          subject_kind: "helper_run" | "background_helper_run" | "opportunity_brief" | "intro_packet";
          subject_id?: string | null;
          public_summary?: string;
          factor_count_bucket?: "withheld" | "none" | "1" | "2_to_3" | "4_plus";
          blocker_count_bucket?: "withheld" | "none" | "1" | "2_to_3" | "4_plus";
          redacted_payload?: Record<string, unknown>;
          status?: "active" | "expired" | "anonymized" | "held";
          retention_expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          public_summary?: string;
          factor_count_bucket?: "withheld" | "none" | "1" | "2_to_3" | "4_plus";
          blocker_count_bucket?: "withheld" | "none" | "1" | "2_to_3" | "4_plus";
          redacted_payload?: Record<string, unknown>;
          status?: "active" | "expired" | "anonymized" | "held";
          retention_expires_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_grant_receipts: {
        Row: {
          id: string;
          profile_id: string;
          counterparty_id: string | null;
          grant_id: string | null;
          receipt_kind: "disclosure_grant" | "source_summary" | "connector_consent";
          purpose: string;
          field_keys: string[];
          audience_stage: "registry" | "consent" | "introduced";
          status: "active" | "revoked" | "expired";
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          counterparty_id?: string | null;
          grant_id?: string | null;
          receipt_kind?: "disclosure_grant" | "source_summary" | "connector_consent";
          purpose?: string;
          field_keys?: string[];
          audience_stage?: "registry" | "consent" | "introduced";
          status?: "active" | "revoked" | "expired";
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          counterparty_id?: string | null;
          grant_id?: string | null;
          receipt_kind?: "disclosure_grant" | "source_summary" | "connector_consent";
          purpose?: string;
          field_keys?: string[];
          audience_stage?: "registry" | "consent" | "introduced";
          status?: "active" | "revoked" | "expired";
          expires_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      background_candidate_reference_handles: {
        Row: {
          id: string;
          delegate_run_id: string;
          handle_token: string;
          candidate_profile_id: string | null;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          cohort_scope_id: string | null;
          handle_state: "active" | "redacted" | "anonymized" | "expired";
          allowed_resolution_reasons: Array<
            "operator_review" | "mutual_consent" | "safety_hold" | "legal_hold"
          >;
          policy_decision_id: string | null;
          retention_expires_at: string;
          resolved_at: string | null;
          redacted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          delegate_run_id: string;
          handle_token: string;
          candidate_profile_id?: string | null;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          cohort_scope_id?: string | null;
          handle_state?: "active" | "redacted" | "anonymized" | "expired";
          allowed_resolution_reasons?: Array<
            "operator_review" | "mutual_consent" | "safety_hold" | "legal_hold"
          >;
          policy_decision_id?: string | null;
          retention_expires_at: string;
          resolved_at?: string | null;
          redacted_at?: string | null;
          created_at?: string;
        };
        Update: {
          handle_state?: "active" | "redacted" | "anonymized" | "expired";
          candidate_profile_id?: string | null;
          allowed_resolution_reasons?: Array<
            "operator_review" | "mutual_consent" | "safety_hold" | "legal_hold"
          >;
          policy_decision_id?: string | null;
          retention_expires_at?: string;
          resolved_at?: string | null;
          redacted_at?: string | null;
        };
        Relationships: [];
      };
      background_entity_resolution_claims: {
        Row: {
          id: string;
          subject_profile_id: string;
          entity_kind: "person" | "organization" | "collective" | "partner_seat";
          resolution_kind:
            | "self_claimed"
            | "verified_domain"
            | "verified_document"
            | "operator_confirmed"
            | "partner_attested"
            | "imported_alias"
            | "model_suggested_duplicate";
          resolution_state:
            | "confirmed"
            | "pending_review"
            | "disputed"
            | "rejected"
            | "stale"
            | "expired";
          canonical_entity_ref: string | null;
          evidence_redacted_summary: string;
          allowed_purpose_bindings: Array<Record<string, unknown>>;
          allowed_surface_keys: string[];
          reviewed_by: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          subject_profile_id: string;
          entity_kind: "person" | "organization" | "collective" | "partner_seat";
          resolution_kind:
            | "self_claimed"
            | "verified_domain"
            | "verified_document"
            | "operator_confirmed"
            | "partner_attested"
            | "imported_alias"
            | "model_suggested_duplicate";
          resolution_state?:
            | "confirmed"
            | "pending_review"
            | "disputed"
            | "rejected"
            | "stale"
            | "expired";
          canonical_entity_ref?: string | null;
          evidence_redacted_summary?: string;
          allowed_purpose_bindings?: Array<Record<string, unknown>>;
          allowed_surface_keys?: string[];
          reviewed_by?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          resolution_kind?:
            | "self_claimed"
            | "verified_domain"
            | "verified_document"
            | "operator_confirmed"
            | "partner_attested"
            | "imported_alias"
            | "model_suggested_duplicate";
          resolution_state?:
            | "confirmed"
            | "pending_review"
            | "disputed"
            | "rejected"
            | "stale"
            | "expired";
          canonical_entity_ref?: string | null;
          evidence_redacted_summary?: string;
          allowed_purpose_bindings?: Array<Record<string, unknown>>;
          allowed_surface_keys?: string[];
          reviewed_by?: string | null;
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_power_asymmetry_reviews: {
        Row: {
          id: string;
          requester_handle_id: string | null;
          candidate_handle_id: string | null;
          relationship_context:
            | "none"
            | "funder_grantee"
            | "employer_applicant"
            | "landlord_tenant"
            | "clinician_client"
            | "legal_or_immigration_adviser_client"
            | "mentor_mentee"
            | "platform_admin_user"
            | "regulator_regulated_party";
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          review_state: "pending_review" | "approved" | "blocked" | "expired" | "revoked";
          allowed_surface_keys: string[];
          safeguard_label: string;
          boost_policy: "boosts_prohibited";
          redacted_summary: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_handle_id?: string | null;
          candidate_handle_id?: string | null;
          relationship_context:
            | "none"
            | "funder_grantee"
            | "employer_applicant"
            | "landlord_tenant"
            | "clinician_client"
            | "legal_or_immigration_adviser_client"
            | "mentor_mentee"
            | "platform_admin_user"
            | "regulator_regulated_party";
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          review_state?: "pending_review" | "approved" | "blocked" | "expired" | "revoked";
          allowed_surface_keys?: string[];
          safeguard_label?: string;
          boost_policy?: "boosts_prohibited";
          redacted_summary?: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          review_state?: "pending_review" | "approved" | "blocked" | "expired" | "revoked";
          allowed_surface_keys?: string[];
          safeguard_label?: string;
          boost_policy?: "boosts_prohibited";
          redacted_summary?: string;
          expires_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_claim_assurance_records: {
        Row: {
          id: string;
          participant_id: string;
          claim_kind:
            | "credential"
            | "authority"
            | "funding_capacity"
            | "institutional_affiliation"
            | "legal_expertise"
            | "medical_expertise"
            | "immigration_expertise"
            | "fiscal_sponsorship"
            | "scarce_resource"
            | "safety_relevant_capability"
            | "other_high_impact";
          broad_claim_key: string;
          assurance_level:
            | "self_attested"
            | "evidence_submitted"
            | "operator_reviewed"
            | "externally_verified"
            | "expired"
            | "revoked"
            | "rejected";
          allowed_purpose_bindings: Array<Record<string, unknown>>;
          allowed_surface_keys: string[];
          evidence_state:
            | "none"
            | "redacted_summary"
            | "vault_bound_evidence"
            | "external_verification_ref";
          redacted_evidence_summary: string | null;
          review_state: "pending" | "approved" | "rejected" | "stale" | "revoked";
          assurance_version: string;
          claim_assurance_taxonomy_version_snapshot: string;
          claim_assurance_taxonomy_hash_snapshot: string;
          confirmed_at: string | null;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          claim_kind:
            | "credential"
            | "authority"
            | "funding_capacity"
            | "institutional_affiliation"
            | "legal_expertise"
            | "medical_expertise"
            | "immigration_expertise"
            | "fiscal_sponsorship"
            | "scarce_resource"
            | "safety_relevant_capability"
            | "other_high_impact";
          broad_claim_key: string;
          assurance_level?:
            | "self_attested"
            | "evidence_submitted"
            | "operator_reviewed"
            | "externally_verified"
            | "expired"
            | "revoked"
            | "rejected";
          allowed_purpose_bindings?: Array<Record<string, unknown>>;
          allowed_surface_keys?: string[];
          evidence_state?:
            | "none"
            | "redacted_summary"
            | "vault_bound_evidence"
            | "external_verification_ref";
          redacted_evidence_summary?: string | null;
          review_state?: "pending" | "approved" | "rejected" | "stale" | "revoked";
          assurance_version: string;
          claim_assurance_taxonomy_version_snapshot: string;
          claim_assurance_taxonomy_hash_snapshot: string;
          confirmed_at?: string | null;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          assurance_level?:
            | "self_attested"
            | "evidence_submitted"
            | "operator_reviewed"
            | "externally_verified"
            | "expired"
            | "revoked"
            | "rejected";
          allowed_purpose_bindings?: Array<Record<string, unknown>>;
          allowed_surface_keys?: string[];
          evidence_state?:
            | "none"
            | "redacted_summary"
            | "vault_bound_evidence"
            | "external_verification_ref";
          redacted_evidence_summary?: string | null;
          review_state?: "pending" | "approved" | "rejected" | "stale" | "revoked";
          assurance_version?: string;
          claim_assurance_taxonomy_version_snapshot?: string;
          claim_assurance_taxonomy_hash_snapshot?: string;
          confirmed_at?: string | null;
          expires_at?: string;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_pairwise_safety_preferences: {
        Row: {
          id: string;
          participant_id: string;
          preference_kind: "do_not_match" | "block" | "mute" | "no_reminders" | "no_recontact";
          scope_kind:
            | "profile"
            | "organization"
            | "cohort"
            | "partner"
            | "intro_request"
            | "purpose_code"
            | "global_background_networking";
          scope_value_internal: string;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro"
            | null;
          purpose_policy_version: "background-purpose-policy-v1" | null;
          purpose_code_scope: string;
          state: "active" | "paused" | "revoked" | "expired";
          reason_code:
            | "privacy"
            | "safety"
            | "not_relevant"
            | "bad_timing"
            | "already_connected"
            | "participant_request"
            | "operator_safety"
            | null;
          created_from_event_kind:
            | "manual"
            | "dismissal"
            | "report"
            | "declined_intro"
            | "post_consent_interaction"
            | "operator_safety_action"
            | null;
          safety_preference_version: string;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          participant_id: string;
          preference_kind: "do_not_match" | "block" | "mute" | "no_reminders" | "no_recontact";
          scope_kind:
            | "profile"
            | "organization"
            | "cohort"
            | "partner"
            | "intro_request"
            | "purpose_code"
            | "global_background_networking";
          scope_value_internal: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro"
            | null;
          purpose_policy_version?: "background-purpose-policy-v1" | null;
          state?: "active" | "paused" | "revoked" | "expired";
          reason_code?:
            | "privacy"
            | "safety"
            | "not_relevant"
            | "bad_timing"
            | "already_connected"
            | "participant_request"
            | "operator_safety"
            | null;
          created_from_event_kind?:
            | "manual"
            | "dismissal"
            | "report"
            | "declined_intro"
            | "post_consent_interaction"
            | "operator_safety_action"
            | null;
          safety_preference_version: string;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
          revoked_at?: string | null;
        };
        Update: {
          state?: "active" | "paused" | "revoked" | "expired";
          reason_code?:
            | "privacy"
            | "safety"
            | "not_relevant"
            | "bad_timing"
            | "already_connected"
            | "participant_request"
            | "operator_safety"
            | null;
          safety_preference_version?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_subject_identity_profiles: {
        Row: {
          id: string;
          participant_id: string;
          subject_kind:
            | "individual"
            | "organisation"
            | "collective"
            | "automated_agent"
            | "service_account"
            | "partner_operator";
          sanitized_subject_label:
            | "individual"
            | "organisation"
            | "collective"
            | "automated helper"
            | "service account"
            | "partner/operator seat";
          human_accountable_owner_id: string | null;
          representative_authority_state:
            | "not_required"
            | "pending"
            | "confirmed"
            | "disputed"
            | "expired"
            | "revoked";
          representative_authority_scope: Record<string, unknown>;
          automation_disclosure_state:
            | "not_automated"
            | "disclosed_broadly"
            | "pending_review"
            | "blocked";
          authority_expires_at: string | null;
          subject_identity_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          subject_kind:
            | "individual"
            | "organisation"
            | "collective"
            | "automated_agent"
            | "service_account"
            | "partner_operator";
          sanitized_subject_label:
            | "individual"
            | "organisation"
            | "collective"
            | "automated helper"
            | "service account"
            | "partner/operator seat";
          human_accountable_owner_id?: string | null;
          representative_authority_state?:
            | "not_required"
            | "pending"
            | "confirmed"
            | "disputed"
            | "expired"
            | "revoked";
          representative_authority_scope?: Record<string, unknown>;
          automation_disclosure_state?:
            | "not_automated"
            | "disclosed_broadly"
            | "pending_review"
            | "blocked";
          authority_expires_at?: string | null;
          subject_identity_version: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          subject_kind?:
            | "individual"
            | "organisation"
            | "collective"
            | "automated_agent"
            | "service_account"
            | "partner_operator";
          sanitized_subject_label?:
            | "individual"
            | "organisation"
            | "collective"
            | "automated helper"
            | "service account"
            | "partner/operator seat";
          human_accountable_owner_id?: string | null;
          representative_authority_state?:
            | "not_required"
            | "pending"
            | "confirmed"
            | "disputed"
            | "expired"
            | "revoked";
          representative_authority_scope?: Record<string, unknown>;
          automation_disclosure_state?:
            | "not_automated"
            | "disclosed_broadly"
            | "pending_review"
            | "blocked";
          authority_expires_at?: string | null;
          subject_identity_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_source_summaries: {
        Row: {
          id: string;
          profile_id: string;
          source_connection_id: string | null;
          consent_receipt_id: string | null;
          source_type:
            | "manual"
            | "social"
            | "blog"
            | "email"
            | "calendar"
            | "chat_history"
            | "search_profile"
            | "other";
          label: string;
          summary_text: string;
          allowed_field_keys: string[];
          purpose: string;
          retention_expires_at: string;
          status: "draft" | "reviewed" | "active" | "expired" | "revoked";
          raw_ingestion_allowed: false;
          redaction_report: Record<string, unknown>;
          summary_version: number;
          approved_at: string | null;
          sensitive_ciphertexts: Record<string, string>;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          source_connection_id?: string | null;
          consent_receipt_id?: string | null;
          source_type?:
            | "manual"
            | "social"
            | "blog"
            | "email"
            | "calendar"
            | "chat_history"
            | "search_profile"
            | "other";
          label: string;
          summary_text?: string;
          allowed_field_keys?: string[];
          purpose?: string;
          retention_expires_at: string;
          status?: "draft" | "reviewed" | "active" | "expired" | "revoked";
          raw_ingestion_allowed?: false;
          redaction_report?: Record<string, unknown>;
          summary_version?: number;
          approved_at?: string | null;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_connection_id?: string | null;
          consent_receipt_id?: string | null;
          source_type?:
            | "manual"
            | "social"
            | "blog"
            | "email"
            | "calendar"
            | "chat_history"
            | "search_profile"
            | "other";
          label?: string;
          summary_text?: string;
          allowed_field_keys?: string[];
          purpose?: string;
          retention_expires_at?: string;
          status?: "draft" | "reviewed" | "active" | "expired" | "revoked";
          raw_ingestion_allowed?: false;
          redaction_report?: Record<string, unknown>;
          summary_version?: number;
          approved_at?: string | null;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_source_sync_jobs: {
        Row: {
          id: string;
          source_connection_id: string;
          profile_id: string;
          state: "queued" | "running" | "retry" | "done" | "failed" | "cancelled";
          attempts: number;
          next_run_at: string;
          last_error_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_connection_id: string;
          profile_id: string;
          state?: "queued" | "running" | "retry" | "done" | "failed" | "cancelled";
          attempts?: number;
          next_run_at?: string;
          last_error_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source_connection_id?: string;
          state?: "queued" | "running" | "retry" | "done" | "failed" | "cancelled";
          attempts?: number;
          next_run_at?: string;
          last_error_code?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_wish_dialogue_sessions: {
        Row: {
          id: string;
          profile_id: string;
          state: "draft" | "proposed" | "applied" | "abandoned";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          state?: "draft" | "proposed" | "applied" | "abandoned";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: "draft" | "proposed" | "applied" | "abandoned";
          updated_at?: string;
        };
        Relationships: [];
      };
      background_wish_dialogue_messages: {
        Row: {
          id: string;
          session_id: string;
          profile_id: string;
          actor: "user" | "assistant";
          body: string;
          body_ciphertext: string;
          body_encryption_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          profile_id: string;
          actor: "user" | "assistant";
          body?: string;
          body_ciphertext: string;
          body_encryption_version: string;
          created_at?: string;
        };
        Update: {
          body?: string;
          body_ciphertext?: string;
          body_encryption_version?: string;
        };
        Relationships: [];
      };
      background_wish_field_proposals: {
        Row: {
          id: string;
          session_id: string;
          profile_id: string;
          proposal: Record<string, unknown>;
          uncertainty_flags: unknown[];
          explanation: unknown[];
          approved: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          profile_id: string;
          proposal: Record<string, unknown>;
          uncertainty_flags?: unknown[];
          explanation?: unknown[];
          approved?: boolean;
          created_at?: string;
        };
        Update: {
          proposal?: Record<string, unknown>;
          uncertainty_flags?: unknown[];
          explanation?: unknown[];
          approved?: boolean;
        };
        Relationships: [];
      };
      background_private_overlap_tags: {
        Row: {
          id: string;
          profile_id: string;
          tag_namespace: "exact_capability_tag" | "exact_constraint_tag" | "exact_verification_tag";
          blinded_token: string;
          token_version: string;
          expiry_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          tag_namespace: "exact_capability_tag" | "exact_constraint_tag" | "exact_verification_tag";
          blinded_token: string;
          token_version?: string;
          expiry_at: string;
          created_at?: string;
        };
        Update: {
          token_version?: string;
          expiry_at?: string;
        };
        Relationships: [];
      };
      background_private_overlap_checks: {
        Row: {
          id: string;
          requester_id: string;
          counterparty_id: string;
          stage: "registry" | "consent" | "introduced";
          tag_namespace: "exact_capability_tag" | "exact_constraint_tag" | "exact_verification_tag";
          result_bucket: "none" | "1" | "2_to_3" | "4_plus";
          receipt_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          counterparty_id: string;
          stage: "registry" | "consent" | "introduced";
          tag_namespace: "exact_capability_tag" | "exact_constraint_tag" | "exact_verification_tag";
          result_bucket: "none" | "1" | "2_to_3" | "4_plus";
          receipt_id?: string | null;
          created_at?: string;
        };
        Update: {
          result_bucket?: "none" | "1" | "2_to_3" | "4_plus";
          receipt_id?: string | null;
        };
        Relationships: [];
      };
      transparency_receipts: {
        Row: {
          id: string;
          seq: number;
          event_type: string;
          actor_scope: string;
          redacted_payload: Record<string, unknown>;
          prev_hash: string | null;
          entry_hash: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          actor_scope: string;
          redacted_payload: Record<string, unknown>;
          prev_hash?: string | null;
          entry_hash: string;
          created_at?: string;
        };
        Update: {
          redacted_payload?: Record<string, unknown>;
          prev_hash?: string | null;
          entry_hash?: string;
        };
        Relationships: [];
      };
      background_profile_signals: {
        Row: {
          id: string;
          profile_id: string;
          source: "manual" | "approved_source_summary" | "interview" | "wish_dialogue";
          source_connection_id: string | null;
          source_summary_id: string | null;
          signal_key: string;
          signal_value: string;
          allowed_field_key:
            | "cause_priorities"
            | "capability_tags"
            | "offer_ask_terms"
            | "verification_preferences"
            | "availability_context"
            | "safety_constraints";
          sensitivity: "broad" | "specific";
          confidence_band: "low" | "medium" | "high";
          signal_fingerprint: string | null;
          source_summary_version: number | null;
          confirmation_kind:
            | "explicit_participant_confirmation"
            | "profile_apply"
            | "interview_apply"
            | "wish_dialogue_apply"
            | null;
          confirmation_actor_profile_id: string | null;
          confirmed_at: string | null;
          confirmation_policy_version: string | null;
          lineage_status: "active" | "stale" | "revoked" | "expired";
          purpose_code: string | null;
          purpose_policy_version: string | null;
          status: "active" | "stale" | "expired" | "revoked";
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          source: "manual" | "approved_source_summary" | "interview" | "wish_dialogue";
          source_connection_id?: string | null;
          source_summary_id?: string | null;
          signal_key: string;
          signal_value: string;
          allowed_field_key:
            | "cause_priorities"
            | "capability_tags"
            | "offer_ask_terms"
            | "verification_preferences"
            | "availability_context"
            | "safety_constraints";
          sensitivity: "broad" | "specific";
          confidence_band: "low" | "medium" | "high";
          signal_fingerprint?: string | null;
          source_summary_version?: number | null;
          confirmation_kind?:
            | "explicit_participant_confirmation"
            | "profile_apply"
            | "interview_apply"
            | "wish_dialogue_apply"
            | null;
          confirmation_actor_profile_id?: string | null;
          confirmed_at?: string | null;
          confirmation_policy_version?: string | null;
          lineage_status?: "active" | "stale" | "revoked" | "expired";
          purpose_code?: string | null;
          purpose_policy_version?: string | null;
          status?: "active" | "stale" | "expired" | "revoked";
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source?: "manual" | "approved_source_summary" | "interview" | "wish_dialogue";
          source_connection_id?: string | null;
          source_summary_id?: string | null;
          signal_key?: string;
          signal_value?: string;
          allowed_field_key?:
            | "cause_priorities"
            | "capability_tags"
            | "offer_ask_terms"
            | "verification_preferences"
            | "availability_context"
            | "safety_constraints";
          sensitivity?: "broad" | "specific";
          confidence_band?: "low" | "medium" | "high";
          signal_fingerprint?: string | null;
          source_summary_version?: number | null;
          confirmation_kind?:
            | "explicit_participant_confirmation"
            | "profile_apply"
            | "interview_apply"
            | "wish_dialogue_apply"
            | null;
          confirmation_actor_profile_id?: string | null;
          confirmed_at?: string | null;
          confirmation_policy_version?: string | null;
          lineage_status?: "active" | "stale" | "revoked" | "expired";
          purpose_code?: string | null;
          purpose_policy_version?: string | null;
          status?: "active" | "stale" | "expired" | "revoked";
          expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_shadow_runs: {
        Row: {
          id: string;
          profile_id: string;
          source_connection_id: string | null;
          source_summary_id: string | null;
          model_name: string;
          purpose: "signal_extraction" | "clarification_draft";
          output_json: Record<string, unknown>;
          was_promoted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          source_connection_id?: string | null;
          source_summary_id?: string | null;
          model_name?: string;
          purpose: "signal_extraction" | "clarification_draft";
          output_json: Record<string, unknown>;
          was_promoted?: boolean;
          created_at?: string;
        };
        Update: {
          source_connection_id?: string | null;
          source_summary_id?: string | null;
          model_name?: string;
          purpose?: "signal_extraction" | "clarification_draft";
          output_json?: Record<string, unknown>;
          was_promoted?: boolean;
        };
        Relationships: [];
      };
      background_profile_interview_answers: {
        Row: {
          id: string;
          profile_id: string;
          question_key: string;
          question_text: string;
          answer: string;
          uncertainty_flags: string[];
          broad_preview_update: string;
          private_intent_update: string;
          status: "draft" | "saved" | "dismissed";
          sensitive_ciphertexts: Record<string, string>;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          question_key: string;
          question_text?: string;
          answer?: string;
          uncertainty_flags?: string[];
          broad_preview_update?: string;
          private_intent_update?: string;
          status?: "draft" | "saved" | "dismissed";
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          question_text?: string;
          answer?: string;
          uncertainty_flags?: string[];
          broad_preview_update?: string;
          private_intent_update?: string;
          status?: "draft" | "saved" | "dismissed";
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_collective_policies: {
        Row: {
          id: string;
          collective_id: string;
          approval_threshold: number;
          approver_roles: string[];
          max_auto_grant_stage: "registry" | "consent" | "introduced";
          group_public_preview: string;
          default_retention_days: 30 | 90 | 180 | 365;
          contact_disclosure_requires_owner_step_up: boolean;
          disclosure_rules: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collective_id: string;
          approval_threshold?: number;
          approver_roles?: string[];
          max_auto_grant_stage?: "registry" | "consent" | "introduced";
          group_public_preview?: string;
          default_retention_days?: 30 | 90 | 180 | 365;
          contact_disclosure_requires_owner_step_up?: boolean;
          disclosure_rules?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          approval_threshold?: number;
          approver_roles?: string[];
          max_auto_grant_stage?: "registry" | "consent" | "introduced";
          group_public_preview?: string;
          default_retention_days?: 30 | 90 | 180 | 365;
          contact_disclosure_requires_owner_step_up?: boolean;
          disclosure_rules?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_mute_rules: {
        Row: {
          id: string;
          profile_id: string;
          candidate_profile_id: string | null;
          factor_code_pattern: string;
          cause_pair: string[];
          status: "active" | "expired" | "revoked";
          muted_until: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          candidate_profile_id?: string | null;
          factor_code_pattern?: string;
          cause_pair?: string[];
          status?: "active" | "expired" | "revoked";
          muted_until?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          candidate_profile_id?: string | null;
          factor_code_pattern?: string;
          cause_pair?: string[];
          status?: "active" | "expired" | "revoked";
          muted_until?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      clarification_questions: {
        Row: {
          id: string;
          profile_id: string;
          question: string;
          reason: string;
          status: "open" | "answered" | "dismissed";
          answer: string;
          created_at: string;
          answered_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          question: string;
          reason?: string;
          status?: "open" | "answered" | "dismissed";
          answer?: string;
          created_at?: string;
          answered_at?: string | null;
        };
        Update: {
          question?: string;
          reason?: string;
          status?: "open" | "answered" | "dismissed";
          answer?: string;
          answered_at?: string | null;
        };
        Relationships: [];
      };
      background_match_runs: {
        Row: {
          id: string;
          profile_id: string;
          status: "queued" | "running" | "completed" | "failed";
          run_reason: string;
          candidates_scanned: number;
          matches_created: number;
          matches_refreshed: number;
          error_message: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          status?: "queued" | "running" | "completed" | "failed";
          run_reason?: string;
          candidates_scanned?: number;
          matches_created?: number;
          matches_refreshed?: number;
          error_message?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: "queued" | "running" | "completed" | "failed";
          run_reason?: string;
          candidates_scanned?: number;
          matches_created?: number;
          matches_refreshed?: number;
          error_message?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      match_explanation_snapshots: {
        Row: {
          id: string;
          match_id: string;
          profile_id: string;
          explanation_version: string;
          workflow_stage:
            | "suggested"
            | "detail_requested"
            | "grant_pending"
            | "intro_review"
            | "intro_ready"
            | "introduced"
            | "archived"
            | "reported";
          confidence_band: "High" | "Moderate" | "Tentative" | "Exploratory";
          score_bucket: "0-24" | "25-44" | "45-59" | "60-74" | "75-100";
          factor_codes: string[];
          scanned_surfaces: string[];
          redacted_surfaces: string[];
          provenance: string;
          summary: string;
          privacy_note: string;
          source_run_kind: string;
          source_run_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          profile_id: string;
          explanation_version?: string;
          workflow_stage:
            | "suggested"
            | "detail_requested"
            | "grant_pending"
            | "intro_review"
            | "intro_ready"
            | "introduced"
            | "archived"
            | "reported";
          confidence_band: "High" | "Moderate" | "Tentative" | "Exploratory";
          score_bucket: "0-24" | "25-44" | "45-59" | "60-74" | "75-100";
          factor_codes?: string[];
          scanned_surfaces?: string[];
          redacted_surfaces?: string[];
          provenance?: string;
          summary?: string;
          privacy_note?: string;
          source_run_kind?: string;
          source_run_id?: string;
          created_at?: string;
        };
        Update: {
          workflow_stage?:
            | "suggested"
            | "detail_requested"
            | "grant_pending"
            | "intro_review"
            | "intro_ready"
            | "introduced"
            | "archived"
            | "reported";
          confidence_band?: "High" | "Moderate" | "Tentative" | "Exploratory";
          score_bucket?: "0-24" | "25-44" | "45-59" | "60-74" | "75-100";
          factor_codes?: string[];
          scanned_surfaces?: string[];
          redacted_surfaces?: string[];
          provenance?: string;
          summary?: string;
          privacy_note?: string;
          source_run_kind?: string;
          source_run_id?: string;
        };
        Relationships: [];
      };
      background_query_events: {
        Row: {
          id: string;
          profile_id: string | null;
          scope:
            | "manual_scan"
            | "profile_save_scan"
            | "saved_search_scan"
            | "delegate_scan"
            | "registry_search";
          query_fingerprint: string;
          cost: number;
          daily_limit: number;
          used_before: number;
          remaining_after: number;
          candidate_count: number;
          result_count: number;
          was_limited: boolean;
          risk_signal_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          scope:
            | "manual_scan"
            | "profile_save_scan"
            | "saved_search_scan"
            | "delegate_scan"
            | "registry_search";
          query_fingerprint?: string;
          cost?: number;
          daily_limit?: number;
          used_before?: number;
          remaining_after?: number;
          candidate_count?: number;
          result_count?: number;
          was_limited?: boolean;
          risk_signal_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          cost?: number;
          daily_limit?: number;
          used_before?: number;
          remaining_after?: number;
          profile_id?: string | null;
          candidate_count?: number;
          result_count?: number;
          was_limited?: boolean;
          risk_signal_id?: string | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      background_notification_preferences: {
        Row: {
          id: string;
          profile_id: string;
          event_kind:
            | "match_suggestions"
            | "consent_decisions"
            | "introduction_updates"
            | "grant_activity"
            | "operator_review"
            | "safety_review";
          channel: "in_app" | "email_digest" | "web_push";
          enabled: boolean;
          digest_cadence: "immediate" | "daily" | "weekly" | "none";
          quiet_until: string | null;
          quiet_hours_start: number | null;
          quiet_hours_end: number | null;
          daily_cap: number | null;
          source_cooldown_hours: number | null;
          last_discovery_sent_at: string | null;
          last_digest_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          event_kind:
            | "match_suggestions"
            | "consent_decisions"
            | "introduction_updates"
            | "grant_activity"
            | "operator_review"
            | "safety_review";
          channel: "in_app" | "email_digest" | "web_push";
          enabled?: boolean;
          digest_cadence?: "immediate" | "daily" | "weekly" | "none";
          quiet_until?: string | null;
          quiet_hours_start?: number | null;
          quiet_hours_end?: number | null;
          daily_cap?: number | null;
          source_cooldown_hours?: number | null;
          last_discovery_sent_at?: string | null;
          last_digest_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          event_kind?:
            | "match_suggestions"
            | "consent_decisions"
            | "introduction_updates"
            | "grant_activity"
            | "operator_review"
            | "safety_review";
          channel?: "in_app" | "email_digest" | "web_push";
          enabled?: boolean;
          digest_cadence?: "immediate" | "daily" | "weekly" | "none";
          quiet_until?: string | null;
          quiet_hours_start?: number | null;
          quiet_hours_end?: number | null;
          daily_cap?: number | null;
          source_cooldown_hours?: number | null;
          last_discovery_sent_at?: string | null;
          last_digest_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_data_right_requests: {
        Row: {
          id: string;
          profile_id: string;
          request_type: "export" | "correction" | "deletion" | "restriction";
          scope: "background_networking" | "profile" | "full_account";
          status: "open" | "in_review" | "fulfilled" | "denied" | "cancelled";
          request_details: string;
          operator_note: string;
          due_at: string;
          reviewed_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          request_type: "export" | "correction" | "deletion" | "restriction";
          scope?: "background_networking" | "profile" | "full_account";
          status?: "open" | "in_review" | "fulfilled" | "denied" | "cancelled";
          request_details?: string;
          operator_note?: string;
          due_at?: string;
          reviewed_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          request_type?: "export" | "correction" | "deletion" | "restriction";
          scope?: "background_networking" | "profile" | "full_account";
          status?: "open" | "in_review" | "fulfilled" | "denied" | "cancelled";
          request_details?: string;
          operator_note?: string;
          due_at?: string;
          reviewed_by?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_audit_events: {
        Row: {
          id: string;
          match_id: string | null;
          actor_profile_id: string | null;
          event_type: string;
          summary: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id?: string | null;
          actor_profile_id?: string | null;
          event_type: string;
          summary?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          actor_profile_id?: string | null;
          event_type?: string;
          summary?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      match_reports: {
        Row: {
          id: string;
          match_id: string;
          reporter_profile_id: string;
          reason: "unsafe" | "spam" | "privacy" | "coercion" | "illegal" | "other";
          details: string;
          status: "open" | "reviewed" | "dismissed";
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          match_id: string;
          reporter_profile_id: string;
          reason?: "unsafe" | "spam" | "privacy" | "coercion" | "illegal" | "other";
          details?: string;
          status?: "open" | "reviewed" | "dismissed";
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          reason?: "unsafe" | "spam" | "privacy" | "coercion" | "illegal" | "other";
          details?: string;
          status?: "open" | "reviewed" | "dismissed";
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      match_concierge_requests: {
        Row: {
          id: string;
          requester_profile_id: string;
          target_profile_id: string | null;
          match_id: string | null;
          route: "private_match" | "pledge_swap" | "donation_offset" | "mpgf" | "other";
          cause_areas: string[];
          target_preview: string;
          intent_summary: string;
          offer_summary: string;
          ask_summary: string;
          constraints: string;
          no_trade_baseline: string;
          desired_timeline: string;
          risk_notes: string;
          status:
            | "open"
            | "triaged"
            | "waiting_on_requester"
            | "waiting_on_counterparty"
            | "introduced"
            | "declined"
            | "closed";
          operator_notes: string;
          sla_due_at: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          appeal_status: "none" | "requested" | "under_review" | "resolved" | "dismissed";
          appeal_reason: string;
          appealed_at: string | null;
          appeal_resolved_at: string | null;
          appeal_resolved_by: string | null;
          appeal_resolution_note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_profile_id: string;
          target_profile_id?: string | null;
          match_id?: string | null;
          route?: "private_match" | "pledge_swap" | "donation_offset" | "mpgf" | "other";
          cause_areas?: string[];
          target_preview?: string;
          intent_summary?: string;
          offer_summary?: string;
          ask_summary?: string;
          constraints?: string;
          no_trade_baseline?: string;
          desired_timeline?: string;
          risk_notes?: string;
          status?:
            | "open"
            | "triaged"
            | "waiting_on_requester"
            | "waiting_on_counterparty"
            | "introduced"
            | "declined"
            | "closed";
          operator_notes?: string;
          sla_due_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          appeal_status?: "none" | "requested" | "under_review" | "resolved" | "dismissed";
          appeal_reason?: string;
          appealed_at?: string | null;
          appeal_resolved_at?: string | null;
          appeal_resolved_by?: string | null;
          appeal_resolution_note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          target_profile_id?: string | null;
          match_id?: string | null;
          route?: "private_match" | "pledge_swap" | "donation_offset" | "mpgf" | "other";
          cause_areas?: string[];
          target_preview?: string;
          intent_summary?: string;
          offer_summary?: string;
          ask_summary?: string;
          constraints?: string;
          no_trade_baseline?: string;
          desired_timeline?: string;
          risk_notes?: string;
          status?:
            | "open"
            | "triaged"
            | "waiting_on_requester"
            | "waiting_on_counterparty"
            | "introduced"
            | "declined"
            | "closed";
          operator_notes?: string;
          sla_due_at?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          appeal_status?: "none" | "requested" | "under_review" | "resolved" | "dismissed";
          appeal_reason?: string;
          appealed_at?: string | null;
          appeal_resolved_at?: string | null;
          appeal_resolved_by?: string | null;
          appeal_resolution_note?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_concierge_events: {
        Row: {
          id: string;
          request_id: string;
          actor_profile_id: string | null;
          event_type: string;
          summary: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          actor_profile_id?: string | null;
          event_type: string;
          summary?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          event_type?: string;
          summary?: string;
          metadata?: Record<string, unknown>;
        };
        Relationships: [];
      };
      network_invites: {
        Row: {
          id: string;
          profile_id: string;
          target_kind: "person" | "collective" | "institution" | "community" | "public_call";
          target_label: string;
          target_url: string;
          target_context: string;
          desired_capability: string;
          suggested_message: string;
          priority: number;
          reason: string;
          status: "draft" | "sent" | "dismissed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          target_kind?: "person" | "collective" | "institution" | "community" | "public_call";
          target_label: string;
          target_url?: string;
          target_context?: string;
          desired_capability?: string;
          suggested_message?: string;
          priority?: number;
          reason?: string;
          status?: "draft" | "sent" | "dismissed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          target_kind?: "person" | "collective" | "institution" | "community" | "public_call";
          target_label?: string;
          target_url?: string;
          target_context?: string;
          desired_capability?: string;
          suggested_message?: string;
          priority?: number;
          reason?: string;
          status?: "draft" | "sent" | "dismissed";
          updated_at?: string;
        };
        Relationships: [];
      };
      personal_delegates: {
        Row: {
          profile_id: string;
          label: string;
          goals: string[];
          operating_mode: "passive" | "active" | "paused";
          search_scope: string;
          risk_tolerance: "conservative" | "moderate" | "exploratory";
          introduction_policy: "ask_each_time" | "auto_draft_only";
          allowed_purpose_bindings: Record<string, unknown>;
          max_weekly_suggestions: number;
          status: "active" | "paused";
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          label?: string;
          goals?: string[];
          operating_mode?: "passive" | "active" | "paused";
          search_scope?: string;
          risk_tolerance?: "conservative" | "moderate" | "exploratory";
          introduction_policy?: "ask_each_time" | "auto_draft_only";
          allowed_purpose_bindings?: Record<string, unknown>;
          max_weekly_suggestions?: number;
          status?: "active" | "paused";
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          goals?: string[];
          operating_mode?: "passive" | "active" | "paused";
          search_scope?: string;
          risk_tolerance?: "conservative" | "moderate" | "exploratory";
          introduction_policy?: "ask_each_time" | "auto_draft_only";
          allowed_purpose_bindings?: Record<string, unknown>;
          max_weekly_suggestions?: number;
          status?: "active" | "paused";
          last_run_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      source_connections: {
        Row: {
          id: string;
          profile_id: string;
          provider:
            | "manual"
            | "social"
            | "blog"
            | "email"
            | "calendar"
            | "chat_history"
            | "search_profile"
            | "other";
          label: string;
          url: string;
          access_status: "not_connected" | "connected" | "expired" | "revoked" | "needs_review";
          access_scope: string;
          consent_notes: string;
          import_mode: "manual_review" | "manual_paste" | "rss_pull" | "forwarded_note";
          sync_frequency: "manual" | "weekly" | "monthly";
          last_sync_summary: string;
          last_import_item_count: number;
          last_imported_at: string | null;
          allowed_field_keys: string[];
          retention_expires_at: string | null;
          ai_shadow_mode_allowed: boolean;
          raw_ingestion_allowed: boolean;
          sensitive_ciphertexts: Record<string, string>;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          provider?:
            | "manual"
            | "social"
            | "blog"
            | "email"
            | "calendar"
            | "chat_history"
            | "search_profile"
            | "other";
          label: string;
          url?: string;
          access_status?: "not_connected" | "connected" | "expired" | "revoked" | "needs_review";
          access_scope?: string;
          consent_notes?: string;
          import_mode?: "manual_review" | "manual_paste" | "rss_pull" | "forwarded_note";
          sync_frequency?: "manual" | "weekly" | "monthly";
          last_sync_summary?: string;
          last_import_item_count?: number;
          last_imported_at?: string | null;
          allowed_field_keys?: string[];
          retention_expires_at?: string | null;
          ai_shadow_mode_allowed?: boolean;
          raw_ingestion_allowed?: boolean;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider?:
            | "manual"
            | "social"
            | "blog"
            | "email"
            | "calendar"
            | "chat_history"
            | "search_profile"
            | "other";
          label?: string;
          url?: string;
          access_status?: "not_connected" | "connected" | "expired" | "revoked" | "needs_review";
          access_scope?: string;
          consent_notes?: string;
          import_mode?: "manual_review" | "manual_paste" | "rss_pull" | "forwarded_note";
          sync_frequency?: "manual" | "weekly" | "monthly";
          last_sync_summary?: string;
          last_import_item_count?: number;
          last_imported_at?: string | null;
          allowed_field_keys?: string[];
          retention_expires_at?: string | null;
          ai_shadow_mode_allowed?: boolean;
          raw_ingestion_allowed?: boolean;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profile_syntheses: {
        Row: {
          profile_id: string;
          hopes: string;
          intent: string;
          capabilities: string;
          constraints: string;
          uncertainty: string;
          confidence_score: number;
          source_count: number;
          cause_priorities: string[];
          offer_terms: string[];
          ask_terms: string[];
          capability_tags: string[];
          constraint_flags: string[];
          uncertainty_flags: string[];
          missing_fields: string[];
          confidence_breakdown: Record<string, number>;
          synthesis_version: string;
          sensitive_ciphertexts: Record<string, string>;
          sensitive_encryption_version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          hopes?: string;
          intent?: string;
          capabilities?: string;
          constraints?: string;
          uncertainty?: string;
          confidence_score?: number;
          source_count?: number;
          cause_priorities?: string[];
          offer_terms?: string[];
          ask_terms?: string[];
          capability_tags?: string[];
          constraint_flags?: string[];
          uncertainty_flags?: string[];
          missing_fields?: string[];
          confidence_breakdown?: Record<string, number>;
          synthesis_version?: string;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          hopes?: string;
          intent?: string;
          capabilities?: string;
          constraints?: string;
          uncertainty?: string;
          confidence_score?: number;
          source_count?: number;
          cause_priorities?: string[];
          offer_terms?: string[];
          ask_terms?: string[];
          capability_tags?: string[];
          constraint_flags?: string[];
          uncertainty_flags?: string[];
          missing_fields?: string[];
          confidence_breakdown?: Record<string, number>;
          synthesis_version?: string;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      background_intent_claims: {
        Row: {
          id: string;
          profile_id: string;
          claim_key: string;
          claim_type:
            | "ask_term"
            | "capability_tag"
            | "cause_priority"
            | "constraint_flag"
            | "missing_field"
            | "offer_term"
            | "profile_state"
            | "source_permission"
            | "trade_preference"
            | "uncertainty_item";
          claim_value: string;
          claim_version: string;
          confidence_band: "high" | "medium" | "low";
          source_kind:
            | "wish_profile"
            | "profile_synthesis"
            | "source_connection"
            | "source_summary"
            | "profile_interview";
          source_record_id: string | null;
          surface_label: string;
          preview_safe: boolean;
          explanation: string;
          status: "active" | "superseded" | "withdrawn";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          claim_key: string;
          claim_type:
            | "ask_term"
            | "capability_tag"
            | "cause_priority"
            | "constraint_flag"
            | "missing_field"
            | "offer_term"
            | "profile_state"
            | "source_permission"
            | "trade_preference"
            | "uncertainty_item";
          claim_value?: string;
          claim_version?: string;
          confidence_band?: "high" | "medium" | "low";
          source_kind?:
            | "wish_profile"
            | "profile_synthesis"
            | "source_connection"
            | "source_summary"
            | "profile_interview";
          source_record_id?: string | null;
          surface_label?: string;
          preview_safe?: boolean;
          explanation?: string;
          status?: "active" | "superseded" | "withdrawn";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          claim_key?: string;
          claim_type?:
            | "ask_term"
            | "capability_tag"
            | "cause_priority"
            | "constraint_flag"
            | "missing_field"
            | "offer_term"
            | "profile_state"
            | "source_permission"
            | "trade_preference"
            | "uncertainty_item";
          claim_value?: string;
          claim_version?: string;
          confidence_band?: "high" | "medium" | "low";
          source_kind?:
            | "wish_profile"
            | "profile_synthesis"
            | "source_connection"
            | "source_summary"
            | "profile_interview";
          source_record_id?: string | null;
          surface_label?: string;
          preview_safe?: boolean;
          explanation?: string;
          status?: "active" | "superseded" | "withdrawn";
          updated_at?: string;
        };
        Relationships: [];
      };
      helper_strategies: {
        Row: {
          id: string;
          profile_id: string;
          helper_kind:
            | "cause_overlap"
            | "payment_compatibility"
            | "geographic"
            | "network_expansion"
            | "saved_search"
            | "risk_filter";
          label: string;
          priority: number;
          min_score: number;
          strategy_config: Record<string, unknown>;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          audience_scope: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          cohort_scope_id: string;
          status: "active" | "paused";
          last_run_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          helper_kind?:
            | "cause_overlap"
            | "payment_compatibility"
            | "geographic"
            | "network_expansion"
            | "saved_search"
            | "risk_filter";
          label: string;
          priority?: number;
          min_score?: number;
          strategy_config?: Record<string, unknown>;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          audience_scope?: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          cohort_scope_id?: string;
          status?: "active" | "paused";
          last_run_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          helper_kind?:
            | "cause_overlap"
            | "payment_compatibility"
            | "geographic"
            | "network_expansion"
            | "saved_search"
            | "risk_filter";
          label?: string;
          priority?: number;
          min_score?: number;
          strategy_config?: Record<string, unknown>;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          audience_scope?: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          cohort_scope_id?: string;
          status?: "active" | "paused";
          last_run_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      helper_runs: {
        Row: {
          id: string;
          strategy_id: string | null;
          profile_id: string;
          status: "queued" | "running" | "completed" | "failed";
          candidates_scanned: number;
          suggestions_created: number;
          notes: string;
          purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version: "background-purpose-policy-v1";
          redacted_receipt_id: string | null;
          retention_expires_at: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          strategy_id?: string | null;
          profile_id: string;
          status?: "queued" | "running" | "completed" | "failed";
          candidates_scanned?: number;
          suggestions_created?: number;
          notes?: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          strategy_id?: string | null;
          status?: "queued" | "running" | "completed" | "failed";
          candidates_scanned?: number;
          suggestions_created?: number;
          notes?: string;
          purpose_code?:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          purpose_policy_version?: "background-purpose-policy-v1";
          redacted_receipt_id?: string | null;
          retention_expires_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      match_introduction_plans: {
        Row: {
          id: string;
          match_id: string;
          profile_id: string;
          counterparty_id: string;
          status: "draft" | "shared" | "archived";
          intro_message: string;
          proposal_outline: string;
          proposal_terms: string;
          agenda: string;
          timeline: string;
          next_actions: string;
          verification_plan: string;
          privacy_notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          profile_id: string;
          counterparty_id: string;
          status?: "draft" | "shared" | "archived";
          intro_message?: string;
          proposal_outline?: string;
          proposal_terms?: string;
          agenda?: string;
          timeline?: string;
          next_actions?: string;
          verification_plan?: string;
          privacy_notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "draft" | "shared" | "archived";
          intro_message?: string;
          proposal_outline?: string;
          proposal_terms?: string;
          agenda?: string;
          timeline?: string;
          next_actions?: string;
          verification_plan?: string;
          privacy_notes?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      match_introduction_tasks: {
        Row: {
          id: string;
          plan_id: string;
          profile_id: string;
          step_key: string;
          title: string;
          detail: string;
          note: string;
          sort_order: number;
          status: "pending" | "in_progress" | "done" | "skipped";
          due_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          profile_id: string;
          step_key: string;
          title?: string;
          detail?: string;
          note?: string;
          sort_order?: number;
          status?: "pending" | "in_progress" | "done" | "skipped";
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          step_key?: string;
          title?: string;
          detail?: string;
          note?: string;
          sort_order?: number;
          status?: "pending" | "in_progress" | "done" | "skipped";
          due_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      privacy_grants: {
        Row: {
          id: string;
          profile_id: string;
          counterparty_id: string | null;
          match_id: string | null;
          field_key: string;
          access_level: "hidden" | "broad" | "specific" | "contact";
          audience_stage: "registry" | "consent" | "introduced";
          status: "draft" | "granted" | "revoked";
          notes: string;
          expires_at: string | null;
          privacy_policy_ref: string | null;
          purpose_code: string;
          grant_hash: string | null;
          revoked_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          counterparty_id?: string | null;
          match_id?: string | null;
          field_key: string;
          access_level?: "hidden" | "broad" | "specific" | "contact";
          audience_stage?: "registry" | "consent" | "introduced";
          status?: "draft" | "granted" | "revoked";
          notes?: string;
          expires_at?: string | null;
          privacy_policy_ref?: string | null;
          purpose_code?: string;
          grant_hash?: string | null;
          revoked_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          counterparty_id?: string | null;
          match_id?: string | null;
          field_key?: string;
          access_level?: "hidden" | "broad" | "specific" | "contact";
          audience_stage?: "registry" | "consent" | "introduced";
          status?: "draft" | "granted" | "revoked";
          notes?: string;
          expires_at?: string | null;
          privacy_policy_ref?: string | null;
          purpose_code?: string;
          grant_hash?: string | null;
          revoked_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      privacy_access_requests: {
        Row: {
          id: string;
          owner_profile_id: string;
          requester_profile_id: string;
          match_id: string | null;
          requested_fields: string[];
          requested_stage: "registry" | "consent" | "introduced";
          purpose: string;
          justification: string;
          owner_note: string;
          status: "pending" | "approved" | "denied" | "withdrawn";
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          requester_profile_id: string;
          match_id?: string | null;
          requested_fields?: string[];
          requested_stage?: "registry" | "consent" | "introduced";
          purpose?: string;
          justification?: string;
          owner_note?: string;
          status?: "pending" | "approved" | "denied" | "withdrawn";
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          owner_profile_id?: string;
          requester_profile_id?: string;
          match_id?: string | null;
          requested_fields?: string[];
          requested_stage?: "registry" | "consent" | "introduced";
          purpose?: string;
          justification?: string;
          owner_note?: string;
          status?: "pending" | "approved" | "denied" | "withdrawn";
          updated_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      moral_trade_privacy_grant_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          surface:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          grant_required_bool: boolean;
          access_log_required_bool: boolean;
          role_limit_required_bool: boolean;
          purpose_limit_required_bool: boolean;
          revocable_grant_required_bool: boolean;
          expiry_required_bool: boolean;
          data_security_review_required_bool: boolean;
          confidentiality_review_required_bool: boolean;
          reviewer_quality_required_bool: boolean;
          account_security_required_bool: boolean;
          participant_confirmation_required_bool: boolean;
          external_authority_required_bool: boolean;
          redaction_required_bool: boolean;
          public_redaction_policy_required_bool: boolean;
          max_access_log_age_days: number;
          policy_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          surface:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          grant_required_bool?: boolean;
          access_log_required_bool?: boolean;
          role_limit_required_bool?: boolean;
          purpose_limit_required_bool?: boolean;
          revocable_grant_required_bool?: boolean;
          expiry_required_bool?: boolean;
          data_security_review_required_bool?: boolean;
          confidentiality_review_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          account_security_required_bool?: boolean;
          participant_confirmation_required_bool?: boolean;
          external_authority_required_bool?: boolean;
          redaction_required_bool?: boolean;
          public_redaction_policy_required_bool?: boolean;
          max_access_log_age_days?: number;
          policy_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          policy_snapshot_id?: string;
          policy_version?: string;
          surface?:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          grant_required_bool?: boolean;
          access_log_required_bool?: boolean;
          role_limit_required_bool?: boolean;
          purpose_limit_required_bool?: boolean;
          revocable_grant_required_bool?: boolean;
          expiry_required_bool?: boolean;
          data_security_review_required_bool?: boolean;
          confidentiality_review_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          account_security_required_bool?: boolean;
          participant_confirmation_required_bool?: boolean;
          external_authority_required_bool?: boolean;
          redaction_required_bool?: boolean;
          public_redaction_policy_required_bool?: boolean;
          max_access_log_age_days?: number;
          policy_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_privacy_access_logs: {
        Row: {
          id: string;
          privacy_grant_id: string;
          privacy_policy_ref: string;
          surface:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          owner_profile_id_hash: string;
          actor_id_hash: string | null;
          actor_role: string;
          purpose_code: string;
          field_key: string;
          access_decision: "allowed" | "blocked" | "redacted";
          private_data_returned_bool: boolean;
          raw_private_artifact_returned_bool: boolean;
          redaction_applied_bool: boolean;
          role_limited_bool: boolean;
          purpose_limited_bool: boolean;
          counterparty_disclosure_bool: boolean;
          public_disclosure_bool: boolean;
          access_reason: string;
          access_hash: string;
          occurred_at: string;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          privacy_grant_id: string;
          privacy_policy_ref: string;
          surface:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          owner_profile_id_hash: string;
          actor_id_hash?: string | null;
          actor_role?: string;
          purpose_code?: string;
          field_key: string;
          access_decision?: "allowed" | "blocked" | "redacted";
          private_data_returned_bool?: boolean;
          raw_private_artifact_returned_bool?: boolean;
          redaction_applied_bool?: boolean;
          role_limited_bool?: boolean;
          purpose_limited_bool?: boolean;
          counterparty_disclosure_bool?: boolean;
          public_disclosure_bool?: boolean;
          access_reason?: string;
          access_hash: string;
          occurred_at?: string;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          privacy_grant_id?: string;
          privacy_policy_ref?: string;
          surface?:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          owner_profile_id_hash?: string;
          actor_id_hash?: string | null;
          actor_role?: string;
          purpose_code?: string;
          field_key?: string;
          access_decision?: "allowed" | "blocked" | "redacted";
          private_data_returned_bool?: boolean;
          raw_private_artifact_returned_bool?: boolean;
          redaction_applied_bool?: boolean;
          role_limited_bool?: boolean;
          purpose_limited_bool?: boolean;
          counterparty_disclosure_bool?: boolean;
          public_disclosure_bool?: boolean;
          access_reason?: string;
          access_hash?: string;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_privacy_disclosure_reviews: {
        Row: {
          id: string;
          privacy_grant_id: string;
          privacy_policy_ref: string;
          surface:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          review_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          confidentiality_review_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          data_security_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          account_security_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          participant_confirmation_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          external_authority_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          review_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          privacy_grant_id: string;
          privacy_policy_ref: string;
          surface:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          confidentiality_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          data_security_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          account_security_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          participant_confirmation_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          external_authority_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          review_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          privacy_grant_id?: string;
          privacy_policy_ref?: string;
          surface?:
            | "reviewer_access"
            | "counterparty_preview"
            | "contact_introduction"
            | "evidence_review"
            | "profile_export"
            | "public_redacted_publication";
          review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          confidentiality_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          data_security_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          account_security_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          participant_confirmation_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          external_authority_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          review_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_impact_claim_methodology_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          claim_type:
            | "transfer_metric"
            | "payout_metric"
            | "sponsor_leverage_metric"
            | "outcome_claim"
            | "cost_effectiveness_claim"
            | "causal_impact_claim"
            | "moral_value_claim";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          evidence_required_bool: boolean;
          uncertainty_disclosure_required_bool: boolean;
          transfer_separation_required_bool: boolean;
          content_moderation_required_bool: boolean;
          reviewer_quality_required_bool: boolean;
          privileged_action_required_bool: boolean;
          audit_integrity_required_bool: boolean;
          public_metric_suppression_required_bool: boolean;
          min_evidence_refs: number;
          methodology_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          claim_type:
            | "transfer_metric"
            | "payout_metric"
            | "sponsor_leverage_metric"
            | "outcome_claim"
            | "cost_effectiveness_claim"
            | "causal_impact_claim"
            | "moral_value_claim";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          evidence_required_bool?: boolean;
          uncertainty_disclosure_required_bool?: boolean;
          transfer_separation_required_bool?: boolean;
          content_moderation_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          privileged_action_required_bool?: boolean;
          audit_integrity_required_bool?: boolean;
          public_metric_suppression_required_bool?: boolean;
          min_evidence_refs?: number;
          methodology_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          policy_snapshot_id?: string;
          policy_version?: string;
          claim_type?:
            | "transfer_metric"
            | "payout_metric"
            | "sponsor_leverage_metric"
            | "outcome_claim"
            | "cost_effectiveness_claim"
            | "causal_impact_claim"
            | "moral_value_claim";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          evidence_required_bool?: boolean;
          uncertainty_disclosure_required_bool?: boolean;
          transfer_separation_required_bool?: boolean;
          content_moderation_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          privileged_action_required_bool?: boolean;
          audit_integrity_required_bool?: boolean;
          public_metric_suppression_required_bool?: boolean;
          min_evidence_refs?: number;
          methodology_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_impact_claim_records: {
        Row: {
          id: string;
          methodology_policy_ref: string;
          surface:
            | "offer_detail"
            | "public_dashboard"
            | "transparency_report"
            | "round_summary"
            | "recipient_project_page";
          claim_type:
            | "transfer_metric"
            | "payout_metric"
            | "sponsor_leverage_metric"
            | "outcome_claim"
            | "cost_effectiveness_claim"
            | "causal_impact_claim"
            | "moral_value_claim";
          publication_status: "draft" | "under_review" | "reviewed" | "published" | "blocked" | "stale" | "superseded";
          claim_subject_ref: string;
          evidence_refs: string[];
          evidence_claim_types: string[];
          uncertainty_disclosure: string;
          transfer_vs_impact_label: string;
          gross_transfer_amount_displayed_bool: boolean;
          net_recipient_payout_displayed_bool: boolean;
          sponsor_leverage_displayed_bool: boolean;
          payment_evidence_used_as_impact_bool: boolean;
          impact_claim_text_public_bool: boolean;
          content_moderation_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          privileged_action_record_id: string | null;
          privileged_action_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          audit_integrity_checkpoint_id: string | null;
          audit_integrity_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          public_metric_suppression_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          private_evidence_public_bool: boolean;
          claim_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          methodology_policy_ref: string;
          surface:
            | "offer_detail"
            | "public_dashboard"
            | "transparency_report"
            | "round_summary"
            | "recipient_project_page";
          claim_type:
            | "transfer_metric"
            | "payout_metric"
            | "sponsor_leverage_metric"
            | "outcome_claim"
            | "cost_effectiveness_claim"
            | "causal_impact_claim"
            | "moral_value_claim";
          publication_status?: "draft" | "under_review" | "reviewed" | "published" | "blocked" | "stale" | "superseded";
          claim_subject_ref?: string;
          evidence_refs?: string[];
          evidence_claim_types?: string[];
          uncertainty_disclosure?: string;
          transfer_vs_impact_label?: string;
          gross_transfer_amount_displayed_bool?: boolean;
          net_recipient_payout_displayed_bool?: boolean;
          sponsor_leverage_displayed_bool?: boolean;
          payment_evidence_used_as_impact_bool?: boolean;
          impact_claim_text_public_bool?: boolean;
          content_moderation_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          privileged_action_record_id?: string | null;
          privileged_action_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          audit_integrity_checkpoint_id?: string | null;
          audit_integrity_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          public_metric_suppression_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          private_evidence_public_bool?: boolean;
          claim_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          methodology_policy_ref?: string;
          surface?:
            | "offer_detail"
            | "public_dashboard"
            | "transparency_report"
            | "round_summary"
            | "recipient_project_page";
          claim_type?:
            | "transfer_metric"
            | "payout_metric"
            | "sponsor_leverage_metric"
            | "outcome_claim"
            | "cost_effectiveness_claim"
            | "causal_impact_claim"
            | "moral_value_claim";
          publication_status?: "draft" | "under_review" | "reviewed" | "published" | "blocked" | "stale" | "superseded";
          claim_subject_ref?: string;
          evidence_refs?: string[];
          evidence_claim_types?: string[];
          uncertainty_disclosure?: string;
          transfer_vs_impact_label?: string;
          gross_transfer_amount_displayed_bool?: boolean;
          net_recipient_payout_displayed_bool?: boolean;
          sponsor_leverage_displayed_bool?: boolean;
          payment_evidence_used_as_impact_bool?: boolean;
          impact_claim_text_public_bool?: boolean;
          content_moderation_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          privileged_action_record_id?: string | null;
          privileged_action_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          audit_integrity_checkpoint_id?: string | null;
          audit_integrity_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          public_metric_suppression_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          private_evidence_public_bool?: boolean;
          claim_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_matching_clearing_execution_records: {
        Row: {
          id: string;
          owner_profile_id: string;
          execution_kind: "evaluation" | "replay_check";
          flow_type:
            | "donation_offset_batch"
            | "pledge_swap_preview"
            | "broad_match_candidate"
            | "public_goods_round";
          execution_status: "pass" | "blocked";
          requires_payable_transition_bool: boolean;
          requires_reliance_bearing_transition_bool: boolean;
          requires_lock_proposal_bool: boolean;
          run_count: number;
          lock_proposal_count: number;
          execution_input_json: Json;
          evaluation_result_json: Json;
          replay_input_hash: string | null;
          replay_result_hash: string | null;
          deterministic_replay_bool: boolean;
          blocker_codes: string[];
          user_facing_blocker_categories: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          creates_lock_proposal_bool: false;
          payable_transition_allowed_bool: false;
          reliance_bearing_transition_allowed_bool: false;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          execution_kind: "evaluation" | "replay_check";
          flow_type:
            | "donation_offset_batch"
            | "pledge_swap_preview"
            | "broad_match_candidate"
            | "public_goods_round";
          execution_status: "pass" | "blocked";
          requires_payable_transition_bool?: boolean;
          requires_reliance_bearing_transition_bool?: boolean;
          requires_lock_proposal_bool?: boolean;
          run_count?: number;
          lock_proposal_count?: number;
          execution_input_json: Json;
          evaluation_result_json: Json;
          replay_input_hash?: string | null;
          replay_result_hash?: string | null;
          deterministic_replay_bool?: boolean;
          blocker_codes?: string[];
          user_facing_blocker_categories?: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          creates_lock_proposal_bool?: false;
          payable_transition_allowed_bool?: false;
          reliance_bearing_transition_allowed_bool?: false;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      moral_trade_matching_clearing_runs: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          flow_type:
            | "donation_offset_batch"
            | "pledge_swap_preview"
            | "broad_match_candidate"
            | "public_goods_round";
          run_status: "draft" | "dry_run" | "reviewed" | "blocked" | "locked" | "superseded" | "expired";
          algorithm_version: string;
          deterministic_algorithm_bool: boolean;
          input_bundle_hash: string;
          excluded_records_hash: string;
          privacy_policy_snapshot_id: string | null;
          state_interpretation_policy_id: string | null;
          result_hash: string;
          review_decision_id: string | null;
          manual_override_action_id: string | null;
          manual_override_approved_bool: boolean;
          database_order_matching_bool: boolean;
          hidden_match_reasoning_bool: boolean;
          payable_transition_bool: boolean;
          reliance_bearing_transition_bool: boolean;
          private_counterparty_data_public_bool: boolean;
          run_hash: string;
          reviewed_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          flow_type:
            | "donation_offset_batch"
            | "pledge_swap_preview"
            | "broad_match_candidate"
            | "public_goods_round";
          run_status?: "draft" | "dry_run" | "reviewed" | "blocked" | "locked" | "superseded" | "expired";
          algorithm_version?: string;
          deterministic_algorithm_bool?: boolean;
          input_bundle_hash: string;
          excluded_records_hash: string;
          privacy_policy_snapshot_id?: string | null;
          state_interpretation_policy_id?: string | null;
          result_hash: string;
          review_decision_id?: string | null;
          manual_override_action_id?: string | null;
          manual_override_approved_bool?: boolean;
          database_order_matching_bool?: boolean;
          hidden_match_reasoning_bool?: boolean;
          payable_transition_bool?: boolean;
          reliance_bearing_transition_bool?: boolean;
          private_counterparty_data_public_bool?: boolean;
          run_hash: string;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          flow_type?:
            | "donation_offset_batch"
            | "pledge_swap_preview"
            | "broad_match_candidate"
            | "public_goods_round";
          run_status?: "draft" | "dry_run" | "reviewed" | "blocked" | "locked" | "superseded" | "expired";
          algorithm_version?: string;
          deterministic_algorithm_bool?: boolean;
          input_bundle_hash?: string;
          excluded_records_hash?: string;
          privacy_policy_snapshot_id?: string | null;
          state_interpretation_policy_id?: string | null;
          result_hash?: string;
          review_decision_id?: string | null;
          manual_override_action_id?: string | null;
          manual_override_approved_bool?: boolean;
          database_order_matching_bool?: boolean;
          hidden_match_reasoning_bool?: boolean;
          payable_transition_bool?: boolean;
          reliance_bearing_transition_bool?: boolean;
          private_counterparty_data_public_bool?: boolean;
          run_hash?: string;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_matched_trade_lock_proposals: {
        Row: {
          id: string;
          matching_clearing_run_id: string;
          proposal_status:
            | "draft"
            | "participant_review"
            | "confirmed"
            | "locked"
            | "declined"
            | "expired"
            | "superseded"
            | "blocked";
          proposal_subject_kind:
            | "donation_offset_batch"
            | "pledge_swap_match"
            | "broad_match_candidate"
            | "public_goods_round";
          exact_terms_hash: string;
          counterparty_bucket_hash: string;
          matched_volume_hash: string;
          clearing_ratio_bps: number;
          ratio_bounds_status:
            | "passed"
            | "missing"
            | "under_review"
            | "failed"
            | "out_of_bounds"
            | "stale"
            | "superseded";
          baseline_snapshot_hash: string;
          destination_verification_ref: string | null;
          commitment_reservation_ref: string;
          atomic_settlement_group_ref: string;
          final_confirmation_refs: string[];
          confirmation_state: "missing" | "stale" | "scope_mismatch" | "passed" | "not_required_for_stage";
          fallback_terms_hash: string;
          evidence_standard_hash: string;
          private_counterparty_data_public_bool: boolean;
          proposal_hash: string;
          review_decision_id: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          matching_clearing_run_id: string;
          proposal_status?:
            | "draft"
            | "participant_review"
            | "confirmed"
            | "locked"
            | "declined"
            | "expired"
            | "superseded"
            | "blocked";
          proposal_subject_kind:
            | "donation_offset_batch"
            | "pledge_swap_match"
            | "broad_match_candidate"
            | "public_goods_round";
          exact_terms_hash: string;
          counterparty_bucket_hash: string;
          matched_volume_hash: string;
          clearing_ratio_bps?: number;
          ratio_bounds_status?:
            | "passed"
            | "missing"
            | "under_review"
            | "failed"
            | "out_of_bounds"
            | "stale"
            | "superseded";
          baseline_snapshot_hash: string;
          destination_verification_ref?: string | null;
          commitment_reservation_ref?: string;
          atomic_settlement_group_ref?: string;
          final_confirmation_refs?: string[];
          confirmation_state?: "missing" | "stale" | "scope_mismatch" | "passed" | "not_required_for_stage";
          fallback_terms_hash: string;
          evidence_standard_hash: string;
          private_counterparty_data_public_bool?: boolean;
          proposal_hash: string;
          review_decision_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          matching_clearing_run_id?: string;
          proposal_status?:
            | "draft"
            | "participant_review"
            | "confirmed"
            | "locked"
            | "declined"
            | "expired"
            | "superseded"
            | "blocked";
          proposal_subject_kind?:
            | "donation_offset_batch"
            | "pledge_swap_match"
            | "broad_match_candidate"
            | "public_goods_round";
          exact_terms_hash?: string;
          counterparty_bucket_hash?: string;
          matched_volume_hash?: string;
          clearing_ratio_bps?: number;
          ratio_bounds_status?:
            | "passed"
            | "missing"
            | "under_review"
            | "failed"
            | "out_of_bounds"
            | "stale"
            | "superseded";
          baseline_snapshot_hash?: string;
          destination_verification_ref?: string | null;
          commitment_reservation_ref?: string;
          atomic_settlement_group_ref?: string;
          final_confirmation_refs?: string[];
          confirmation_state?: "missing" | "stale" | "scope_mismatch" | "passed" | "not_required_for_stage";
          fallback_terms_hash?: string;
          evidence_standard_hash?: string;
          private_counterparty_data_public_bool?: boolean;
          proposal_hash?: string;
          review_decision_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_matching_clearing_reproducibility_checks: {
        Row: {
          id: string;
          matching_clearing_run_id: string;
          check_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          rerun_input_bundle_hash: string;
          rerun_result_hash: string;
          deterministic_replay_bool: boolean;
          variance_reason: string;
          check_hash: string;
          checked_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          matching_clearing_run_id: string;
          check_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          rerun_input_bundle_hash: string;
          rerun_result_hash: string;
          deterministic_replay_bool?: boolean;
          variance_reason?: string;
          check_hash: string;
          checked_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          matching_clearing_run_id?: string;
          check_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          rerun_input_bundle_hash?: string;
          rerun_result_hash?: string;
          deterministic_replay_bool?: boolean;
          variance_reason?: string;
          check_hash?: string;
          checked_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_clearing_preview_records: {
        Row: {
          id: string;
          owner_profile_id: string;
          source_offer_id: string | null;
          track: "donation_offset" | "pledge_swap";
          mode: "match_candidate" | "final_lock_proposal";
          release_stage: "donation_offset_preview_no_capture" | "pledge_swap_preview_manual_review_only";
          preview_status: "preview_ready" | "blocked_preview_only";
          matching_clearing_run_ref: string;
          final_lock_proposal_ref: string;
          required_fresh_confirmations: number;
          fresh_confirmation_count: number;
          matched_counterparty_volume_cents: number;
          unmatched_residual_cents: number;
          clearing_ratio_bps: number;
          capture_allowed_bool: false;
          reliance_bearing_bool: false;
          match_candidate_creates_deal_bool: false;
          requires_final_lock_proposal_bool: true;
          requires_fresh_confirmations_bool: true;
          preview_input_json: Json;
          preview_result_json: Json;
          preview_section_statuses: Json;
          user_facing_blockers: string[];
          blocker_codes: string[];
          policy_snapshot_ref: string;
          state_interpretation_policy_ref: string;
          contract_version: string;
          validator_version: string;
          preview_hash: string;
          idempotency_key: string;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          source_offer_id?: string | null;
          track: "donation_offset" | "pledge_swap";
          mode: "match_candidate" | "final_lock_proposal";
          release_stage: "donation_offset_preview_no_capture" | "pledge_swap_preview_manual_review_only";
          preview_status: "preview_ready" | "blocked_preview_only";
          matching_clearing_run_ref?: string;
          final_lock_proposal_ref?: string;
          required_fresh_confirmations?: number;
          fresh_confirmation_count?: number;
          matched_counterparty_volume_cents?: number;
          unmatched_residual_cents?: number;
          clearing_ratio_bps?: number;
          capture_allowed_bool?: false;
          reliance_bearing_bool?: false;
          match_candidate_creates_deal_bool?: false;
          requires_final_lock_proposal_bool?: true;
          requires_fresh_confirmations_bool?: true;
          preview_input_json: Json;
          preview_result_json: Json;
          preview_section_statuses?: Json;
          user_facing_blockers?: string[];
          blocker_codes?: string[];
          policy_snapshot_ref?: string;
          state_interpretation_policy_ref?: string;
          contract_version: string;
          validator_version: string;
          preview_hash: string;
          idempotency_key: string;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      moral_trade_baseline_integrity_enforcement_records: {
        Row: {
          id: string;
          owner_profile_id: string;
          transition:
            | "donation_offset_lock"
            | "pledge_swap_lock"
            | "broad_match_candidate"
            | "public_goods_round"
            | "post_lock_amendment";
          subject_type:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          enforcement_status: "pass" | "blocked";
          launch_classification:
            | "clearable_moral_trade"
            | "preview_only"
            | "rejected_threat_externality"
            | "manual_review_required"
            | "unclassified";
          requires_clearable_transition_bool: boolean;
          requires_reliance_bearing_transition_bool: boolean;
          requires_assessment_bool: boolean;
          policy_count: number;
          assessment_count: number;
          enforcement_input_json: Json;
          evaluation_result_json: Json;
          blocker_codes: string[];
          user_facing_blocker_categories: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          creates_clearable_transition_bool: false;
          payable_transition_allowed_bool: false;
          reliance_bearing_transition_allowed_bool: false;
          public_metric_allowed_bool: false;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          transition:
            | "donation_offset_lock"
            | "pledge_swap_lock"
            | "broad_match_candidate"
            | "public_goods_round"
            | "post_lock_amendment";
          subject_type:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          enforcement_status: "pass" | "blocked";
          launch_classification:
            | "clearable_moral_trade"
            | "preview_only"
            | "rejected_threat_externality"
            | "manual_review_required"
            | "unclassified";
          requires_clearable_transition_bool?: boolean;
          requires_reliance_bearing_transition_bool?: boolean;
          requires_assessment_bool?: boolean;
          policy_count?: number;
          assessment_count?: number;
          enforcement_input_json: Json;
          evaluation_result_json: Json;
          blocker_codes?: string[];
          user_facing_blocker_categories?: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          creates_clearable_transition_bool?: false;
          payable_transition_allowed_bool?: false;
          reliance_bearing_transition_allowed_bool?: false;
          public_metric_allowed_bool?: false;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      moral_trade_baseline_integrity_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          subject_type:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          predates_offer_required_bool: boolean;
          independent_reason_required_bool: boolean;
          history_evidence_required_bool: boolean;
          additionality_review_required_bool: boolean;
          externality_review_required_bool: boolean;
          reviewer_quality_required_bool: boolean;
          participant_confirmation_required_bool: boolean;
          good_faith_confidence_separation_required_bool: boolean;
          private_evidence_publication_prohibited_bool: boolean;
          max_assessment_age_days: number;
          policy_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          subject_type:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          predates_offer_required_bool?: boolean;
          independent_reason_required_bool?: boolean;
          history_evidence_required_bool?: boolean;
          additionality_review_required_bool?: boolean;
          externality_review_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          participant_confirmation_required_bool?: boolean;
          good_faith_confidence_separation_required_bool?: boolean;
          private_evidence_publication_prohibited_bool?: boolean;
          max_assessment_age_days?: number;
          policy_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          policy_version?: string;
          subject_type?:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          predates_offer_required_bool?: boolean;
          independent_reason_required_bool?: boolean;
          history_evidence_required_bool?: boolean;
          additionality_review_required_bool?: boolean;
          externality_review_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          participant_confirmation_required_bool?: boolean;
          good_faith_confidence_separation_required_bool?: boolean;
          private_evidence_publication_prohibited_bool?: boolean;
          max_assessment_age_days?: number;
          policy_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_baseline_integrity_assessments: {
        Row: {
          id: string;
          baseline_integrity_policy_ref: string;
          subject_type:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          subject_ref: string;
          assessment_state: "not_required" | "under_review" | "non_blocking" | "blocked" | "superseded" | "stale";
          launch_classification:
            | "clearable_moral_trade"
            | "preview_only"
            | "rejected_threat_externality"
            | "manual_review_required";
          baseline_source_kind:
            | "pre_existing_behavior"
            | "independent_obligation"
            | "historical_pattern"
            | "marketplace_created"
            | "marketplace_escalated"
            | "counterparty_triggered"
            | "unknown";
          baseline_snapshot_hash: string;
          predates_offer_bool: boolean;
          independent_reason_present_bool: boolean;
          history_evidence_present_bool: boolean;
          marketplace_created_bool: boolean;
          marketplace_escalated_bool: boolean;
          counterparty_triggered_escalation_bool: boolean;
          harmful_baseline_escalated_bool: boolean;
          good_faith_confidence_separated_bool: boolean;
          additionality_review_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          externality_review_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          participant_confirmation_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          private_evidence_public_bool: boolean;
          assessment_hash: string;
          review_decision_id: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baseline_integrity_policy_ref: string;
          subject_type:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          subject_ref?: string;
          assessment_state?: "not_required" | "under_review" | "non_blocking" | "blocked" | "superseded" | "stale";
          launch_classification?:
            | "clearable_moral_trade"
            | "preview_only"
            | "rejected_threat_externality"
            | "manual_review_required";
          baseline_source_kind?:
            | "pre_existing_behavior"
            | "independent_obligation"
            | "historical_pattern"
            | "marketplace_created"
            | "marketplace_escalated"
            | "counterparty_triggered"
            | "unknown";
          baseline_snapshot_hash: string;
          predates_offer_bool?: boolean;
          independent_reason_present_bool?: boolean;
          history_evidence_present_bool?: boolean;
          marketplace_created_bool?: boolean;
          marketplace_escalated_bool?: boolean;
          counterparty_triggered_escalation_bool?: boolean;
          harmful_baseline_escalated_bool?: boolean;
          good_faith_confidence_separated_bool?: boolean;
          additionality_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          externality_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          participant_confirmation_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          private_evidence_public_bool?: boolean;
          assessment_hash: string;
          review_decision_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          baseline_integrity_policy_ref?: string;
          subject_type?:
            | "offset_offer"
            | "pledge_swap_offer"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          subject_ref?: string;
          assessment_state?: "not_required" | "under_review" | "non_blocking" | "blocked" | "superseded" | "stale";
          launch_classification?:
            | "clearable_moral_trade"
            | "preview_only"
            | "rejected_threat_externality"
            | "manual_review_required";
          baseline_source_kind?:
            | "pre_existing_behavior"
            | "independent_obligation"
            | "historical_pattern"
            | "marketplace_created"
            | "marketplace_escalated"
            | "counterparty_triggered"
            | "unknown";
          baseline_snapshot_hash?: string;
          predates_offer_bool?: boolean;
          independent_reason_present_bool?: boolean;
          history_evidence_present_bool?: boolean;
          marketplace_created_bool?: boolean;
          marketplace_escalated_bool?: boolean;
          counterparty_triggered_escalation_bool?: boolean;
          harmful_baseline_escalated_bool?: boolean;
          good_faith_confidence_separated_bool?: boolean;
          additionality_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          externality_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          participant_confirmation_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          private_evidence_public_bool?: boolean;
          assessment_hash?: string;
          review_decision_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_agreement_amendment_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          subject_type:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          amendment_type:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          renewed_confirmation_required_bool: boolean;
          neutral_review_required_for_burden_shift_bool: boolean;
          non_retroactivity_required_bool: boolean;
          before_after_hash_required_bool: boolean;
          notice_required_bool: boolean;
          reviewer_quality_required_bool: boolean;
          baseline_integrity_required_bool: boolean;
          max_amendment_age_days: number;
          policy_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          subject_type:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          amendment_type:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          renewed_confirmation_required_bool?: boolean;
          neutral_review_required_for_burden_shift_bool?: boolean;
          non_retroactivity_required_bool?: boolean;
          before_after_hash_required_bool?: boolean;
          notice_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          baseline_integrity_required_bool?: boolean;
          max_amendment_age_days?: number;
          policy_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          policy_version?: string;
          subject_type?:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          amendment_type?:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          renewed_confirmation_required_bool?: boolean;
          neutral_review_required_for_burden_shift_bool?: boolean;
          non_retroactivity_required_bool?: boolean;
          before_after_hash_required_bool?: boolean;
          notice_required_bool?: boolean;
          reviewer_quality_required_bool?: boolean;
          baseline_integrity_required_bool?: boolean;
          max_amendment_age_days?: number;
          policy_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_agreement_amendment_records: {
        Row: {
          id: string;
          agreement_amendment_policy_ref: string;
          subject_type:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          subject_ref: string;
          amendment_type:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          amendment_state:
            | "draft"
            | "presented"
            | "confirmed"
            | "approved"
            | "applied"
            | "rejected"
            | "withdrawn"
            | "superseded"
            | "stale";
          material_change_bool: boolean;
          burden_or_benefit_shift_bool: boolean;
          parent_record_edit_detected_bool: boolean;
          retroactive_performance_change_bool: boolean;
          evidence_claim_retyped_bool: boolean;
          exposure_increase_bool: boolean;
          funds_redirect_bool: boolean;
          compensation_change_bool: boolean;
          cancellation_rights_narrowed_bool: boolean;
          privacy_disclosure_change_bool: boolean;
          donor_of_record_change_bool: boolean;
          third_party_obligation_change_bool: boolean;
          before_terms_hash: string;
          after_terms_hash: string;
          policy_snapshot_bundle_hash: string;
          renewed_confirmation_refs: string[];
          confirmation_state: "missing" | "stale" | "scope_mismatch" | "passed" | "not_required_for_stage";
          neutral_review_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          notice_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          baseline_integrity_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          amendment_hash: string;
          review_decision_id: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          applied_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agreement_amendment_policy_ref: string;
          subject_type:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          subject_ref?: string;
          amendment_type:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          amendment_state?:
            | "draft"
            | "presented"
            | "confirmed"
            | "approved"
            | "applied"
            | "rejected"
            | "withdrawn"
            | "superseded"
            | "stale";
          material_change_bool?: boolean;
          burden_or_benefit_shift_bool?: boolean;
          parent_record_edit_detected_bool?: boolean;
          retroactive_performance_change_bool?: boolean;
          evidence_claim_retyped_bool?: boolean;
          exposure_increase_bool?: boolean;
          funds_redirect_bool?: boolean;
          compensation_change_bool?: boolean;
          cancellation_rights_narrowed_bool?: boolean;
          privacy_disclosure_change_bool?: boolean;
          donor_of_record_change_bool?: boolean;
          third_party_obligation_change_bool?: boolean;
          before_terms_hash: string;
          after_terms_hash: string;
          policy_snapshot_bundle_hash: string;
          renewed_confirmation_refs?: string[];
          confirmation_state?: "missing" | "stale" | "scope_mismatch" | "passed" | "not_required_for_stage";
          neutral_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          notice_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          baseline_integrity_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          amendment_hash: string;
          review_decision_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          applied_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agreement_amendment_policy_ref?: string;
          subject_type?:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          subject_ref?: string;
          amendment_type?:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          amendment_state?:
            | "draft"
            | "presented"
            | "confirmed"
            | "approved"
            | "applied"
            | "rejected"
            | "withdrawn"
            | "superseded"
            | "stale";
          material_change_bool?: boolean;
          burden_or_benefit_shift_bool?: boolean;
          parent_record_edit_detected_bool?: boolean;
          retroactive_performance_change_bool?: boolean;
          evidence_claim_retyped_bool?: boolean;
          exposure_increase_bool?: boolean;
          funds_redirect_bool?: boolean;
          compensation_change_bool?: boolean;
          cancellation_rights_narrowed_bool?: boolean;
          privacy_disclosure_change_bool?: boolean;
          donor_of_record_change_bool?: boolean;
          third_party_obligation_change_bool?: boolean;
          before_terms_hash?: string;
          after_terms_hash?: string;
          policy_snapshot_bundle_hash?: string;
          renewed_confirmation_refs?: string[];
          confirmation_state?: "missing" | "stale" | "scope_mismatch" | "passed" | "not_required_for_stage";
          neutral_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          notice_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          reviewer_quality_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          baseline_integrity_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          amendment_hash?: string;
          review_decision_id?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          applied_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_agreement_amendment_enforcement_records: {
        Row: {
          id: string;
          owner_profile_id: string;
          transition:
            | "donation_offset_material_change"
            | "pledge_swap_material_change"
            | "post_lock_correction"
            | "pause_or_early_termination"
            | "evidence_standard_change"
            | "destination_change";
          subject_type:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          amendment_type:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          enforcement_status: "pass" | "blocked";
          requires_amendment_bool: boolean;
          requires_applied_amendment_bool: boolean;
          requires_reliance_bearing_transition_bool: boolean;
          requires_renewed_confirmations_bool: boolean;
          requires_neutral_review_bool: boolean;
          policy_count: number;
          amendment_count: number;
          enforcement_input_json: Json;
          evaluation_result_json: Json;
          blocker_codes: string[];
          user_facing_blocker_categories: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          applies_amendment_bool: false;
          material_change_allowed_bool: false;
          parent_record_mutation_allowed_bool: false;
          payment_transition_allowed_bool: false;
          reliance_bearing_transition_allowed_bool: false;
          public_metric_allowed_bool: false;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          transition:
            | "donation_offset_material_change"
            | "pledge_swap_material_change"
            | "post_lock_correction"
            | "pause_or_early_termination"
            | "evidence_standard_change"
            | "destination_change";
          subject_type:
            | "locked_donation_offset"
            | "locked_pledge_swap"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement";
          amendment_type:
            | "correction"
            | "mutual_modification"
            | "pause"
            | "early_termination"
            | "evidence_standard_change"
            | "schedule_change"
            | "compensation_change"
            | "destination_change"
            | "baseline_correction"
            | "privacy_change"
            | "other";
          enforcement_status: "pass" | "blocked";
          requires_amendment_bool?: boolean;
          requires_applied_amendment_bool?: boolean;
          requires_reliance_bearing_transition_bool?: boolean;
          requires_renewed_confirmations_bool?: boolean;
          requires_neutral_review_bool?: boolean;
          policy_count?: number;
          amendment_count?: number;
          enforcement_input_json: Json;
          evaluation_result_json: Json;
          blocker_codes?: string[];
          user_facing_blocker_categories?: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          applies_amendment_bool?: false;
          material_change_allowed_bool?: false;
          parent_record_mutation_allowed_bool?: false;
          payment_transition_allowed_bool?: false;
          reliance_bearing_transition_allowed_bool?: false;
          public_metric_allowed_bool?: false;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      moral_trade_challenge_appeal_enforcement_records: {
        Row: {
          id: string;
          owner_profile_id: string;
          subject:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          trigger:
            | "duplicate_proof"
            | "coercive_baseline"
            | "wrong_scope_evidence"
            | "material_factual_error"
            | "privacy_disclosure_error"
            | "externality_remedy_gap"
            | "reviewer_conflict"
            | "policy_misapplied";
          enforcement_status: "pass" | "blocked";
          requires_appeal_case_bool: boolean;
          requires_neutral_review_bool: boolean;
          policy_count: number;
          appeal_case_count: number;
          enforcement_input_json: Json;
          evaluation_result_json: Json;
          blocker_codes: string[];
          user_facing_blocker_categories: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          opens_appeal_bool: false;
          corrects_record_bool: false;
          reliance_bearing_transition_allowed_bool: false;
          safety_blocker_waiver_allowed_bool: false;
          settled_obligation_reopen_allowed_bool: false;
          public_metric_allowed_bool: false;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_profile_id: string;
          subject:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          trigger:
            | "duplicate_proof"
            | "coercive_baseline"
            | "wrong_scope_evidence"
            | "material_factual_error"
            | "privacy_disclosure_error"
            | "externality_remedy_gap"
            | "reviewer_conflict"
            | "policy_misapplied";
          enforcement_status: "pass" | "blocked";
          requires_appeal_case_bool?: boolean;
          requires_neutral_review_bool?: boolean;
          policy_count?: number;
          appeal_case_count?: number;
          enforcement_input_json: Json;
          evaluation_result_json: Json;
          blocker_codes?: string[];
          user_facing_blocker_categories?: string[];
          contract_version: string;
          validator_version: string;
          evaluation_hash: string;
          idempotency_key: string;
          opens_appeal_bool?: false;
          corrects_record_bool?: false;
          reliance_bearing_transition_allowed_bool?: false;
          safety_blocker_waiver_allowed_bool?: false;
          settled_obligation_reopen_allowed_bool?: false;
          public_metric_allowed_bool?: false;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      moral_trade_template_parameter_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_approved_trade_templates: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_template_instance_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_template_conformance_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_review_capacity_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_review_queue_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_reviewer_panel_assignments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_review_capacity_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_counterparty_blinding_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_participant_term_sheet_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_staged_counterparty_disclosure_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_participant_term_sheet_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_recipient_acceptance_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_recipient_acceptance_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_adverse_association_reviews: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_recipient_acceptance_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_ai_preference_elicitation_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_ai_preference_elicitation_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_ai_preference_elicitation_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_post_clear_audit_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_post_clear_audit_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_post_clear_audit_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_non_public_goods_subsidy_pools: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_subsidy_schedule_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_non_public_goods_subsidy_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_non_public_goods_tier_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_counterfactual_trust_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_non_public_goods_tier_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_risk_control_packs: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_control_applicability_matrices: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_control_requirement_results: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_risk_control_matrix_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_option_set_comparison_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_preference_comparability_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_trade_burden_accounting_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_moral_difference_attestation_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_bargaining_protocols: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_bargaining_round_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_empirical_assumption_snapshots: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_moral_side_constraint_profiles: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_intrapersonal_self_offset_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_preference_integrity_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_commitment_inventory_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_commitment_reservation_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_atomic_settlement_groups: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_commitment_settlement_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_participant_credibility_profiles: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_credibility_events: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_credibility_scoring_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_credibility_appeals: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_friend_testimonial_invites: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_friend_testimonials: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_testimonial_quality_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_testimonial_credibility_events: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_testimonial_stake_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_testimonial_stakes: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pledge_performance_bond_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pledge_performance_bond_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pledge_performance_bond_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pledge_swap_performance_schedules: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pledge_swap_performance_schedule_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_cause_bucket_taxonomies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_cause_bucket_assignments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_cause_bucket_taxonomy_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_resource_compatibility_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_resource_compatibility_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_net_offset_accounting_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_net_offset_accounting_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_offer_validity_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_offer_validity_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_private_exchange_rate_quote_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_private_exchange_rate_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_noncompensable_blocker_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_noncompensable_blocker_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_batch_clearing_objective_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_batch_clearing_objective_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_sensitive_evidence_attestations: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_sensitive_evidence_attestation_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pilot_evidence_gates: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_pilot_evidence_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_direct_pair_clearing_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_direct_pair_clearing_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_appeal_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          subject:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          notice_required_bool: boolean;
          deadline_required_bool: boolean;
          neutral_review_required_bool: boolean;
          non_retaliation_required_bool: boolean;
          safety_blocker_waiver_prohibited_bool: boolean;
          settled_obligation_reopen_prohibited_bool: boolean;
          max_appeal_age_days: number;
          policy_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          subject:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          notice_required_bool?: boolean;
          deadline_required_bool?: boolean;
          neutral_review_required_bool?: boolean;
          non_retaliation_required_bool?: boolean;
          safety_blocker_waiver_prohibited_bool?: boolean;
          settled_obligation_reopen_prohibited_bool?: boolean;
          max_appeal_age_days?: number;
          policy_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          policy_version?: string;
          subject?:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          notice_required_bool?: boolean;
          deadline_required_bool?: boolean;
          neutral_review_required_bool?: boolean;
          non_retaliation_required_bool?: boolean;
          safety_blocker_waiver_prohibited_bool?: boolean;
          settled_obligation_reopen_prohibited_bool?: boolean;
          max_appeal_age_days?: number;
          policy_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_appeal_cases: {
        Row: {
          id: string;
          appeal_policy_ref: string;
          subject:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          standing:
            | "participant"
            | "counterparty"
            | "affected_party"
            | "reviewer"
            | "admin_safety"
            | "external_verifier";
          trigger:
            | "duplicate_proof"
            | "coercive_baseline"
            | "wrong_scope_evidence"
            | "material_factual_error"
            | "privacy_disclosure_error"
            | "externality_remedy_gap"
            | "reviewer_conflict"
            | "policy_misapplied";
          outcome:
            | "uphold_decision"
            | "request_evidence"
            | "route_human_review"
            | "open_challenge_window"
            | "block_reliance"
            | "record_remedy"
            | "close_unresolved"
            | "correct_record";
          status:
            | "draft"
            | "filed"
            | "noticed"
            | "under_neutral_review"
            | "correction_requested"
            | "upheld"
            | "corrected"
            | "dismissed"
            | "closed_unresolved"
            | "superseded"
            | "stale";
          notice_state: "missing" | "queued" | "delivered" | "failed" | "not_required_for_stage";
          deadline_at: string | null;
          filed_at: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          neutral_review_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          standing_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          scope_hash: string;
          evidence_scope_refs: string[];
          private_details_redacted_bool: boolean;
          safety_blocker_waiver_attempted_bool: boolean;
          settled_obligation_reopen_attempted_bool: boolean;
          non_retaliation_notice_sent_bool: boolean;
          case_hash: string;
          review_decision_id: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appeal_policy_ref: string;
          subject:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          standing:
            | "participant"
            | "counterparty"
            | "affected_party"
            | "reviewer"
            | "admin_safety"
            | "external_verifier";
          trigger:
            | "duplicate_proof"
            | "coercive_baseline"
            | "wrong_scope_evidence"
            | "material_factual_error"
            | "privacy_disclosure_error"
            | "externality_remedy_gap"
            | "reviewer_conflict"
            | "policy_misapplied";
          outcome:
            | "uphold_decision"
            | "request_evidence"
            | "route_human_review"
            | "open_challenge_window"
            | "block_reliance"
            | "record_remedy"
            | "close_unresolved"
            | "correct_record";
          status?:
            | "draft"
            | "filed"
            | "noticed"
            | "under_neutral_review"
            | "correction_requested"
            | "upheld"
            | "corrected"
            | "dismissed"
            | "closed_unresolved"
            | "superseded"
            | "stale";
          notice_state?: "missing" | "queued" | "delivered" | "failed" | "not_required_for_stage";
          deadline_at?: string | null;
          filed_at?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          neutral_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          standing_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          scope_hash: string;
          evidence_scope_refs?: string[];
          private_details_redacted_bool?: boolean;
          safety_blocker_waiver_attempted_bool?: boolean;
          settled_obligation_reopen_attempted_bool?: boolean;
          non_retaliation_notice_sent_bool?: boolean;
          case_hash: string;
          review_decision_id?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          appeal_policy_ref?: string;
          subject?:
            | "claim"
            | "evidence_row"
            | "baseline_concern"
            | "disclosure_decision"
            | "externality_trigger"
            | "completion_state"
            | "policy_flag";
          standing?:
            | "participant"
            | "counterparty"
            | "affected_party"
            | "reviewer"
            | "admin_safety"
            | "external_verifier";
          trigger?:
            | "duplicate_proof"
            | "coercive_baseline"
            | "wrong_scope_evidence"
            | "material_factual_error"
            | "privacy_disclosure_error"
            | "externality_remedy_gap"
            | "reviewer_conflict"
            | "policy_misapplied";
          outcome?:
            | "uphold_decision"
            | "request_evidence"
            | "route_human_review"
            | "open_challenge_window"
            | "block_reliance"
            | "record_remedy"
            | "close_unresolved"
            | "correct_record";
          status?:
            | "draft"
            | "filed"
            | "noticed"
            | "under_neutral_review"
            | "correction_requested"
            | "upheld"
            | "corrected"
            | "dismissed"
            | "closed_unresolved"
            | "superseded"
            | "stale";
          notice_state?: "missing" | "queued" | "delivered" | "failed" | "not_required_for_stage";
          deadline_at?: string | null;
          filed_at?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          neutral_review_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          standing_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          scope_hash?: string;
          evidence_scope_refs?: string[];
          private_details_redacted_bool?: boolean;
          safety_blocker_waiver_attempted_bool?: boolean;
          settled_obligation_reopen_attempted_bool?: boolean;
          non_retaliation_notice_sent_bool?: boolean;
          case_hash?: string;
          review_decision_id?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      risk_signals: {
        Row: {
          id: string;
          profile_id: string | null;
          match_id: string | null;
          signal_type: string;
          severity: "low" | "medium" | "high" | "critical";
          summary: string;
          metadata: Record<string, unknown>;
          status: "open" | "reviewed" | "dismissed";
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          match_id?: string | null;
          signal_type: string;
          severity?: "low" | "medium" | "high" | "critical";
          summary?: string;
          metadata?: Record<string, unknown>;
          status?: "open" | "reviewed" | "dismissed";
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          profile_id?: string | null;
          signal_type?: string;
          severity?: "low" | "medium" | "high" | "critical";
          summary?: string;
          metadata?: Record<string, unknown>;
          status?: "open" | "reviewed" | "dismissed";
          reviewed_at?: string | null;
        };
        Relationships: [];
      };
      brokerage_bounties: {
        Row: {
          id: string;
          profile_id: string;
          label: string;
          target_kind: "counterparty" | "group" | "institution" | "public_call";
          cause_area: string;
          max_amount_cents: number;
          currency: string;
          reward_type: "introduction" | "verified_trade" | "group_formation" | "research_lead";
          preferred_regions: string[];
          success_condition: string;
          target_note: string;
          status: "active" | "paused" | "awarded" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          label: string;
          target_kind?: "counterparty" | "group" | "institution" | "public_call";
          cause_area?: string;
          max_amount_cents?: number;
          currency?: string;
          reward_type?: "introduction" | "verified_trade" | "group_formation" | "research_lead";
          preferred_regions?: string[];
          success_condition?: string;
          target_note?: string;
          status?: "active" | "paused" | "awarded" | "cancelled";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          target_kind?: "counterparty" | "group" | "institution" | "public_call";
          cause_area?: string;
          max_amount_cents?: number;
          currency?: string;
          reward_type?: "introduction" | "verified_trade" | "group_formation" | "research_lead";
          preferred_regions?: string[];
          success_condition?: string;
          target_note?: string;
          status?: "active" | "paused" | "awarded" | "cancelled";
          updated_at?: string;
        };
        Relationships: [];
      };
      collectives: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string;
          homepage_url: string;
          contact_policy: string;
          decision_rule: string;
          verification_notes: string;
          verification_status: "unverified" | "review_pending" | "verified";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string;
          homepage_url?: string;
          contact_policy?: string;
          decision_rule?: string;
          verification_notes?: string;
          verification_status?: "unverified" | "review_pending" | "verified";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string;
          homepage_url?: string;
          contact_policy?: string;
          decision_rule?: string;
          verification_notes?: string;
          verification_status?: "unverified" | "review_pending" | "verified";
          updated_at?: string;
        };
        Relationships: [];
      };
      collective_members: {
        Row: {
          collective_id: string;
          profile_id: string;
          role: "owner" | "admin" | "delegate" | "reviewer" | "member" | "viewer";
          status: "invited" | "active" | "removed";
          delegation_scope: string;
          can_approve_matches: boolean;
          can_grant_privacy: boolean;
          can_manage_bounties: boolean;
          permissions: string[];
          created_at: string;
        };
        Insert: {
          collective_id: string;
          profile_id: string;
          role?: "owner" | "admin" | "delegate" | "reviewer" | "member" | "viewer";
          status?: "invited" | "active" | "removed";
          delegation_scope?: string;
          can_approve_matches?: boolean;
          can_grant_privacy?: boolean;
          can_manage_bounties?: boolean;
          permissions?: string[];
          created_at?: string;
        };
        Update: {
          role?: "owner" | "admin" | "delegate" | "reviewer" | "member" | "viewer";
          status?: "invited" | "active" | "removed";
          delegation_scope?: string;
          can_approve_matches?: boolean;
          can_grant_privacy?: boolean;
          can_manage_bounties?: boolean;
          permissions?: string[];
        };
        Relationships: [];
      };
      collective_decisions: {
        Row: {
          id: string;
          collective_id: string;
          created_by: string;
          title: string;
          decision_type:
            | "match_review"
            | "privacy_grant"
            | "bounty_award"
            | "verification_request"
            | "general";
          target_kind: "match" | "collective" | "bounty" | "privacy_grant" | "internal";
          target_id: string | null;
          target_label: string;
          summary: string;
          required_approvals: number;
          status: "open" | "approved" | "rejected" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          collective_id: string;
          created_by: string;
          title: string;
          decision_type?:
            | "match_review"
            | "privacy_grant"
            | "bounty_award"
            | "verification_request"
            | "general";
          target_kind?: "match" | "collective" | "bounty" | "privacy_grant" | "internal";
          target_id?: string | null;
          target_label?: string;
          summary?: string;
          required_approvals?: number;
          status?: "open" | "approved" | "rejected" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          decision_type?:
            | "match_review"
            | "privacy_grant"
            | "bounty_award"
            | "verification_request"
            | "general";
          target_kind?: "match" | "collective" | "bounty" | "privacy_grant" | "internal";
          target_id?: string | null;
          target_label?: string;
          summary?: string;
          required_approvals?: number;
          status?: "open" | "approved" | "rejected" | "archived";
          updated_at?: string;
        };
        Relationships: [];
      };
      collective_decision_responses: {
        Row: {
          decision_id: string;
          profile_id: string;
          response: "approve" | "reject" | "abstain";
          note: string;
          responded_at: string;
        };
        Insert: {
          decision_id: string;
          profile_id: string;
          response?: "approve" | "reject" | "abstain";
          note?: string;
          responded_at?: string;
        };
        Update: {
          response?: "approve" | "reject" | "abstain";
          note?: string;
          responded_at?: string;
        };
        Relationships: [];
      };
      mpgf_round_rulebooks: {
        Row: {
          id: string;
          round_id: string;
          policy: string;
          ecm_plus_hybrid_policy: string;
          batch_cadence_policy: string;
          custody_policy: string;
          refund_reroute_policy: string;
          cross_view_subsidy_policy: string;
          batch_interval_min_days: number;
          batch_interval_max_days: number;
          cross_view_subsidy_schedule: Json;
          rulebook_json: Json;
          published_before_round_open: boolean;
          no_global_moral_ranking: true;
          moral_reputation_can_increase_allocation_power: false;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          policy?: string;
          ecm_plus_hybrid_policy?: string;
          batch_cadence_policy?: string;
          custody_policy?: string;
          refund_reroute_policy?: string;
          cross_view_subsidy_policy?: string;
          batch_interval_min_days?: number;
          batch_interval_max_days?: number;
          cross_view_subsidy_schedule?: Json;
          rulebook_json: Json;
          published_before_round_open?: boolean;
          no_global_moral_ranking?: true;
          moral_reputation_can_increase_allocation_power?: false;
          created_at?: string;
        };
        Update: {
          policy?: string;
          ecm_plus_hybrid_policy?: string;
          batch_cadence_policy?: string;
          custody_policy?: string;
          refund_reroute_policy?: string;
          cross_view_subsidy_policy?: string;
          batch_interval_min_days?: number;
          batch_interval_max_days?: number;
          cross_view_subsidy_schedule?: Json;
          rulebook_json?: Json;
          published_before_round_open?: boolean;
          no_global_moral_ranking?: true;
          moral_reputation_can_increase_allocation_power?: false;
        };
        Relationships: [];
      };
      mpgf_recipient_registry: {
        Row: {
          id: string;
          campaign_id: string;
          legal_entity_or_fiscal_host: string;
          registry_status:
            | "eligible_after_review_and_challenge"
            | "review_required_before_payable"
            | "demo_only_not_payable"
            | "blocked_not_payable";
          payout_rail:
            | "partner_donation_route"
            | "fiscal_host_release"
            | "signed_sponsor_route"
            | "not_payable_demo_only";
          allowed_uses: string[];
          receipt_or_milestone_rules: string;
          review_state: string;
          challenge_state: "challenge_window_open" | "closed_or_not_open";
          challenge_window_ends_at: string | null;
          public_aggregation_only: true;
          created_at: string;
        };
        Insert: {
          id: string;
          campaign_id: string;
          legal_entity_or_fiscal_host: string;
          registry_status:
            | "eligible_after_review_and_challenge"
            | "review_required_before_payable"
            | "demo_only_not_payable"
            | "blocked_not_payable";
          payout_rail:
            | "partner_donation_route"
            | "fiscal_host_release"
            | "signed_sponsor_route"
            | "not_payable_demo_only";
          allowed_uses?: string[];
          receipt_or_milestone_rules: string;
          review_state: string;
          challenge_state: "challenge_window_open" | "closed_or_not_open";
          challenge_window_ends_at?: string | null;
          public_aggregation_only?: true;
          created_at?: string;
        };
        Update: {
          legal_entity_or_fiscal_host?: string;
          registry_status?:
            | "eligible_after_review_and_challenge"
            | "review_required_before_payable"
            | "demo_only_not_payable"
            | "blocked_not_payable";
          payout_rail?:
            | "partner_donation_route"
            | "fiscal_host_release"
            | "signed_sponsor_route"
            | "not_payable_demo_only";
          allowed_uses?: string[];
          receipt_or_milestone_rules?: string;
          review_state?: string;
          challenge_state?: "challenge_window_open" | "closed_or_not_open";
          challenge_window_ends_at?: string | null;
          public_aggregation_only?: true;
        };
        Relationships: [];
      };
      mpgf_custody_holds: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          pledge_intent_id: string | null;
          provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
          custodial_state:
            | "awaiting_partner_or_fiscal_host_custody_confirmation"
            | "custody_confirmed"
            | "release_ready_after_challenge_window"
            | "released"
            | "cancelled"
            | "expired";
          amount_cents: number;
          max_exposure_cents: number;
          escrow_claim_allowed: false;
          release_only_after_recipient_verification: true;
          release_only_after_challenge_window_completion: true;
          failure_rule: Json;
          provider_ref_hash: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          pledge_intent_id?: string | null;
          provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
          custodial_state:
            | "awaiting_partner_or_fiscal_host_custody_confirmation"
            | "custody_confirmed"
            | "release_ready_after_challenge_window"
            | "released"
            | "cancelled"
            | "expired";
          amount_cents: number;
          max_exposure_cents: number;
          escrow_claim_allowed?: false;
          release_only_after_recipient_verification?: true;
          release_only_after_challenge_window_completion?: true;
          failure_rule?: Json;
          provider_ref_hash?: string | null;
          created_at?: string;
        };
        Update: {
          custodial_state?:
            | "awaiting_partner_or_fiscal_host_custody_confirmation"
            | "custody_confirmed"
            | "release_ready_after_challenge_window"
            | "released"
            | "cancelled"
            | "expired";
          escrow_claim_allowed?: false;
          release_only_after_recipient_verification?: true;
          release_only_after_challenge_window_completion?: true;
          failure_rule?: Json;
          provider_ref_hash?: string | null;
        };
        Relationships: [];
      };
      mpgf_pledge_intents: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          profile_id: string | null;
          user_ref_hash: string;
          idempotency_key_hash: string;
          amount_cents: number;
          currency: "usd";
          acceptable_counterpart_buckets: string[];
          minimum_counterparty_cleared_cents: number;
          max_exposure_cents: number;
          visibility_pref: "private_amount" | "public_supporter" | "public_reason";
          payment_state:
            | "intent_created"
            | "identity_verified"
            | "identity_pending_review"
            | "authorization_pending"
            | "authorized"
            | "manual_evidence_required"
            | "provider_event_received"
            | "captured"
            | "voided"
            | "expired";
          counting_state: "not_counted" | "preview_only" | "eligible_pending_thresholds" | "counted_after_review" | "excluded";
          fallback_rule: Json;
          donor_exposure_disclosure: Json;
          cross_view_clearance_policy: string;
          capture_policy: "capture_only_after_threshold_review_and_challenge_window";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          profile_id?: string | null;
          user_ref_hash: string;
          idempotency_key_hash: string;
          amount_cents: number;
          currency?: "usd";
          acceptable_counterpart_buckets?: string[];
          minimum_counterparty_cleared_cents?: number;
          max_exposure_cents?: number;
          visibility_pref?: "private_amount" | "public_supporter" | "public_reason";
          payment_state?:
            | "intent_created"
            | "identity_verified"
            | "identity_pending_review"
            | "authorization_pending"
            | "authorized"
            | "manual_evidence_required"
            | "provider_event_received"
            | "captured"
            | "voided"
            | "expired";
          counting_state?: "not_counted" | "preview_only" | "eligible_pending_thresholds" | "counted_after_review" | "excluded";
          fallback_rule?: Json;
          donor_exposure_disclosure?: Json;
          cross_view_clearance_policy?: string;
          capture_policy?: "capture_only_after_threshold_review_and_challenge_window";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          payment_state?:
            | "intent_created"
            | "identity_verified"
            | "identity_pending_review"
            | "authorization_pending"
            | "authorized"
            | "manual_evidence_required"
            | "provider_event_received"
            | "captured"
            | "voided"
            | "expired";
          counting_state?: "not_counted" | "preview_only" | "eligible_pending_thresholds" | "counted_after_review" | "excluded";
          updated_at?: string;
        };
        Relationships: [];
      };
      mpgf_identity_verifications: {
        Row: {
          id: string;
          pledge_intent_id: string;
          provider: "demo_self_attestation" | "repository_profile" | "external_proof_of_personhood";
          status: "verified" | "pending_review" | "duplicate_identity" | "blocked";
          human_score_bps: number;
          redacted_reference: string;
          duplicate_proof_hash: string | null;
          counts_for_matching: boolean;
          verified_at: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          pledge_intent_id: string;
          provider: "demo_self_attestation" | "repository_profile" | "external_proof_of_personhood";
          status: "verified" | "pending_review" | "duplicate_identity" | "blocked";
          human_score_bps: number;
          redacted_reference: string;
          duplicate_proof_hash?: string | null;
          counts_for_matching?: boolean;
          verified_at?: string | null;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          status?: "verified" | "pending_review" | "duplicate_identity" | "blocked";
          counts_for_matching?: boolean;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      mpgf_payment_authorizations: {
        Row: {
          id: string;
          pledge_intent_id: string;
          provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
          provider_ref_hash: string | null;
          amount_cents: number;
          currency: "usd";
          status:
            | "requires_identity"
            | "authorized"
            | "manual_fallback_required"
            | "provider_event_received"
            | "captured"
            | "failed"
            | "voided"
            | "expired";
          capture_policy: "capture_only_after_threshold_review_and_challenge_window";
          manual_evidence_path: string | null;
          authorized_at: string | null;
          captured_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          pledge_intent_id: string;
          provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
          provider_ref_hash?: string | null;
          amount_cents: number;
          currency?: "usd";
          status:
            | "requires_identity"
            | "authorized"
            | "manual_fallback_required"
            | "provider_event_received"
            | "captured"
            | "failed"
            | "voided"
            | "expired";
          capture_policy?: "capture_only_after_threshold_review_and_challenge_window";
          manual_evidence_path?: string | null;
          authorized_at?: string | null;
          captured_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?:
            | "requires_identity"
            | "authorized"
            | "manual_fallback_required"
            | "provider_event_received"
            | "captured"
            | "failed"
            | "voided"
            | "expired";
          authorized_at?: string | null;
          captured_at?: string | null;
        };
        Relationships: [];
      };
      mpgf_provider_payment_events: {
        Row: {
          id: string;
          payment_authorization_id: string;
          pledge_intent_id: string;
          provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
          provider_event_ref_hash: string;
          event_type:
            | "authorization_created"
            | "authorization_failed"
            | "capture_succeeded"
            | "capture_failed"
            | "refund_succeeded"
            | "payment_expired";
          amount_cents: number;
          status: "recorded" | "needs_review" | "rejected";
          signature_verified: boolean;
          payload_hash: string | null;
          final_payout_authorized: false;
          append_only_hash: string;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          payment_authorization_id: string;
          pledge_intent_id: string;
          provider: "stripe" | "fiscal_host" | "external_provider" | "manual_evidence";
          provider_event_ref_hash: string;
          event_type:
            | "authorization_created"
            | "authorization_failed"
            | "capture_succeeded"
            | "capture_failed"
            | "refund_succeeded"
            | "payment_expired";
          amount_cents: number;
          status: "recorded" | "needs_review" | "rejected";
          signature_verified?: boolean;
          payload_hash?: string | null;
          final_payout_authorized?: false;
          append_only_hash: string;
          received_at?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      mpgf_public_goods_payment_proofs: {
        Row: {
          id: string;
          pledge_id: string | null;
          campaign_id: string;
          external_receipt_ref: string | null;
          charity_receipt_ref: string | null;
          amount_verified_cents: number;
          status: "pending_review" | "verified" | "rejected" | "superseded";
          reason_code:
            | "destination_verified"
            | "needs_destination_evidence"
            | "needs_identity_evidence"
            | "blocked_threat_baseline"
            | "blocked_destination_risk"
            | "challenge_opened"
            | "challenge_resolved"
            | "external_handoff_verified"
            | "external_handoff_failed"
            | "duplicate_identity_blocked"
            | "appeal_requested"
            | "appeal_denied"
            | "appeal_upheld";
          reconciliation_source:
            | "external_receipt"
            | "fiscal_host_webhook"
            | "sponsor_signed_intent"
            | "every_org_partner_webhook";
          source_event_ref: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          pledge_id?: string | null;
          campaign_id: string;
          external_receipt_ref?: string | null;
          charity_receipt_ref?: string | null;
          amount_verified_cents?: number;
          status?: "pending_review" | "verified" | "rejected" | "superseded";
          reason_code?:
            | "destination_verified"
            | "needs_destination_evidence"
            | "needs_identity_evidence"
            | "blocked_threat_baseline"
            | "blocked_destination_risk"
            | "challenge_opened"
            | "challenge_resolved"
            | "external_handoff_verified"
            | "external_handoff_failed"
            | "duplicate_identity_blocked"
            | "appeal_requested"
            | "appeal_denied"
            | "appeal_upheld";
          reconciliation_source?:
            | "external_receipt"
            | "fiscal_host_webhook"
            | "sponsor_signed_intent"
            | "every_org_partner_webhook";
          source_event_ref?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          status?: "pending_review" | "verified" | "rejected" | "superseded";
          reason_code?:
            | "destination_verified"
            | "needs_destination_evidence"
            | "needs_identity_evidence"
            | "blocked_threat_baseline"
            | "blocked_destination_risk"
            | "challenge_opened"
            | "challenge_resolved"
            | "external_handoff_verified"
            | "external_handoff_failed"
            | "duplicate_identity_blocked"
            | "appeal_requested"
            | "appeal_denied"
            | "appeal_upheld";
          verified_at?: string | null;
        };
        Relationships: [];
      };
      mpgf_moral_profiles: {
        Row: {
          profile_id: string;
          primary_causes: string[];
          secondary_common_ground_causes: string[];
          privacy_stage: "private" | "aggregate_only" | "public_opt_in";
          no_global_moral_ranking: true;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          primary_causes?: string[];
          secondary_common_ground_causes?: string[];
          privacy_stage?: "private" | "aggregate_only" | "public_opt_in";
          no_global_moral_ranking?: true;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          primary_causes?: string[];
          secondary_common_ground_causes?: string[];
          privacy_stage?: "private" | "aggregate_only" | "public_opt_in";
          no_global_moral_ranking?: true;
          updated_at?: string;
        };
        Relationships: [];
      };
      mpgf_support_signals: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          profile_id: string | null;
          user_ref_hash: string;
          moral_cluster_hash: string;
          signal_type: "strong_support" | "weak_common_ground_support" | "dissent_review_requested";
          strength_bps: number;
          private_by_default: true;
          counts_for_common_ground: boolean;
          no_global_moral_ranking: true;
          calc_hash: string;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          profile_id?: string | null;
          user_ref_hash: string;
          moral_cluster_hash: string;
          signal_type: "strong_support" | "weak_common_ground_support" | "dissent_review_requested";
          strength_bps: number;
          private_by_default?: true;
          counts_for_common_ground?: boolean;
          no_global_moral_ranking?: true;
          calc_hash: string;
          created_at?: string;
        };
        Update: {
          profile_id?: string | null;
          strength_bps?: number;
          counts_for_common_ground?: boolean;
          no_global_moral_ranking?: true;
        };
        Relationships: [];
      };
      mpgf_conditional_pledges: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          profile_id: string | null;
          amount_cents: number;
          counted_cap_cents: number;
          acceptable_counterpart_buckets: string[];
          minimum_counterparty_cleared_cents: number;
          max_exposure_cents: number;
          visibility: "private_amount" | "public_supporter" | "public_reason";
          payment_mode: "every_org_fast_route" | "stripe_setup_intent_saved_commitment" | "manual_proof_fallback";
          status:
            | "signal_only"
            | "pledge_saved"
            | "pending_verification"
            | "threshold_cleared"
            | "counted"
            | "voided"
            | "expired";
          deadline_at: string;
          capture_policy: "capture_only_after_threshold_review_and_challenge_window";
          failure_path_disclosure: Json;
          cross_view_clearance_policy: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          profile_id?: string | null;
          amount_cents: number;
          counted_cap_cents: number;
          acceptable_counterpart_buckets?: string[];
          minimum_counterparty_cleared_cents?: number;
          max_exposure_cents?: number;
          visibility?: "private_amount" | "public_supporter" | "public_reason";
          payment_mode: "every_org_fast_route" | "stripe_setup_intent_saved_commitment" | "manual_proof_fallback";
          status?:
            | "signal_only"
            | "pledge_saved"
            | "pending_verification"
            | "threshold_cleared"
            | "counted"
            | "voided"
            | "expired";
          deadline_at: string;
          capture_policy?: "capture_only_after_threshold_review_and_challenge_window";
          failure_path_disclosure?: Json;
          cross_view_clearance_policy?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          counted_cap_cents?: number;
          visibility?: "private_amount" | "public_supporter" | "public_reason";
          status?:
            | "signal_only"
            | "pledge_saved"
            | "pending_verification"
            | "threshold_cleared"
            | "counted"
            | "voided"
            | "expired";
          updated_at?: string;
        };
        Relationships: [];
      };
      mpgf_every_org_partner_events: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string | null;
          conditional_pledge_id: string | null;
          pledge_intent_id: string | null;
          contributor_ref_hash: string | null;
          partner_donation_id_hash: string | null;
          charge_id_hash: string;
          nonprofit_ref_hash: string | null;
          amount_cents: number;
          net_amount_cents: number | null;
          currency: string;
          frequency: string | null;
          donation_date: string | null;
          status: "recorded" | "needs_review" | "rejected";
          structure_verified: boolean;
          webhook_verified: boolean;
          auto_creates_contribution_evidence: boolean;
          evidence_review_state: "pending_review" | "needs_review" | "rejected";
          review_required_before_counting: true;
          final_payout_authorized: false;
          payload_hash: string;
          append_only_hash: string;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id?: string | null;
          conditional_pledge_id?: string | null;
          pledge_intent_id?: string | null;
          contributor_ref_hash?: string | null;
          partner_donation_id_hash?: string | null;
          charge_id_hash: string;
          nonprofit_ref_hash?: string | null;
          amount_cents: number;
          net_amount_cents?: number | null;
          currency?: string;
          frequency?: string | null;
          donation_date?: string | null;
          status: "recorded" | "needs_review" | "rejected";
          structure_verified?: boolean;
          webhook_verified?: boolean;
          auto_creates_contribution_evidence?: boolean;
          evidence_review_state: "pending_review" | "needs_review" | "rejected";
          review_required_before_counting?: true;
          final_payout_authorized?: false;
          payload_hash: string;
          append_only_hash: string;
          received_at?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      mpgf_payment_method_tokens: {
        Row: {
          id: string;
          profile_id: string | null;
          provider: "stripe";
          provider_customer_id_hash: string;
          provider_payment_method_id_hash: string;
          setup_status: "setup_intent_created" | "setup_succeeded" | "setup_failed" | "revoked";
          future_use_consent_at: string | null;
          raw_card_data_stored: false;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          profile_id?: string | null;
          provider: "stripe";
          provider_customer_id_hash: string;
          provider_payment_method_id_hash: string;
          setup_status: "setup_intent_created" | "setup_succeeded" | "setup_failed" | "revoked";
          future_use_consent_at?: string | null;
          raw_card_data_stored?: false;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setup_status?: "setup_intent_created" | "setup_succeeded" | "setup_failed" | "revoked";
          future_use_consent_at?: string | null;
          raw_card_data_stored?: false;
          updated_at?: string;
        };
        Relationships: [];
      };
      mpgf_payment_events: {
        Row: {
          id: string;
          conditional_pledge_id: string | null;
          provider: "stripe" | "every_org" | "fiscal_host" | "manual_evidence";
          provider_event_id_hash: string;
          provider_status: string;
          amount_cents: number;
          signature_verified: boolean;
          payload_hash: string | null;
          verified_at: string | null;
          final_payout_authorized: false;
          append_only_hash: string;
          created_at: string;
        };
        Insert: {
          id: string;
          conditional_pledge_id?: string | null;
          provider: "stripe" | "every_org" | "fiscal_host" | "manual_evidence";
          provider_event_id_hash: string;
          provider_status: string;
          amount_cents: number;
          signature_verified?: boolean;
          payload_hash?: string | null;
          verified_at?: string | null;
          final_payout_authorized?: false;
          append_only_hash: string;
          created_at?: string;
        };
        Update: {
          provider_status?: string;
          signature_verified?: boolean;
          verified_at?: string | null;
          final_payout_authorized?: false;
        };
        Relationships: [];
      };
      mpgf_stripe_saved_commitments: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          conditional_pledge_id: string | null;
          pledge_intent_id: string | null;
          profile_id: string | null;
          user_ref_hash: string;
          amount_cents: number;
          currency: "usd";
          provider_customer_id_hash: string | null;
          provider_setup_intent_id_hash: string | null;
          provider_payment_method_id_hash: string | null;
          setup_status: "setup_intent_created" | "setup_succeeded" | "setup_failed" | "revoked";
          setup_usage: "off_session";
          future_use_consent_at: string | null;
          explicit_future_use_consent_required: true;
          creates_charge_immediately: false;
          long_lived_manual_card_hold: false;
          payment_intent_created_before_gates: false;
          raw_card_data_stored: false;
          review_required_before_counting: true;
          final_payout_authorized: false;
          calc_hash: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          conditional_pledge_id?: string | null;
          pledge_intent_id?: string | null;
          profile_id?: string | null;
          user_ref_hash: string;
          amount_cents: number;
          currency?: "usd";
          provider_customer_id_hash?: string | null;
          provider_setup_intent_id_hash?: string | null;
          provider_payment_method_id_hash?: string | null;
          setup_status?: "setup_intent_created" | "setup_succeeded" | "setup_failed" | "revoked";
          setup_usage?: "off_session";
          future_use_consent_at?: string | null;
          explicit_future_use_consent_required?: true;
          creates_charge_immediately?: false;
          long_lived_manual_card_hold?: false;
          payment_intent_created_before_gates?: false;
          raw_card_data_stored?: false;
          review_required_before_counting?: true;
          final_payout_authorized?: false;
          calc_hash: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          setup_status?: "setup_intent_created" | "setup_succeeded" | "setup_failed" | "revoked";
          future_use_consent_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      mpgf_stripe_saved_commitment_events: {
        Row: {
          id: string;
          saved_commitment_id: string | null;
          conditional_pledge_id: string | null;
          pledge_intent_id: string | null;
          provider_event_id_hash: string;
          provider_object_id_hash: string | null;
          provider_customer_id_hash: string | null;
          provider_payment_method_id_hash: string | null;
          event_type:
            | "setup_intent.created"
            | "setup_intent.succeeded"
            | "setup_intent.setup_failed"
            | "setup_intent.canceled"
            | "payment_intent.created"
            | "payment_intent.succeeded"
            | "payment_intent.payment_failed"
            | "payment_intent.canceled"
            | "payment_intent.requires_action";
          event_state: string;
          status: "recorded" | "needs_review" | "rejected";
          signature_verified: boolean;
          structure_verified: boolean;
          payload_hash: string;
          append_only_hash: string;
          review_required_before_counting: true;
          final_payout_authorized: false;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          saved_commitment_id?: string | null;
          conditional_pledge_id?: string | null;
          pledge_intent_id?: string | null;
          provider_event_id_hash: string;
          provider_object_id_hash?: string | null;
          provider_customer_id_hash?: string | null;
          provider_payment_method_id_hash?: string | null;
          event_type:
            | "setup_intent.created"
            | "setup_intent.succeeded"
            | "setup_intent.setup_failed"
            | "setup_intent.canceled"
            | "payment_intent.created"
            | "payment_intent.succeeded"
            | "payment_intent.payment_failed"
            | "payment_intent.canceled"
            | "payment_intent.requires_action";
          event_state: string;
          status: "recorded" | "needs_review" | "rejected";
          signature_verified?: boolean;
          structure_verified?: boolean;
          payload_hash: string;
          append_only_hash: string;
          review_required_before_counting?: true;
          final_payout_authorized?: false;
          received_at?: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      mpgf_stripe_conditional_payment_intent_runs: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          conditional_pledge_id: string | null;
          pledge_intent_id: string | null;
          provider_customer_id_hash: string;
          provider_payment_method_id_hash: string;
          provider_setup_intent_id_hash: string;
          amount_cents: number;
          currency: "usd";
          gate_state: Json;
          blocked_by: string[];
          payment_intent_creation_allowed: boolean;
          setup_intent_first: true;
          confirm_off_session: true;
          capture_method: "automatic";
          long_lived_manual_card_hold: false;
          requires_stripe_signature_webhook_before_counting: true;
          review_required_before_counting: true;
          final_payout_authorized: false;
          idempotency_key_hash: string;
          calc_hash: string;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          conditional_pledge_id?: string | null;
          pledge_intent_id?: string | null;
          provider_customer_id_hash: string;
          provider_payment_method_id_hash: string;
          provider_setup_intent_id_hash: string;
          amount_cents: number;
          currency?: "usd";
          gate_state: Json;
          blocked_by?: string[];
          payment_intent_creation_allowed: boolean;
          setup_intent_first?: true;
          confirm_off_session?: true;
          capture_method?: "automatic";
          long_lived_manual_card_hold?: false;
          requires_stripe_signature_webhook_before_counting?: true;
          review_required_before_counting?: true;
          final_payout_authorized?: false;
          idempotency_key_hash: string;
          calc_hash: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      mpgf_sponsor_pool_entries: {
        Row: {
          id: string;
          round_id: string | null;
          sponsor_pool_id: string;
          source_type:
            | "direct_sponsor_deposit"
            | "recurring_member_tithe"
            | "donation_offset_surplus"
            | "trade_surplus_tithe";
          amount_cents: number;
          restricted_or_unrestricted: "restricted_to_round" | "unrestricted_future_rounds";
          provenance_hash: string;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id?: string | null;
          sponsor_pool_id: string;
          source_type:
            | "direct_sponsor_deposit"
            | "recurring_member_tithe"
            | "donation_offset_surplus"
            | "trade_surplus_tithe";
          amount_cents: number;
          restricted_or_unrestricted: "restricted_to_round" | "unrestricted_future_rounds";
          provenance_hash: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      mpgf_allocation_results: {
        Row: {
          id: string;
          round_id: string;
          campaign_id: string;
          eligible_direct_cents: number;
          base_match_cents: number;
          q_signal_cents: number;
          bonus_match_cents: number;
          final_allocated_cents: number;
          formula_version: "cg_vqaf_capital_constrained_qf_v1";
          lambda: number;
          calculation_hash: string;
          no_global_moral_ranking: true;
          created_at: string;
        };
        Insert: {
          id: string;
          round_id: string;
          campaign_id: string;
          eligible_direct_cents: number;
          base_match_cents: number;
          q_signal_cents: number;
          bonus_match_cents: number;
          final_allocated_cents: number;
          formula_version: "cg_vqaf_capital_constrained_qf_v1";
          lambda: number;
          calculation_hash: string;
          no_global_moral_ranking?: true;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      mpgf_dissent_notes: {
        Row: {
          id: string;
          campaign_id: string;
          filed_by_profile_id: string | null;
          filer_ref_hash: string;
          reason_code:
            | "externality_review"
            | "threat_baseline_review"
            | "destination_review"
            | "collusion_review"
            | "other_reviewable_claim";
          public_summary: string;
          status: "opened" | "under_review" | "resolved" | "dismissed";
          pauses_unreleased_milestones: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          campaign_id: string;
          filed_by_profile_id?: string | null;
          filer_ref_hash: string;
          reason_code:
            | "externality_review"
            | "threat_baseline_review"
            | "destination_review"
            | "collusion_review"
            | "other_reviewable_claim";
          public_summary: string;
          status?: "opened" | "under_review" | "resolved" | "dismissed";
          pauses_unreleased_milestones?: boolean;
          created_at?: string;
        };
        Update: {
          status?: "opened" | "under_review" | "resolved" | "dismissed";
          pauses_unreleased_milestones?: boolean;
        };
        Relationships: [];
      };
      mpgf_milestones: {
        Row: {
          id: string;
          campaign_id: string;
          percent_release: number;
          evidence_requirements: Json;
          release_status: "pending" | "partner_release_pending" | "released" | "paused" | "voided";
          created_at: string;
        };
        Insert: {
          id: string;
          campaign_id: string;
          percent_release: number;
          evidence_requirements?: Json;
          release_status?: "pending" | "partner_release_pending" | "released" | "paused" | "voided";
          created_at?: string;
        };
        Update: {
          evidence_requirements?: Json;
          release_status?: "pending" | "partner_release_pending" | "released" | "paused" | "voided";
        };
        Relationships: [];
      };
      moral_trade_policy_snapshots: {
        Row: {
          id: string;
          subject_kind:
            | "release_gate"
            | "state_interpretation"
            | "payment_capture"
            | "payout_release"
            | "refund_cancellation"
            | "provider_source_authentication"
            | "time_authority"
            | "notification"
            | "fx"
            | "platform_fee"
            | "public_metrics"
            | "data_retention"
            | "participant_eligibility"
            | "recipient_destination_verification"
            | "account_security"
            | "reviewer_quality"
            | "anti_enumeration"
            | "privacy_disclosure"
            | "impact_claim_methodology"
            | "matching_clearing"
            | "matched_trade_lock"
            | "baseline_integrity"
            | "baseline_manufacturing"
            | "agreement_amendment"
            | "appeal_case"
            | "backup_recovery"
            | "deployment_release"
            | "configuration_snapshot"
            | "schema_migration"
            | "environment_data_isolation"
            | "financial_reconciliation"
            | "audit_integrity"
            | "data_security"
            | "challenge_window"
            | "payout_milestone"
            | "approved_trade_template"
            | "template_parameter"
            | "review_capacity"
            | "review_queue_admission"
            | "participant_term_sheet"
            | "counterparty_blinding"
            | "staged_counterparty_disclosure"
            | "recipient_acceptance"
            | "adverse_association"
            | "ai_preference_elicitation"
            | "post_clear_audit"
            | "non_public_goods_subsidy"
            | "subsidy_schedule"
            | "cause_bucket_taxonomy"
            | "resource_compatibility"
            | "net_offset_accounting"
            | "offer_validity"
            | "private_exchange_rate_quote"
            | "noncompensable_blocker"
            | "batch_clearing_objective"
            | "sensitive_evidence_attestation"
            | "pilot_evidence"
            | "baseline_witness_testimony"
            | "witness_identity_assurance"
            | "witness_additionality_adjustment"
            | "direct_pair_clearing";
          subject_key: string;
          version_label: string;
          status: "draft" | "approved" | "immutable" | "superseded" | "revoked";
          snapshot_hash: string;
          snapshot_payload: Json;
          approved_by: string | null;
          approved_at: string | null;
          immutable_after: string | null;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_kind:
            | "release_gate"
            | "state_interpretation"
            | "payment_capture"
            | "payout_release"
            | "refund_cancellation"
            | "provider_source_authentication"
            | "time_authority"
            | "notification"
            | "fx"
            | "platform_fee"
            | "public_metrics"
            | "data_retention"
            | "participant_eligibility"
            | "recipient_destination_verification"
            | "account_security"
            | "reviewer_quality"
            | "anti_enumeration"
            | "privacy_disclosure"
            | "impact_claim_methodology"
            | "matching_clearing"
            | "matched_trade_lock"
            | "baseline_integrity"
            | "baseline_manufacturing"
            | "agreement_amendment"
            | "appeal_case"
            | "backup_recovery"
            | "deployment_release"
            | "configuration_snapshot"
            | "schema_migration"
            | "environment_data_isolation"
            | "financial_reconciliation"
            | "audit_integrity"
            | "data_security"
            | "challenge_window"
            | "payout_milestone"
            | "approved_trade_template"
            | "template_parameter"
            | "review_capacity"
            | "review_queue_admission"
            | "participant_term_sheet"
            | "counterparty_blinding"
            | "staged_counterparty_disclosure"
            | "recipient_acceptance"
            | "adverse_association"
            | "ai_preference_elicitation"
            | "post_clear_audit"
            | "non_public_goods_subsidy"
            | "subsidy_schedule"
            | "cause_bucket_taxonomy"
            | "resource_compatibility"
            | "net_offset_accounting"
            | "offer_validity"
            | "private_exchange_rate_quote"
            | "noncompensable_blocker"
            | "batch_clearing_objective"
            | "sensitive_evidence_attestation"
            | "pilot_evidence"
            | "baseline_witness_testimony"
            | "witness_identity_assurance"
            | "witness_additionality_adjustment"
            | "direct_pair_clearing";
          subject_key: string;
          version_label: string;
          status?: "draft" | "approved" | "immutable" | "superseded" | "revoked";
          snapshot_hash: string;
          snapshot_payload?: Json;
          approved_by?: string | null;
          approved_at?: string | null;
          immutable_after?: string | null;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          subject_kind?:
            | "release_gate"
            | "state_interpretation"
            | "payment_capture"
            | "payout_release"
            | "refund_cancellation"
            | "provider_source_authentication"
            | "time_authority"
            | "notification"
            | "fx"
            | "platform_fee"
            | "public_metrics"
            | "data_retention"
            | "participant_eligibility"
            | "recipient_destination_verification"
            | "account_security"
            | "reviewer_quality"
            | "anti_enumeration"
            | "privacy_disclosure"
            | "impact_claim_methodology"
            | "matching_clearing"
            | "matched_trade_lock"
            | "baseline_integrity"
            | "baseline_manufacturing"
            | "agreement_amendment"
            | "appeal_case"
            | "backup_recovery"
            | "deployment_release"
            | "configuration_snapshot"
            | "schema_migration"
            | "environment_data_isolation"
            | "financial_reconciliation"
            | "audit_integrity"
            | "data_security"
            | "challenge_window"
            | "payout_milestone"
            | "approved_trade_template"
            | "template_parameter"
            | "review_capacity"
            | "review_queue_admission"
            | "participant_term_sheet"
            | "counterparty_blinding"
            | "staged_counterparty_disclosure"
            | "recipient_acceptance"
            | "adverse_association"
            | "ai_preference_elicitation"
            | "post_clear_audit"
            | "non_public_goods_subsidy"
            | "subsidy_schedule"
            | "cause_bucket_taxonomy"
            | "resource_compatibility"
            | "net_offset_accounting"
            | "offer_validity"
            | "private_exchange_rate_quote"
            | "noncompensable_blocker"
            | "batch_clearing_objective"
            | "sensitive_evidence_attestation"
            | "pilot_evidence"
            | "baseline_witness_testimony"
            | "witness_identity_assurance"
            | "witness_additionality_adjustment"
            | "direct_pair_clearing";
          subject_key?: string;
          version_label?: string;
          status?: "draft" | "approved" | "immutable" | "superseded" | "revoked";
          snapshot_hash?: string;
          snapshot_payload?: Json;
          approved_by?: string | null;
          approved_at?: string | null;
          immutable_after?: string | null;
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      guest_witness_identities: {
        Row: {
          id: string;
          primary_email_hash: string | null;
          phone_hash: string | null;
          converted_user_id: string | null;
          witness_status: "active" | "restricted" | "blocked" | "deleted";
          witness_credibility_decimal: number | null;
          witness_credibility_confidence_decimal: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          primary_email_hash?: string | null;
          phone_hash?: string | null;
          converted_user_id?: string | null;
          witness_status?: "active" | "restricted" | "blocked" | "deleted";
          witness_credibility_decimal?: number | null;
          witness_credibility_confidence_decimal?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          primary_email_hash?: string | null;
          phone_hash?: string | null;
          converted_user_id?: string | null;
          witness_status?: "active" | "restricted" | "blocked" | "deleted";
          witness_credibility_decimal?: number | null;
          witness_credibility_confidence_decimal?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      external_witness_accounts: {
        Row: {
          id: string;
          guest_witness_identity_id: string;
          provider: "x" | "facebook" | "instagram" | "google" | "apple" | "email_magic_link" | "manual_review";
          provider_account_id_hash: string;
          provider_account_display_snapshot: string | null;
          provider_profile_url_snapshot: string | null;
          provider_verified_at: string;
          oauth_scope_snapshot_json: Json | null;
          token_storage_policy: "no_token" | "short_lived_token" | "long_lived_token_ref" | "manual";
          token_ref: string | null;
          token_expires_at: string | null;
          account_status: "connected" | "expired" | "revoked" | "failed" | "blocked";
          privacy_notice_version: string;
          terms_acceptance_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          guest_witness_identity_id: string;
          provider: "x" | "facebook" | "instagram" | "google" | "apple" | "email_magic_link" | "manual_review";
          provider_account_id_hash: string;
          provider_account_display_snapshot?: string | null;
          provider_profile_url_snapshot?: string | null;
          provider_verified_at: string;
          oauth_scope_snapshot_json?: Json | null;
          token_storage_policy?: "no_token" | "short_lived_token" | "long_lived_token_ref" | "manual";
          token_ref?: string | null;
          token_expires_at?: string | null;
          account_status?: "connected" | "expired" | "revoked" | "failed" | "blocked";
          privacy_notice_version: string;
          terms_acceptance_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          provider_account_display_snapshot?: string | null;
          provider_profile_url_snapshot?: string | null;
          provider_verified_at?: string;
          oauth_scope_snapshot_json?: Json | null;
          token_storage_policy?: "no_token" | "short_lived_token" | "long_lived_token_ref" | "manual";
          token_ref?: string | null;
          token_expires_at?: string | null;
          account_status?: "connected" | "expired" | "revoked" | "failed" | "blocked";
          privacy_notice_version?: string;
          terms_acceptance_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      baseline_witness_invites: {
        Row: {
          id: string;
          participant_user_id: string;
          pledge_swap_id: string | null;
          purchase_envelope_type: string | null;
          purchase_envelope_id: string | null;
          participant_action_commitment_id: string | null;
          invited_email_hash: string | null;
          invited_phone_hash: string | null;
          invite_token_hash: string;
          invite_status: "pending" | "opened" | "submitted" | "declined" | "expired" | "revoked" | "reported" | "blocked";
          participant_claimed_relationship: "friend" | "family" | "roommate" | "romantic_partner" | "classmate" | "coworker" | "dining_companion" | "other" | null;
          action_template_id: string;
          action_window_start_at: string;
          action_window_end_at: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_user_id: string;
          pledge_swap_id?: string | null;
          purchase_envelope_type?: string | null;
          purchase_envelope_id?: string | null;
          participant_action_commitment_id?: string | null;
          invited_email_hash?: string | null;
          invited_phone_hash?: string | null;
          invite_token_hash: string;
          invite_status?: "pending" | "opened" | "submitted" | "declined" | "expired" | "revoked" | "reported" | "blocked";
          participant_claimed_relationship?: "friend" | "family" | "roommate" | "romantic_partner" | "classmate" | "coworker" | "dining_companion" | "other" | null;
          action_template_id: string;
          action_window_start_at: string;
          action_window_end_at: string;
          expires_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          pledge_swap_id?: string | null;
          purchase_envelope_type?: string | null;
          purchase_envelope_id?: string | null;
          participant_action_commitment_id?: string | null;
          invite_status?: "pending" | "opened" | "submitted" | "declined" | "expired" | "revoked" | "reported" | "blocked";
          participant_claimed_relationship?: "friend" | "family" | "roommate" | "romantic_partner" | "classmate" | "coworker" | "dining_companion" | "other" | null;
          action_template_id?: string;
          action_window_start_at?: string;
          action_window_end_at?: string;
          expires_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      baseline_witness_testimonials: {
        Row: {
          id: string;
          invite_id: string;
          guest_witness_identity_id: string;
          external_witness_account_id: string | null;
          participant_user_id: string;
          pledge_swap_id: string | null;
          purchase_envelope_type: string | null;
          purchase_envelope_id: string | null;
          participant_action_commitment_id: string | null;
          relationship_type: "friend" | "family" | "roommate" | "romantic_partner" | "classmate" | "coworker" | "dining_companion" | "other";
          baseline_knowledge_level: "none" | "low" | "moderate" | "high";
          recent_meal_observation_frequency: "never" | "once" | "few_times" | "weekly" | "daily" | "lived_together";
          baseline_counterfactual_credence_decimal: number;
          basis_json: Json;
          uncertainty_notes_private: string | null;
          concern_flag: "none" | "possible_baseline_overstatement" | "possible_pressure" | "possible_side_payment" | "insufficient_knowledge" | "other";
          concern_notes_private: string | null;
          testimonial_status: "submitted" | "under_review" | "accepted" | "partially_accepted" | "rejected" | "disputed" | "blocked";
          reviewer_user_id: string | null;
          participant_visible_summary: string | null;
          private_reviewer_notes_ref: string | null;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invite_id: string;
          guest_witness_identity_id: string;
          external_witness_account_id?: string | null;
          participant_user_id: string;
          pledge_swap_id?: string | null;
          purchase_envelope_type?: string | null;
          purchase_envelope_id?: string | null;
          participant_action_commitment_id?: string | null;
          relationship_type: "friend" | "family" | "roommate" | "romantic_partner" | "classmate" | "coworker" | "dining_companion" | "other";
          baseline_knowledge_level: "none" | "low" | "moderate" | "high";
          recent_meal_observation_frequency: "never" | "once" | "few_times" | "weekly" | "daily" | "lived_together";
          baseline_counterfactual_credence_decimal: number;
          basis_json?: Json;
          uncertainty_notes_private?: string | null;
          concern_flag?: "none" | "possible_baseline_overstatement" | "possible_pressure" | "possible_side_payment" | "insufficient_knowledge" | "other";
          concern_notes_private?: string | null;
          testimonial_status?: "submitted" | "under_review" | "accepted" | "partially_accepted" | "rejected" | "disputed" | "blocked";
          reviewer_user_id?: string | null;
          participant_visible_summary?: string | null;
          private_reviewer_notes_ref?: string | null;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          external_witness_account_id?: string | null;
          relationship_type?: "friend" | "family" | "roommate" | "romantic_partner" | "classmate" | "coworker" | "dining_companion" | "other";
          baseline_knowledge_level?: "none" | "low" | "moderate" | "high";
          recent_meal_observation_frequency?: "never" | "once" | "few_times" | "weekly" | "daily" | "lived_together";
          baseline_counterfactual_credence_decimal?: number;
          basis_json?: Json;
          uncertainty_notes_private?: string | null;
          concern_flag?: "none" | "possible_baseline_overstatement" | "possible_pressure" | "possible_side_payment" | "insufficient_knowledge" | "other";
          concern_notes_private?: string | null;
          testimonial_status?: "submitted" | "under_review" | "accepted" | "partially_accepted" | "rejected" | "disputed" | "blocked";
          reviewer_user_id?: string | null;
          participant_visible_summary?: string | null;
          private_reviewer_notes_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      baseline_witness_quality_assessments: {
        Row: {
          id: string;
          baseline_witness_testimonial_id: string;
          guest_witness_identity_id: string;
          participant_user_id: string;
          identity_assurance_level: "email_only" | "social_verified" | "prior_user" | "manual_verified" | "weak";
          relationship_weight_decimal: number;
          knowledge_basis_score_decimal: number;
          specificity_score_decimal: number;
          independence_score_decimal: number;
          consistency_score_decimal: number;
          collusion_risk_score_decimal: number;
          baseline_probative_value_score_decimal: number;
          accepted_for_additionality: boolean;
          accepted_for_credibility_update: boolean;
          proposed_additionality_adjustment_decimal: number | null;
          review_status: "pending" | "accepted" | "rejected" | "needs_more_info" | "disputed";
          reviewer_id: string | null;
          private_notes_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baseline_witness_testimonial_id: string;
          guest_witness_identity_id: string;
          participant_user_id: string;
          identity_assurance_level: "email_only" | "social_verified" | "prior_user" | "manual_verified" | "weak";
          relationship_weight_decimal: number;
          knowledge_basis_score_decimal: number;
          specificity_score_decimal: number;
          independence_score_decimal: number;
          consistency_score_decimal: number;
          collusion_risk_score_decimal: number;
          baseline_probative_value_score_decimal: number;
          accepted_for_additionality?: boolean;
          accepted_for_credibility_update?: boolean;
          proposed_additionality_adjustment_decimal?: number | null;
          review_status?: "pending" | "accepted" | "rejected" | "needs_more_info" | "disputed";
          reviewer_id?: string | null;
          private_notes_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          identity_assurance_level?: "email_only" | "social_verified" | "prior_user" | "manual_verified" | "weak";
          relationship_weight_decimal?: number;
          knowledge_basis_score_decimal?: number;
          specificity_score_decimal?: number;
          independence_score_decimal?: number;
          consistency_score_decimal?: number;
          collusion_risk_score_decimal?: number;
          baseline_probative_value_score_decimal?: number;
          accepted_for_additionality?: boolean;
          accepted_for_credibility_update?: boolean;
          proposed_additionality_adjustment_decimal?: number | null;
          review_status?: "pending" | "accepted" | "rejected" | "needs_more_info" | "disputed";
          reviewer_id?: string | null;
          private_notes_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      baseline_witness_audit_events: {
        Row: {
          id: string;
          invite_id: string | null;
          baseline_witness_testimonial_id: string | null;
          baseline_witness_quality_assessment_id: string | null;
          event_type: "invite_created" | "invite_opened" | "magic_link_verified" | "testimonial_submitted" | "witness_declined" | "pressure_reported" | "quality_assessed" | "review_decision" | "policy_effect_applied" | "unlink_requested" | "deletion_requested";
          actor_kind: "participant" | "witness" | "reviewer" | "system";
          actor_id_hash: string | null;
          redacted_summary: string;
          event_payload_redacted: Json;
          private_ref_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          invite_id?: string | null;
          baseline_witness_testimonial_id?: string | null;
          baseline_witness_quality_assessment_id?: string | null;
          event_type: "invite_created" | "invite_opened" | "magic_link_verified" | "testimonial_submitted" | "witness_declined" | "pressure_reported" | "quality_assessed" | "review_decision" | "policy_effect_applied" | "unlink_requested" | "deletion_requested";
          actor_kind: "participant" | "witness" | "reviewer" | "system";
          actor_id_hash?: string | null;
          redacted_summary: string;
          event_payload_redacted?: Json;
          private_ref_hash?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      baseline_witness_risk_reports: {
        Row: {
          id: string;
          invite_id: string | null;
          baseline_witness_testimonial_id: string | null;
          participant_user_id: string | null;
          guest_witness_identity_id: string | null;
          report_kind: "pressure_or_coercion" | "possible_side_payment" | "testimonial_ring" | "duplicate_witness" | "other";
          review_status: "open" | "under_review" | "resolved" | "dismissed" | "escalated";
          redacted_summary: string;
          private_report_ref_hash: string | null;
          routed_to: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          invite_id?: string | null;
          baseline_witness_testimonial_id?: string | null;
          participant_user_id?: string | null;
          guest_witness_identity_id?: string | null;
          report_kind: "pressure_or_coercion" | "possible_side_payment" | "testimonial_ring" | "duplicate_witness" | "other";
          review_status?: "open" | "under_review" | "resolved" | "dismissed" | "escalated";
          redacted_summary: string;
          private_report_ref_hash?: string | null;
          routed_to?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          review_status?: "open" | "under_review" | "resolved" | "dismissed" | "escalated";
          redacted_summary?: string;
          routed_to?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_state_interpretation_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          state_family: string;
          missing_state_behavior: "block" | "not_required_for_stage";
          unknown_state_behavior: "block" | "not_required_for_stage";
          stale_state_behavior: "block" | "not_required_for_stage";
          under_review_state_behavior: "block" | "not_required_for_stage";
          unmapped_state_behavior: "block" | "not_required_for_stage";
          superseded_state_behavior: "block" | "not_required_for_stage";
          created_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          state_family: string;
          missing_state_behavior?: "block" | "not_required_for_stage";
          unknown_state_behavior?: "block" | "not_required_for_stage";
          stale_state_behavior?: "block" | "not_required_for_stage";
          under_review_state_behavior?: "block" | "not_required_for_stage";
          unmapped_state_behavior?: "block" | "not_required_for_stage";
          superseded_state_behavior?: "block" | "not_required_for_stage";
          created_at?: string;
        };
        Update: {
          policy_snapshot_id?: string;
          state_family?: string;
          missing_state_behavior?: "block" | "not_required_for_stage";
          unknown_state_behavior?: "block" | "not_required_for_stage";
          stale_state_behavior?: "block" | "not_required_for_stage";
          under_review_state_behavior?: "block" | "not_required_for_stage";
          unmapped_state_behavior?: "block" | "not_required_for_stage";
          superseded_state_behavior?: "block" | "not_required_for_stage";
        };
        Relationships: [];
      };
      moral_trade_privileged_action_records: {
        Row: {
          id: string;
          subject_kind:
            | "release_gate"
            | "policy_snapshot"
            | "recipient_destination"
            | "privacy_grant"
            | "impact_claim"
            | "blocker_override"
            | "manual_capture"
            | "manual_payout_release"
            | "emergency_unpause"
            | "refund_cancellation";
          subject_id: string | null;
          action_key:
            | "release_gate_approval"
            | "policy_snapshot_approval"
            | "recipient_destination_verification"
            | "private_data_access_grant"
            | "impact_claim_publication"
            | "blocker_override"
            | "manual_capture"
            | "manual_payout_release"
            | "emergency_unpause"
            | "nonroutine_refund_cancellation";
          status: "requested" | "approved" | "blocked" | "expired" | "superseded";
          requested_by: string | null;
          first_approver_id: string | null;
          second_approver_id: string | null;
          neutral_reviewer_id: string | null;
          reason_codes: string[];
          emergency_pause_allowed: boolean;
          decided_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_kind:
            | "release_gate"
            | "policy_snapshot"
            | "recipient_destination"
            | "privacy_grant"
            | "impact_claim"
            | "blocker_override"
            | "manual_capture"
            | "manual_payout_release"
            | "emergency_unpause"
            | "refund_cancellation";
          subject_id?: string | null;
          action_key:
            | "release_gate_approval"
            | "policy_snapshot_approval"
            | "recipient_destination_verification"
            | "private_data_access_grant"
            | "impact_claim_publication"
            | "blocker_override"
            | "manual_capture"
            | "manual_payout_release"
            | "emergency_unpause"
            | "nonroutine_refund_cancellation";
          status?: "requested" | "approved" | "blocked" | "expired" | "superseded";
          requested_by?: string | null;
          first_approver_id?: string | null;
          second_approver_id?: string | null;
          neutral_reviewer_id?: string | null;
          reason_codes?: string[];
          emergency_pause_allowed?: boolean;
          decided_at?: string | null;
          created_at?: string;
        };
        Update: {
          subject_kind?:
            | "release_gate"
            | "policy_snapshot"
            | "recipient_destination"
            | "privacy_grant"
            | "impact_claim"
            | "blocker_override"
            | "manual_capture"
            | "manual_payout_release"
            | "emergency_unpause"
            | "refund_cancellation";
          subject_id?: string | null;
          action_key?:
            | "release_gate_approval"
            | "policy_snapshot_approval"
            | "recipient_destination_verification"
            | "private_data_access_grant"
            | "impact_claim_publication"
            | "blocker_override"
            | "manual_capture"
            | "manual_payout_release"
            | "emergency_unpause"
            | "nonroutine_refund_cancellation";
          status?: "requested" | "approved" | "blocked" | "expired" | "superseded";
          requested_by?: string | null;
          first_approver_id?: string | null;
          second_approver_id?: string | null;
          neutral_reviewer_id?: string | null;
          reason_codes?: string[];
          emergency_pause_allowed?: boolean;
          decided_at?: string | null;
        };
        Relationships: [];
      };
      moral_trade_release_gates: {
        Row: {
          id: string;
          stage:
            | "public_goods_preview"
            | "donation_offset_payable"
            | "pledge_swap_reliance_manual_pilot"
            | "capped_real_money_release"
            | "public_metric_release";
          feature_flag_key: string;
          status: "draft" | "under_review" | "approved" | "blocked" | "paused" | "superseded";
          policy_snapshot_bundle_hash: string;
          state_interpretation_policy_snapshot_id: string;
          approval_action_record_id: string | null;
          emergency_paused: boolean;
          approved_by: string | null;
          approved_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          stage:
            | "public_goods_preview"
            | "donation_offset_payable"
            | "pledge_swap_reliance_manual_pilot"
            | "capped_real_money_release"
            | "public_metric_release";
          feature_flag_key: string;
          status?: "draft" | "under_review" | "approved" | "blocked" | "paused" | "superseded";
          policy_snapshot_bundle_hash: string;
          state_interpretation_policy_snapshot_id: string;
          approval_action_record_id?: string | null;
          emergency_paused?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stage?:
            | "public_goods_preview"
            | "donation_offset_payable"
            | "pledge_swap_reliance_manual_pilot"
            | "capped_real_money_release"
            | "public_metric_release";
          feature_flag_key?: string;
          status?: "draft" | "under_review" | "approved" | "blocked" | "paused" | "superseded";
          policy_snapshot_bundle_hash?: string;
          state_interpretation_policy_snapshot_id?: string;
          approval_action_record_id?: string | null;
          emergency_paused?: boolean;
          approved_by?: string | null;
          approved_at?: string | null;
          superseded_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_release_gate_requirement_results: {
        Row: {
          id: string;
          release_gate_id: string;
          requirement_key: string;
          status:
            | "passed"
            | "not_required_for_stage"
            | "waived_by_neutral_review"
            | "failed"
            | "missing"
            | "stale"
            | "unknown"
            | "under_review";
          evidence_ref: string;
          policy_snapshot_id: string | null;
          privileged_action_record_id: string | null;
          recorded_by: string | null;
          recorded_at: string;
          notes: string;
        };
        Insert: {
          id?: string;
          release_gate_id: string;
          requirement_key: string;
          status:
            | "passed"
            | "not_required_for_stage"
            | "waived_by_neutral_review"
            | "failed"
            | "missing"
            | "stale"
            | "unknown"
            | "under_review";
          evidence_ref?: string;
          policy_snapshot_id?: string | null;
          privileged_action_record_id?: string | null;
          recorded_by?: string | null;
          recorded_at?: string;
          notes?: string;
        };
        Update: {
          requirement_key?: string;
          status?:
            | "passed"
            | "not_required_for_stage"
            | "waived_by_neutral_review"
            | "failed"
            | "missing"
            | "stale"
            | "unknown"
            | "under_review";
          evidence_ref?: string;
          policy_snapshot_id?: string | null;
          privileged_action_record_id?: string | null;
          recorded_by?: string | null;
          recorded_at?: string;
          notes?: string;
        };
        Relationships: [];
      };
      moral_trade_release_gate_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_consent_quality_records: {
        Row: {
          id: string;
          participant_id: string;
          subject_type:
            | "common_ground_budget"
            | "marketplace_round"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement"
            | "agreement_amendment_record"
            | "project_set_change"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "exposure_increase";
          subject_id: string;
          choice_architecture_policy_snapshot_id: string | null;
          status: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          required_disclosures_shown: boolean;
          comprehension_check_status: "passed" | "not_required_for_stage" | "missing" | "failed";
          preselected_paid_commitment: boolean;
          countdown_pressure_present: boolean;
          misleading_default_routing_present: boolean;
          dark_pattern_review_notes: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          subject_type:
            | "common_ground_budget"
            | "marketplace_round"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement"
            | "agreement_amendment_record"
            | "project_set_change"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "exposure_increase";
          subject_id: string;
          choice_architecture_policy_snapshot_id?: string | null;
          status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          required_disclosures_shown?: boolean;
          comprehension_check_status?: "passed" | "not_required_for_stage" | "missing" | "failed";
          preselected_paid_commitment?: boolean;
          countdown_pressure_present?: boolean;
          misleading_default_routing_present?: boolean;
          dark_pattern_review_notes?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          participant_id?: string;
          subject_type?:
            | "common_ground_budget"
            | "marketplace_round"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement"
            | "agreement_amendment_record"
            | "project_set_change"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "exposure_increase";
          subject_id?: string;
          choice_architecture_policy_snapshot_id?: string | null;
          status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          required_disclosures_shown?: boolean;
          comprehension_check_status?: "passed" | "not_required_for_stage" | "missing" | "failed";
          preselected_paid_commitment?: boolean;
          countdown_pressure_present?: boolean;
          misleading_default_routing_present?: boolean;
          dark_pattern_review_notes?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      moral_trade_participant_confirmation_records: {
        Row: {
          id: string;
          participant_id: string;
          subject_type:
            | "common_ground_budget"
            | "marketplace_round"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement"
            | "agreement_amendment_record"
            | "project_set_change"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "exposure_increase";
          subject_id: string;
          confirmation_scope:
            | "budget_activation"
            | "round_lock"
            | "final_lock"
            | "cleared_agreement"
            | "renewed_material_change"
            | "project_set_change_approval"
            | "payment_capture"
            | "payout_release"
            | "privacy_disclosure"
            | "exposure_increase";
          status: "recorded" | "draft" | "missing" | "expired" | "revoked" | "superseded" | "stale";
          confirmation_hash: string;
          baseline_hash: string;
          terms_snapshot_hash: string;
          policy_snapshot_bundle_hash: string;
          maximum_exposure_cents: number;
          currency: string;
          notice_record_status: "delivered" | "not_required_for_stage" | "missing" | "failed" | "stale";
          consent_quality_record_id: string | null;
          consent_quality_status: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          consent_quality_required: boolean;
          eligible_set_hash: string | null;
          fallback_policy_hash: string | null;
          supersedes_confirmation_hash: string | null;
          material_terms_changed_after_confirmation: boolean;
          recorded_at: string;
          expires_at: string | null;
          revoked_at: string | null;
          superseded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          subject_type:
            | "common_ground_budget"
            | "marketplace_round"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement"
            | "agreement_amendment_record"
            | "project_set_change"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "exposure_increase";
          subject_id: string;
          confirmation_scope:
            | "budget_activation"
            | "round_lock"
            | "final_lock"
            | "cleared_agreement"
            | "renewed_material_change"
            | "project_set_change_approval"
            | "payment_capture"
            | "payout_release"
            | "privacy_disclosure"
            | "exposure_increase";
          status?: "recorded" | "draft" | "missing" | "expired" | "revoked" | "superseded" | "stale";
          confirmation_hash: string;
          baseline_hash: string;
          terms_snapshot_hash: string;
          policy_snapshot_bundle_hash: string;
          maximum_exposure_cents: number;
          currency?: string;
          notice_record_status?: "delivered" | "not_required_for_stage" | "missing" | "failed" | "stale";
          consent_quality_record_id?: string | null;
          consent_quality_status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          consent_quality_required?: boolean;
          eligible_set_hash?: string | null;
          fallback_policy_hash?: string | null;
          supersedes_confirmation_hash?: string | null;
          material_terms_changed_after_confirmation?: boolean;
          recorded_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
        };
        Update: {
          participant_id?: string;
          subject_type?:
            | "common_ground_budget"
            | "marketplace_round"
            | "matched_trade_lock_proposal"
            | "cleared_trade_agreement"
            | "agreement_amendment_record"
            | "project_set_change"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "exposure_increase";
          subject_id?: string;
          confirmation_scope?:
            | "budget_activation"
            | "round_lock"
            | "final_lock"
            | "cleared_agreement"
            | "renewed_material_change"
            | "project_set_change_approval"
            | "payment_capture"
            | "payout_release"
            | "privacy_disclosure"
            | "exposure_increase";
          status?: "recorded" | "draft" | "missing" | "expired" | "revoked" | "superseded" | "stale";
          confirmation_hash?: string;
          baseline_hash?: string;
          terms_snapshot_hash?: string;
          policy_snapshot_bundle_hash?: string;
          maximum_exposure_cents?: number;
          currency?: string;
          notice_record_status?: "delivered" | "not_required_for_stage" | "missing" | "failed" | "stale";
          consent_quality_record_id?: string | null;
          consent_quality_status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          consent_quality_required?: boolean;
          eligible_set_hash?: string | null;
          fallback_policy_hash?: string | null;
          supersedes_confirmation_hash?: string | null;
          material_terms_changed_after_confirmation?: boolean;
          recorded_at?: string;
          expires_at?: string | null;
          revoked_at?: string | null;
          superseded_by?: string | null;
        };
        Relationships: [];
      };
      moral_trade_participant_confirmation_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_account_security_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          status: "ready" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          step_up_required_actions: string[];
          cooldown_required_actions: string[];
          high_risk_event_window_hours: number;
          notice_required: boolean;
          policy_version: string;
          applies_to_action:
            | "login"
            | "payment_method_change"
            | "participant_confirmation"
            | "payment_authorization"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "identity_artifact_change"
            | "contact_introduction"
            | "account_recovery"
            | "email_change"
            | "mfa_change"
            | "exposure_increase"
            | "reliance_bearing_agreement";
          step_up_required_bool: boolean;
          trusted_device_required_bool: boolean;
          cooldown_hours: number;
          risk_signals_json: Json;
          high_risk_behavior: "block" | "step_up" | "cooldown" | "manual_review";
          account_recovery_behavior: "block_real_money" | "manual_review" | "limited_access";
          reviewer_decision_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          status?: "ready" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          step_up_required_actions?: string[];
          cooldown_required_actions?: string[];
          high_risk_event_window_hours?: number;
          notice_required?: boolean;
          policy_version?: string;
          applies_to_action?:
            | "login"
            | "payment_method_change"
            | "participant_confirmation"
            | "payment_authorization"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "identity_artifact_change"
            | "contact_introduction"
            | "account_recovery"
            | "email_change"
            | "mfa_change"
            | "exposure_increase"
            | "reliance_bearing_agreement";
          step_up_required_bool?: boolean;
          trusted_device_required_bool?: boolean;
          cooldown_hours?: number;
          risk_signals_json?: Json;
          high_risk_behavior?: "block" | "step_up" | "cooldown" | "manual_review";
          account_recovery_behavior?: "block_real_money" | "manual_review" | "limited_access";
          reviewer_decision_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          status?: "ready" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          step_up_required_actions?: string[];
          cooldown_required_actions?: string[];
          high_risk_event_window_hours?: number;
          notice_required?: boolean;
          policy_version?: string;
          applies_to_action?:
            | "login"
            | "payment_method_change"
            | "participant_confirmation"
            | "payment_authorization"
            | "payment_capture"
            | "payout_release"
            | "privacy_grant"
            | "identity_artifact_change"
            | "contact_introduction"
            | "account_recovery"
            | "email_change"
            | "mfa_change"
            | "exposure_increase"
            | "reliance_bearing_agreement";
          step_up_required_bool?: boolean;
          trusted_device_required_bool?: boolean;
          cooldown_hours?: number;
          risk_signals_json?: Json;
          high_risk_behavior?: "block" | "step_up" | "cooldown" | "manual_review";
          account_recovery_behavior?: "block_real_money" | "manual_review" | "limited_access";
          reviewer_decision_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_account_security_events: {
        Row: {
          id: string;
          profile_id: string | null;
          event_type:
            | "login"
            | "password_change"
            | "new_device"
            | "session_anomaly"
            | "payment_method_change"
            | "email_change"
            | "mfa_change"
            | "account_recovery"
            | "identity_artifact_change"
            | "participant_identity_change"
            | "step_up_passed"
            | "step_up_failed"
            | "manual_review";
          risk_status: "ready" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review" | "high_risk_event_open";
          policy_snapshot_id: string | null;
          notice_record_status: "delivered" | "not_required_for_stage" | "missing" | "failed" | "stale";
          step_up_status: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale";
          cooldown_until: string | null;
          event_hash: string;
          resolved_by: string | null;
          resolved_at: string | null;
          participant_id_hash: string;
          account_security_policy_ref: string | null;
          risk_state: "low" | "medium" | "high" | "blocked" | "manual_review" | "stale";
          action_subject_type:
            | "common_ground_budget"
            | "offset_offer"
            | "pledge_swap_offer"
            | "cleared_trade_agreement"
            | "privacy_grant"
            | "payment_event"
            | "payout_milestone"
            | "contact_interaction_record"
            | "participant_confirmation_record"
            | "participant_eligibility_record";
          action_subject_id: string;
          notice_ref: string | null;
          trusted_device_status: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          reviewer_decision_ref: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id?: string | null;
          event_type:
            | "login"
            | "password_change"
            | "new_device"
            | "session_anomaly"
            | "payment_method_change"
            | "email_change"
            | "mfa_change"
            | "account_recovery"
            | "identity_artifact_change"
            | "participant_identity_change"
            | "step_up_passed"
            | "step_up_failed"
            | "manual_review";
          risk_status?: "ready" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review" | "high_risk_event_open";
          policy_snapshot_id?: string | null;
          notice_record_status?: "delivered" | "not_required_for_stage" | "missing" | "failed" | "stale";
          step_up_status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale";
          cooldown_until?: string | null;
          event_hash: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
          participant_id_hash?: string;
          account_security_policy_ref?: string | null;
          risk_state?: "low" | "medium" | "high" | "blocked" | "manual_review" | "stale";
          action_subject_type?:
            | "common_ground_budget"
            | "offset_offer"
            | "pledge_swap_offer"
            | "cleared_trade_agreement"
            | "privacy_grant"
            | "payment_event"
            | "payout_milestone"
            | "contact_interaction_record"
            | "participant_confirmation_record"
            | "participant_eligibility_record";
          action_subject_id?: string;
          notice_ref?: string | null;
          trusted_device_status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          reviewer_decision_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string | null;
          event_type?:
            | "login"
            | "password_change"
            | "new_device"
            | "session_anomaly"
            | "payment_method_change"
            | "email_change"
            | "mfa_change"
            | "account_recovery"
            | "identity_artifact_change"
            | "participant_identity_change"
            | "step_up_passed"
            | "step_up_failed"
            | "manual_review";
          risk_status?: "ready" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review" | "high_risk_event_open";
          policy_snapshot_id?: string | null;
          notice_record_status?: "delivered" | "not_required_for_stage" | "missing" | "failed" | "stale";
          step_up_status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale";
          cooldown_until?: string | null;
          event_hash?: string;
          resolved_by?: string | null;
          resolved_at?: string | null;
          participant_id_hash?: string;
          account_security_policy_ref?: string | null;
          risk_state?: "low" | "medium" | "high" | "blocked" | "manual_review" | "stale";
          action_subject_type?:
            | "common_ground_budget"
            | "offset_offer"
            | "pledge_swap_offer"
            | "cleared_trade_agreement"
            | "privacy_grant"
            | "payment_event"
            | "payout_milestone"
            | "contact_interaction_record"
            | "participant_confirmation_record"
            | "participant_eligibility_record";
          action_subject_id?: string;
          notice_ref?: string | null;
          trusted_device_status?: "passed" | "not_required_for_stage" | "missing" | "failed" | "stale" | "under_review";
          reviewer_decision_ref?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_account_security_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_reviewer_quality_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          review_type:
            | "matching_clearing"
            | "release_gate_approval"
            | "recipient_destination_verification"
            | "privacy_grant_approval"
            | "evidence_acceptance"
            | "impact_claim_publication"
            | "appeal_resolution"
            | "incident_closure"
            | "payout_release"
            | "blocker_override";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          authorization_required_bool: boolean;
          conflict_check_required_bool: boolean;
          calibration_required_bool: boolean;
          second_review_required_bool: boolean;
          audit_sampling_required_bool: boolean;
          default_approval_prohibited_bool: boolean;
          review_speed_target_creates_default_bool: boolean;
          max_decision_age_days: number;
          policy_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          review_type:
            | "matching_clearing"
            | "release_gate_approval"
            | "recipient_destination_verification"
            | "privacy_grant_approval"
            | "evidence_acceptance"
            | "impact_claim_publication"
            | "appeal_resolution"
            | "incident_closure"
            | "payout_release"
            | "blocker_override";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          authorization_required_bool?: boolean;
          conflict_check_required_bool?: boolean;
          calibration_required_bool?: boolean;
          second_review_required_bool?: boolean;
          audit_sampling_required_bool?: boolean;
          default_approval_prohibited_bool?: boolean;
          review_speed_target_creates_default_bool?: boolean;
          max_decision_age_days?: number;
          policy_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          policy_version?: string;
          review_type?:
            | "matching_clearing"
            | "release_gate_approval"
            | "recipient_destination_verification"
            | "privacy_grant_approval"
            | "evidence_acceptance"
            | "impact_claim_publication"
            | "appeal_resolution"
            | "incident_closure"
            | "payout_release"
            | "blocker_override";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          authorization_required_bool?: boolean;
          conflict_check_required_bool?: boolean;
          calibration_required_bool?: boolean;
          second_review_required_bool?: boolean;
          audit_sampling_required_bool?: boolean;
          default_approval_prohibited_bool?: boolean;
          review_speed_target_creates_default_bool?: boolean;
          max_decision_age_days?: number;
          policy_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_review_quality_audits: {
        Row: {
          id: string;
          reviewer_id_hash: string;
          review_type:
            | "matching_clearing"
            | "release_gate_approval"
            | "recipient_destination_verification"
            | "privacy_grant_approval"
            | "evidence_acceptance"
            | "impact_claim_publication"
            | "appeal_resolution"
            | "incident_closure"
            | "payout_release"
            | "blocker_override";
          reviewer_quality_policy_id: string;
          audit_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          sampled_decision_count: number;
          overturn_count: number;
          calibration_failure_count: number;
          unresolved_conflict_count: number;
          out_of_scope_decision_count: number;
          default_approval_detected: boolean;
          audit_hash: string;
          auditor_decision_id: string | null;
          audited_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reviewer_id_hash: string;
          review_type:
            | "matching_clearing"
            | "release_gate_approval"
            | "recipient_destination_verification"
            | "privacy_grant_approval"
            | "evidence_acceptance"
            | "impact_claim_publication"
            | "appeal_resolution"
            | "incident_closure"
            | "payout_release"
            | "blocker_override";
          reviewer_quality_policy_id: string;
          audit_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          sampled_decision_count?: number;
          overturn_count?: number;
          calibration_failure_count?: number;
          unresolved_conflict_count?: number;
          out_of_scope_decision_count?: number;
          default_approval_detected?: boolean;
          audit_hash: string;
          auditor_decision_id?: string | null;
          audited_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reviewer_id_hash?: string;
          review_type?:
            | "matching_clearing"
            | "release_gate_approval"
            | "recipient_destination_verification"
            | "privacy_grant_approval"
            | "evidence_acceptance"
            | "impact_claim_publication"
            | "appeal_resolution"
            | "incident_closure"
            | "payout_release"
            | "blocker_override";
          reviewer_quality_policy_id?: string;
          audit_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          sampled_decision_count?: number;
          overturn_count?: number;
          calibration_failure_count?: number;
          unresolved_conflict_count?: number;
          out_of_scope_decision_count?: number;
          default_approval_detected?: boolean;
          audit_hash?: string;
          auditor_decision_id?: string | null;
          audited_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_reviewer_quality_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_anti_enumeration_policies: {
        Row: {
          id: string;
          policy_snapshot_id: string;
          policy_version: string;
          surface:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          rate_limit_required_bool: boolean;
          query_fingerprint_required_bool: boolean;
          access_event_logging_required_bool: boolean;
          bucketed_counts_required_bool: boolean;
          sparse_suppression_required_bool: boolean;
          timing_equalization_required_bool: boolean;
          incident_escalation_required_bool: boolean;
          max_repeated_fingerprint_count: number;
          min_public_bucket_size: number;
          max_event_age_days: number;
          policy_hash: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          policy_snapshot_id: string;
          policy_version?: string;
          surface:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          rate_limit_required_bool?: boolean;
          query_fingerprint_required_bool?: boolean;
          access_event_logging_required_bool?: boolean;
          bucketed_counts_required_bool?: boolean;
          sparse_suppression_required_bool?: boolean;
          timing_equalization_required_bool?: boolean;
          incident_escalation_required_bool?: boolean;
          max_repeated_fingerprint_count?: number;
          min_public_bucket_size?: number;
          max_event_age_days?: number;
          policy_hash: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          policy_snapshot_id?: string;
          policy_version?: string;
          surface?:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          rate_limit_required_bool?: boolean;
          query_fingerprint_required_bool?: boolean;
          access_event_logging_required_bool?: boolean;
          bucketed_counts_required_bool?: boolean;
          sparse_suppression_required_bool?: boolean;
          timing_equalization_required_bool?: boolean;
          incident_escalation_required_bool?: boolean;
          max_repeated_fingerprint_count?: number;
          min_public_bucket_size?: number;
          max_event_age_days?: number;
          policy_hash?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_discovery_access_events: {
        Row: {
          id: string;
          surface:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          anti_enumeration_policy_ref: string;
          actor_id_hash: string | null;
          query_fingerprint: string | null;
          source_route: string;
          result_count_bucket:
            | "zero"
            | "one_or_two_suppressed"
            | "three_to_nine"
            | "ten_to_forty_nine"
            | "fifty_plus"
            | "not_returned";
          raw_query_stored_bool: boolean;
          exact_result_count_exposed_bool: boolean;
          sparse_suppression_applied_bool: boolean;
          timing_equalized_bool: boolean;
          rate_limit_applied_bool: boolean;
          delayed_response_applied_bool: boolean;
          redacted_response_applied_bool: boolean;
          event_hash: string;
          occurred_at: string;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          surface:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          anti_enumeration_policy_ref: string;
          actor_id_hash?: string | null;
          query_fingerprint?: string | null;
          source_route?: string;
          result_count_bucket?:
            | "zero"
            | "one_or_two_suppressed"
            | "three_to_nine"
            | "ten_to_forty_nine"
            | "fifty_plus"
            | "not_returned";
          raw_query_stored_bool?: boolean;
          exact_result_count_exposed_bool?: boolean;
          sparse_suppression_applied_bool?: boolean;
          timing_equalized_bool?: boolean;
          rate_limit_applied_bool?: boolean;
          delayed_response_applied_bool?: boolean;
          redacted_response_applied_bool?: boolean;
          event_hash: string;
          occurred_at?: string;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          surface?:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          anti_enumeration_policy_ref?: string;
          actor_id_hash?: string | null;
          query_fingerprint?: string | null;
          source_route?: string;
          result_count_bucket?:
            | "zero"
            | "one_or_two_suppressed"
            | "three_to_nine"
            | "ten_to_forty_nine"
            | "fifty_plus"
            | "not_returned";
          raw_query_stored_bool?: boolean;
          exact_result_count_exposed_bool?: boolean;
          sparse_suppression_applied_bool?: boolean;
          timing_equalized_bool?: boolean;
          rate_limit_applied_bool?: boolean;
          delayed_response_applied_bool?: boolean;
          redacted_response_applied_bool?: boolean;
          event_hash?: string;
          occurred_at?: string;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_discovery_probe_audits: {
        Row: {
          id: string;
          surface:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          anti_enumeration_policy_ref: string;
          query_fingerprint: string;
          audit_status: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          event_count: number;
          unique_actor_hash_count: number;
          repeated_fingerprint_count: number;
          sparse_result_hit_count: number;
          timing_variance_ms: number;
          escalation_incident_ref: string | null;
          audit_hash: string;
          audited_at: string | null;
          expires_at: string | null;
          superseded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          surface:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          anti_enumeration_policy_ref: string;
          query_fingerprint: string;
          audit_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          event_count?: number;
          unique_actor_hash_count?: number;
          repeated_fingerprint_count?: number;
          sparse_result_hit_count?: number;
          timing_variance_ms?: number;
          escalation_incident_ref?: string | null;
          audit_hash: string;
          audited_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          surface?:
            | "public_search"
            | "signed_in_search"
            | "public_browse"
            | "preview_generation"
            | "invite_link_creation"
            | "match_candidate_browsing"
            | "transparency_report";
          anti_enumeration_policy_ref?: string;
          query_fingerprint?: string;
          audit_status?: "passed" | "not_required_for_stage" | "missing" | "under_review" | "failed" | "stale" | "superseded";
          event_count?: number;
          unique_actor_hash_count?: number;
          repeated_fingerprint_count?: number;
          sparse_result_hit_count?: number;
          timing_variance_ms?: number;
          escalation_incident_ref?: string | null;
          audit_hash?: string;
          audited_at?: string | null;
          expires_at?: string | null;
          superseded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moral_trade_backup_recovery_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_backup_recovery_checkpoints: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_deployment_release_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_configuration_snapshots: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_configuration_change_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_schema_migration_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_schema_migration_runs: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_environment_data_isolation_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_environment_data_isolation_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_financial_reconciliation_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_financial_reconciliation_runs: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_audit_integrity_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_audit_integrity_checkpoints: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_data_security_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_key_version_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_production_readiness_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_recipient_registry_entries: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_payment_destinations: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_recipient_destination_reviews: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_side_agreement_disclosures: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_side_agreement_reviews: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_side_agreement_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_trade_classification_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_trade_classification_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_compensated_action_terms: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_ordinary_service_procurement_reviews: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_protective_assessment_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_protective_assessment_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_negative_commitment_scopes: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_negative_commitment_scope_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_action_reversibility_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_action_reversibility_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_donor_of_record_tax_reviews: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_donor_of_record_tax_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_authority_obligation_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_authority_obligation_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_user_safety_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_contact_interaction_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_abuse_report_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_content_moderation_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_content_moderation_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_user_safety_content_moderation_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_platform_fee_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_platform_fee_disclosures: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_fx_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_fx_rate_snapshots: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_notification_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_material_notice_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_time_authority_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_deadline_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_challenge_window_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_payout_milestone_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_financial_settlement_control_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_identity_artifact_references: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_participant_eligibility_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_participant_eligibility_enforcement_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_participant_eligibility_reviews: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_opportunity_constraint_policies: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_opportunity_meal_evidence_bundles: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_meal_witness_testimonials: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_opportunity_constraint_assessments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      moral_trade_opportunity_meal_audit_events: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_baselines: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_offers: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_candidates: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_proposals: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_evidence_records: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_review_assignments: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_review_decisions: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_obligations: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_impact_credits: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
      direct_spending_upgrade_audit_events: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: SupabaseMoralTradeOperationalInsert;
        Update: SupabaseMoralTradeOperationalUpdate;
        Relationships: [];
      };
    };
    Views: {
      direct_spending_upgrade_public_offers: {
        Row: SupabaseMoralTradeOperationalRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      public_profile_cards_v1: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          account_kind: "individual" | "organization";
          accepts_group_invitations: boolean;
          public_invitation_mentions_enabled: boolean;
          organization_approval_count: number;
          bio: string;
          follower_count: number;
          following_count: number;
          karma: number;
          comment_count: number;
          rating_avg: number | null;
          rating_count: number;
          offer_count: number;
          created_at: string;
          public_location_granularity: "hidden" | "country" | "region" | "city";
          city: string | null;
          region: string | null;
          country: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      wish_profile_previews: {
        Row: {
          profile_id: string;
          participant_kind: "individual" | "collective" | "institution";
          collective_name: string;
          causes: string[];
          public_preview: string;
          location_city: string | null;
          location_region: string | null;
          openness_to_payment: boolean;
          openness_to_pledges: boolean;
          background_search_enabled: boolean;
          privacy_stage: "strict" | "broad" | "limited";
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      match_suggestion_previews: {
        Row: {
          id: string;
          counterparty_profile_id: string | null;
          counterparty_public_preview: string;
          counterparty_causes: string[];
          counterparty_location_city: string | null;
          counterparty_location_region: string | null;
          counterparty_openness_to_payment: boolean;
          counterparty_openness_to_pledges: boolean;
          viewer_reason: string;
          counterparty_reason: string;
          score: number;
          match_basis: string[];
          shared_causes: string[];
          suggested_first_step: string;
          risk_notes: string;
          generated_by: string;
          status: "suggested" | "dismissed" | "introduced" | "archived";
          identity_revealed: boolean;
          viewer_consented: boolean;
          counterparty_consented: boolean;
          can_reveal_identity: boolean;
          last_scored_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: {
      create_direct_spending_upgrade_offer: {
        Args: {
          p_creator_profile_id: string;
          p_environment: string;
          p_category: string;
          p_private_merchant_label: string;
          p_private_description: string;
          p_planned_spend_amount_cents: number;
          p_creator_diversion_amount_cents: number;
          p_planned_action: string;
          p_evidence_payload: Json;
          p_evidence_hash: string;
          p_evidence_captured_at: string;
          p_baseline_fingerprint: string;
          p_matcher_amount_cents: number;
          p_match_deadline_at: string;
          p_privacy_mode: string;
          p_upgraded_recipient: Json;
          p_upgraded_recipient_hash: string;
          p_terms_hash: string;
          p_nonessential_attested: boolean;
          p_no_material_harm_attested: boolean;
          p_preexisting_plan_attested: boolean;
          p_not_already_cancelled_attested: boolean;
          p_available_funds_attested: boolean;
          p_not_otherwise_donating_attested: boolean;
        };
        Returns: Json;
      };
      join_direct_spending_upgrade_offer: {
        Args: {
          p_actor_profile_id: string;
          p_offer_id: string;
          p_commitment_version: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      propose_direct_spending_upgrade_terms: {
        Args: {
          p_actor_profile_id: string;
          p_offer_id: string;
          p_creator_diversion_amount_cents: number;
          p_matcher_amount_cents: number;
          p_message: string;
          p_commitment_version: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      accept_direct_spending_upgrade_proposal: {
        Args: {
          p_actor_profile_id: string;
          p_proposal_id: string;
          p_new_terms_hash: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      submit_direct_spending_upgrade_change_evidence: {
        Args: {
          p_actor_profile_id: string;
          p_offer_id: string;
          p_private_payload: Json;
          p_evidence_hash: string;
          p_captured_at: string;
          p_idempotency_key: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      start_direct_spending_upgrade_checkout: {
        Args: {
          p_actor_profile_id: string;
          p_obligation_id: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      complete_direct_spending_upgrade_obligation: {
        Args: {
          p_obligation_id: string;
          p_valid: boolean;
          p_failure_code: string;
          p_failure_message: string;
          p_provider_charge_id_hash: string;
          p_provider_payload_hash: string;
          p_provider_gross_amount_cents: number | null;
          p_provider_net_amount_cents: number | null;
          p_provider_currency: string;
          p_provider_nonprofit_slug: string;
          p_provider_nonprofit_ein: string;
          p_provider_donation_date: string | null;
          p_provider_payment_method: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      run_direct_spending_upgrade_lifecycle: {
        Args: { p_now: string; p_expected_environment: string };
        Returns: Json;
      };
      cancel_direct_spending_upgrade_offer: {
        Args: {
          p_actor_profile_id: string;
          p_offer_id: string;
          p_expected_environment: string;
        };
        Returns: Json;
      };
      normalize_profile_username_v1: {
        Args: { p_username: string };
        Returns: string;
      };
      safe_participant_display_name_v1: {
        Args: { p_display_name: string | null; p_username: string };
        Returns: string;
      };
      search_create_participants_v2: {
        Args: { p_actor_profile_id: string; p_query: string; p_limit?: number };
        Returns: {
          profile_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          account_type: "individual" | "organization";
          verification: "none" | "identity-verified" | "organization-verified";
          public_invitation_mentions_enabled: boolean;
        }[];
      };
      resolve_create_participants_v2: {
        Args: { p_actor_profile_id: string; p_profile_ids: string[] };
        Returns: {
          profile_id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          account_type: "individual" | "organization";
          verification: "none" | "identity-verified" | "organization-verified";
          public_invitation_mentions_enabled: boolean;
        }[];
      };
      viewer_can_access_collective: {
        Args: {
          target_collective_id: string;
        };
        Returns: boolean;
      };
      viewer_participates_in_match: {
        Args: {
          target_match_id: string;
        };
        Returns: boolean;
      };
      upsert_match_suggestion: {
        Args: {
          target_profile_a_id: string;
          target_profile_b_id: string;
          target_profile_a_entry_id: string | null;
          target_profile_b_entry_id: string | null;
          target_reason_for_a: string;
          target_reason_for_b: string;
          target_score: number;
          target_dedupe_key: string;
          target_match_basis?: string[];
          target_shared_causes?: string[];
          target_suggested_first_step?: string;
          target_risk_notes?: string;
          target_generated_by?: string;
        };
        Returns: {
          match_id: string;
          was_created: boolean;
        }[];
      };
      reserve_background_candidate_exposure: {
        Args: {
          target_candidate_profile_id: string;
          target_purpose_code:
            | "moral_trade_offer"
            | "donation_offset"
            | "pledge_swap"
            | "moral_public_good"
            | "research_collaboration"
            | "community_intro";
          target_purpose_policy_version: "background-purpose-policy-v1";
          target_audience_scope: "cohort_only" | "partner_matchmaker" | "public_broad_preview";
          target_cohort_scope_id?: string;
          target_surface_limit?: number;
          target_window_days?: number;
          target_budget_version?: string;
        };
        Returns: {
          allowed: boolean;
          budget_state: "clear" | "near_limit" | "exhausted" | "cooloff";
          counter_id: string | null;
          remaining: number;
          blocker_code: string;
        }[];
      };
      viewer_consent_to_match: {
        Args: {
          target_match_id: string;
          consent_note?: string;
        };
        Returns: {
          counterparty_id: string;
          both_consented: boolean;
        }[];
      };
    };
    Enums: {
      offer_mode: "pledge" | "offset" | "payment";
      offer_status: "open" | "paused" | "matched" | "closed";
      interest_status: "pending" | "accepted" | "declined" | "withdrawn";
      agreement_status: "proposed" | "active" | "completed" | "cancelled";
      wish_entry_type: "wish" | "offer" | "ask";
      match_suggestion_status: "suggested" | "dismissed" | "introduced" | "archived";
    };
    CompositeTypes: Record<string, never>;
  };
}
