Warning: truncated output (original token count: 104605)
Total output lines: 11149

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
        …54605 tokens truncated…fied: boolean;
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
    };
    Views: {
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
