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
  // Null for anonymously-submitted flags (user_id IS NULL in DB).
  // See supabase/migrations/2026-05-30_anon_flag_reporting.sql.
  user_id: string | null;
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
  // F10 reopen mechanism. Optional until
  // supabase/migrations/2026-05-30_flag_reopen_requests.sql is applied.
  // reopen_requests is the anonymous aggregate vote count for the current
  // resolution cycle. reopen_requests_reset_at stamps when the current
  // cycle started (used for client-side per-cycle dedup without user_id).
  // Jordan hard condition: no user_id linkage — counter only.
  reopen_requests?: number;
  reopen_requests_reset_at?: string | null;
};

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
  created_at: string;
  // Optional until supabase/migrations/2026-05-30_admin_role.sql is applied.
  // False by default; only settable via direct DB / service-role access.
  is_admin?: boolean;
  // Optional until supabase/migrations/2026-05-30_trust_score_system.sql is applied.
  last_active_date?: string | null;
  streak_days?: number;
  longest_streak_days?: number;
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

// One comment on a flag. `display_name` is populated by a PostgREST join
// from public.users; it is NOT a real column on the flag_comments table.
// Optional until supabase/migrations/2026-05-30_flag_comments.sql is applied.
export type CommentRow = {
  id: string;
  flag_id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name: string | null;
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
        Insert: Omit<FlagRow, 'id' | 'created_at' | 'status' | 'user_id'> & {
          id?: string;
          created_at?: string;
          status?: FlagStatus;
          // Optional: omit for anon inserts (Postgres stores NULL); provide for auth inserts.
          user_id?: string | null;
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
      // Optional until supabase/migrations/2026-05-30_flag_comments.sql is
      // applied. The display_name join is handled at query-time via
      // PostgREST — it is NOT a real column on this table (see CommentRow).
      flag_comments: {
        Row: {
          id: string;
          flag_id: string;
          user_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          flag_id: string;
          user_id: string;
          content: string;
          id?: string;
          created_at?: string;
        };
        Update: Partial<{
          content: string;
        }>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-30_flag_photos_junction.sql
      // is applied. listFlagPhotos/addFlagPhoto/deleteFlagPhoto gracefully
      // degrade (return [] / no-op) if the table doesn't exist yet.
      flag_photos: {
        Row: {
          id: string;
          flag_id: string;
          url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          flag_id: string;
          url: string;
          position: number;
          id?: string;
          created_at?: string;
        };
        Update: Partial<{
          url: string;
          position: number;
        }>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-30_trust_score_system.sql is
      // applied. Owner-readable only (RLS enforces user_id = auth.uid() on SELECT).
      // flag_id is present for internal audit but must NOT be displayed in the UI
      // — it would indirectly reveal the flag's location (see TRUST_SCORE_SPEC §3.2).
      point_events: {
        Row: {
          id: number;
          user_id: string;
          event_type: string;
          delta: number;
          flag_id: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          event_type: string;
          delta: number;
          flag_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-30_trust_score_system.sql is applied.
      flag_verifications: {
        Row: {
          id: string;
          flag_id: string;
          verifier_id: string;
          weight: number;
          created_at: string;
        };
        Insert: {
          flag_id: string;
          verifier_id: string;
          weight?: number;
          id?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: EmptyRelationships;
      };
      // Optional until supabase/migrations/2026-05-30_trust_score_system.sql is applied.
      comment_votes: {
        Row: {
          comment_id: string;
          voter_id: string;
          created_at: string;
        };
        Insert: {
          comment_id: string;
          voter_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
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
