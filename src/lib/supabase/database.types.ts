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
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          display_name?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
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
          status?: "open" | "paused" | "matched" | "closed";
          updated_at?: string;
        };
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
      };
    };
  };
}
