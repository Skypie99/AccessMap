export type FlagStatus = 'open' | 'verified' | 'resolved' | 'rejected';

export type FlagCategory =
  | 'no_ramp'
  | 'broken_sidewalk'
  | 'blocked_path'
  | 'missing_signal'
  | 'steep_grade'
  | 'other';

export type FlagSeverity = 1 | 2 | 3 | 4 | 5;

export type FlagRow = {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  category: FlagCategory;
  description: string | null;
  severity: FlagSeverity;
  photo_url: string | null;
  status: FlagStatus;
  created_at: string;
  // Optional until supabase/migrations/2026-05-23_data_layer_hardening.sql
  // is applied. After that migration runs, every row has updated_at set
  // (default now() on insert, BEFORE UPDATE trigger on edit).
  updated_at?: string;
  // Optional until supabase/migrations/2026-05-24_flag_context_tags.sql
  // is applied. The column holds ≤5 vocabulary strings from contextTags.ts.
  context_tags?: string[];
};

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  created_at: string;
};

// Mirrors the `category` enum in supabase/migrations/2026-05-23_feedback_table.sql.
// Kept aligned with FEEDBACK_CATEGORIES in src/lib/feedback.ts.
export type FeedbackCategoryRow = 'bug' | 'idea' | 'love' | 'other';

export type FeedbackRow = {
  id: string;
  // Nullable so a sign-out-then-feedback flow can still record an
  // anonymous message — the table's RLS only blocks SELECT, not INSERT
  // for null user_id. See migration for details.
  user_id: string | null;
  category: FeedbackCategoryRow;
  body: string;
  contact_email: string | null;
  platform: string | null;
  created_at: string;
};

type EmptyRelationships = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
}[];

export type Database = {
  public: {
    Tables: {
      flags: {
        Row: FlagRow;
        Insert: Omit<FlagRow, 'id' | 'created_at' | 'status'> & {
          id?: string;
          created_at?: string;
          status?: FlagStatus;
        };
        Update: Partial<FlagRow>;
        Relationships: EmptyRelationships;
      };
      users: {
        Row: UserRow;
        Insert: Omit<UserRow, 'created_at' | 'points'> & {
          created_at?: string;
          points?: number;
        };
        Update: Partial<UserRow>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-23_feedback_table.sql is
      // applied. Until then, any submitFeedback() call will fail at the
      // postgrest layer ("relation does not exist") — the dual-write
      // pattern in FeedbackModal catches that and silently degrades to
      // mailto-only so the user never sees the error.
      feedback: {
        Row: FeedbackRow;
        Insert: Omit<FeedbackRow, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<FeedbackRow>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-24_status_history_table.sql
      // is applied. The migration is propose-only (Sky applies it). Until then,
      // any listFlagStatusHistory() call degrades gracefully to [].
      flag_status_history: {
        Row: {
          id: string;
          flag_id: string;
          old_status: string | null;
          new_status: string;
          changed_by: string | null;
          changed_at: string;
        };
        Insert: {
          flag_id: string;
          new_status: string;
          old_status?: string | null;
          changed_by?: string | null;
          changed_at?: string;
        };
        Update: Record<string, never>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-25_push_tokens.sql is
      // applied. Absence of a row means push notifications are disabled for
      // that user — there is no "disabled" flag, the row simply doesn't exist.
      push_tokens: {
        Row: {
          user_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          token: string;
          platform?: 'ios' | 'android' | 'web' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          token?: string;
          platform?: 'ios' | 'android' | 'web' | null;
          updated_at?: string;
        };
        Relationships: EmptyRelationships;
      };
      // D4: Realtime Flags — observability log.
      // Optional until the D4 SQL (2026-05-28_Dana_D4-RealtimeFlags-Filtered-SQL.md)
      // is applied by Sky in the Supabase dashboard. The `log_realtime_event` RPC
      // call degrades gracefully (console.warn) if the table/function does not
      // exist yet, so the client can be deployed before the SQL is applied.
      realtime_subscribe_log: {
        Row: {
          id: number;
          user_id: string;
          event: 'subscribe' | 'unsubscribe';
          channel: string;
          logged_at: string;
        };
        Insert: {
          user_id: string;
          event: 'subscribe' | 'unsubscribe';
          channel: string;
          logged_at?: string;
        };
        Update: Record<string, never>;
        Relationships: EmptyRelationships;
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      // D4: Realtime observability RPC (Safeguard #3).
      // Server-side: inserts a row into realtime_subscribe_log bound to auth.uid().
      // Client must be authenticated; anon calls are rejected by the function.
      log_realtime_event: {
        Args: {
          p_event: 'subscribe' | 'unsubscribe';
          p_channel: string;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
