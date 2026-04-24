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
      agreements: {
        Row: {
          id: string;
          offer_id: string;
          interest_id: string | null;
          proposer_id: string;
          responder_id: string;
          status: "proposed" | "active" | "completed" | "cancelled";
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          offer_id: string;
          interest_id?: string | null;
          proposer_id: string;
          responder_id: string;
          status?: "proposed" | "active" | "completed" | "cancelled";
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "proposed" | "active" | "completed" | "cancelled";
          notes?: string;
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
            | "payment_update";
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
            | "payment_update";
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
            | "payment_update";
          summary?: string;
          details?: string;
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
