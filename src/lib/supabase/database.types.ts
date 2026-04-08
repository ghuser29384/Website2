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
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          city?: string | null;
          region?: string | null;
          bio?: string;
          created_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          city?: string | null;
          region?: string | null;
          bio?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      offer_mode: "pledge" | "offset" | "payment";
      offer_status: "open" | "paused" | "matched" | "closed";
      interest_status: "pending" | "accepted" | "declined" | "withdrawn";
      agreement_status: "proposed" | "active" | "completed" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
}
