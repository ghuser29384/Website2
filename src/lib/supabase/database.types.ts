export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
          conflict_of_interest_notes: string;
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
          conflict_of_interest_notes?: string;
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
          conflict_of_interest_notes?: string;
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
          source_connection_id?: string | null;
          is_active?: boolean;
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
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
          title: string;
          confidence_band: "High" | "Moderate" | "Tentative" | "Exploratory";
          factor_codes: string[];
          why_text: string;
          next_step_type:
            | "answer_questions"
            | "request_intro_packet"
            | "request_detail"
            | "review_profile"
            | "mute_or_dismiss";
          hidden_fields_notice: string;
          reveal_consequence_notice: string;
          status: "open" | "opened" | "dismissed" | "muted" | "packet_requested" | "expired";
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          candidate_profile_id?: string | null;
          match_id?: string | null;
          title?: string;
          confidence_band?: "High" | "Moderate" | "Tentative" | "Exploratory";
          factor_codes?: string[];
          why_text?: string;
          next_step_type?:
            | "answer_questions"
            | "request_intro_packet"
            | "request_detail"
            | "review_profile"
            | "mute_or_dismiss";
          hidden_fields_notice?: string;
          reveal_consequence_notice?: string;
          status?: "open" | "opened" | "dismissed" | "muted" | "packet_requested" | "expired";
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          candidate_profile_id?: string | null;
          match_id?: string | null;
          title?: string;
          confidence_band?: "High" | "Moderate" | "Tentative" | "Exploratory";
          factor_codes?: string[];
          why_text?: string;
          next_step_type?:
            | "answer_questions"
            | "request_intro_packet"
            | "request_detail"
            | "review_profile"
            | "mute_or_dismiss";
          hidden_fields_notice?: string;
          reveal_consequence_notice?: string;
          status?: "open" | "opened" | "dismissed" | "muted" | "packet_requested" | "expired";
          expires_at?: string;
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
          sla_due_at?: string;
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
          sensitive_ciphertexts?: Record<string, string>;
          sensitive_encryption_version?: string;
          updated_at?: string;
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
          access_status: "not_connected" | "connected" | "revoked" | "needs_review";
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
          access_status?: "not_connected" | "connected" | "revoked" | "needs_review";
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
          access_status?: "not_connected" | "connected" | "revoked" | "needs_review";
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
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          strategy_id?: string | null;
          status?: "queued" | "running" | "completed" | "failed";
          candidates_scanned?: number;
          suggestions_created?: number;
          notes?: string;
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
          role: "owner" | "admin" | "member" | "viewer";
          status: "invited" | "active" | "removed";
          delegation_scope: string;
          can_approve_matches: boolean;
          can_grant_privacy: boolean;
          can_manage_bounties: boolean;
          created_at: string;
        };
        Insert: {
          collective_id: string;
          profile_id: string;
          role?: "owner" | "admin" | "member" | "viewer";
          status?: "invited" | "active" | "removed";
          delegation_scope?: string;
          can_approve_matches?: boolean;
          can_grant_privacy?: boolean;
          can_manage_bounties?: boolean;
          created_at?: string;
        };
        Update: {
          role?: "owner" | "admin" | "member" | "viewer";
          status?: "invited" | "active" | "removed";
          delegation_scope?: string;
          can_approve_matches?: boolean;
          can_grant_privacy?: boolean;
          can_manage_bounties?: boolean;
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
