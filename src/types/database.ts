// ============================================================================
// HAND-MAINTAINED. *** DO NOT OVERWRITE WITH A TYPE GENERATOR. ***
//
// This file imitates the shape of `supabase gen types typescript` output, but
// it is written and maintained BY HAND. Regenerating over it is a regression,
// not a refresh. Verified against real generator output on 2026-07-27:
//
//   * The generator emits `category: string`, `severity: number`,
//     `status: string`. This file declares FlagCategory, FlagSeverity
//     (1 | 2 | 3 | 4 | 5) and FlagStatus unions. Overwriting WIDENS three
//     domain types to primitives and silently removes real type safety.
//   * The generator emits no `FlagRow` / `FlagStatus` / `FlagCategory` /
//     `FlagSeverity` top-level exports at all — and the app imports those
//     everywhere, so a wholesale replace fails `tsc` across the codebase.
//   * Every entry below carries hand-authored provenance (which migration
//     introduced it, whether it is applied live, Jordan privacy conditions).
//     A generator drops all of it.
//
// To reflect a schema change: hand-edit the affected entry, additively, in the
// existing house style. If you want generator output for comparison, write it
// to a scratch path and diff — never onto this file.
// ============================================================================

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
  // Optional alt text for the primary photo, written by the reporter so
  // VoiceOver users hear a real description instead of "Flag photo".
  // Optional until supabase/migrations/2026-08-19_photo_alt_text_APPLIED.sql
  // (applied to live 2026-08-19). ≤200 chars, enforced client + DB check.
  photo_alt?: string | null;
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
//
// SR-117: `user_id` is nullable because LIVE is nullable. The repo migration
// declares NOT NULL / ON DELETE CASCADE; live carries NULL / ON DELETE SET
// NULL, verified read-only 2026-07-27 and banked in
// supabase/migrations/2026-07-27_drift_capture_flag_comments_user_id.sql
// (which also holds the Sky-decides fork). So a comment whose author deleted
// their account comes back with user_id = null, and typing it `string` was a
// lie for exactly those rows.
//
// ⚠ A NULL author is NOT ownership. Compare with `===` against `user?.id` and
// never with `==` or a nullish default: for a guest `user?.id` is undefined,
// and `null == undefined` is TRUE, which would hand an orphaned comment's
// Delete affordance to every signed-out reader. Asserted in
// src/lib/__tests__/commentAuthor.test.ts.
export type CommentRow = {
  id: string;
  flag_id: string;
  user_id: string | null;
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
          // SR-117: nullable live (ON DELETE SET NULL) -- see CommentRow above.
          user_id: string | null;
          content: string;
          created_at: string;
        };
        Insert: {
          flag_id: string;
          // Stays NOT-nullable on Insert: the app always supplies an author,
          // and the RLS policy requires user_id = auth.uid(). Only reads can
          // observe the NULL that ON DELETE SET NULL leaves behind.
          user_id: string;
          content: string;
          id?: string;
          created_at?: string;
        };
        Update: Partial<{
          content: string;
        }>;
        // The one hand-authored Relationships entry (code-qa 2026-08-06
        // TYPE-3): names the live FK (verified in the 2026-07-27 drift
        // capture) so the `users!flag_comments_user_id_fkey(...)` embed in
        // comments.ts typechecks without casting the whole client to any.
        // Tuple of LITERAL types on purpose — postgrest-js resolves embed
        // hints by matching foreignKeyName literals; the general
        // EmptyRelationships shape can never match.
        Relationships: [
          {
            foreignKeyName: 'flag_comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      // Optional until supabase/migrations/2026-05-30_flag_photos_junction.sql
      // is applied. listFlagPhotos/batchInsertFlagPhotos gracefully degrade
      // (return [] / no-op) if the table doesn't exist yet.
      flag_photos: {
        Row: {
          id: string;
          flag_id: string;
          url: string;
          position: number;
          created_at: string;
          // Optional VoiceOver description, written by the uploader.
          // Optional until 2026-08-19_photo_alt_text_APPLIED.sql (live).
          alt_text?: string | null;
        };
        Insert: {
          flag_id: string;
          url: string;
          position: number;
          id?: string;
          created_at?: string;
          alt_text?: string | null;
        };
        Update: Partial<{
          url: string;
          position: number;
          alt_text: string | null;
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
      // F10: Reopen-request counter RPC (migration
      // 2026-05-30_flag_reopen_requests.sql, applied 2026-05-30). SECURITY
      // DEFINER; atomically increments flags.reopen_requests for a RESOLVED
      // flag and returns the new count (0 if the flag isn't resolved). Stores
      // NO user_id (Jordan privacy gate). Authenticated callers only.
      increment_reopen_request: {
        Args: {
          p_flag_id: string;
        };
        Returns: number;
      };
      // Fork 5 / W1: Dispute ("flag as wrong") counter RPC (migration
      // 2026-07-16_fork5_dispute_counter_PROPOSED.sql, APPLIED 2026-07-27 —
      // ledger `fork5_w1_dispute_counter_20260727`). SECURITY DEFINER;
      // atomically increments flags.dispute_requests for a flag whose status
      // is 'open' or 'verified' and returns the new count (0 if the flag is
      // not live). Stores NO user_id (Jordan privacy gate — mirrors F10).
      // Authenticated callers only; anon EXECUTE is deliberately revoked (W2
      // is gated — see the migration header).
      //
      // ACCURACY ONLY. This is a doubt signal about whether a report is
      // correct. It is NOT the Apple 1.2(b) abuse/objectionable-content
      // report path: no reason, no category, no reporter identity, no admin
      // queue, and it cannot target comments. That path is still unbuilt —
      // see 07_PHASE2_REPORT.md §4.
      //
      // Signature confirmed against live generator output 2026-07-27.
      // NOTE: src/lib/disputes.ts still calls this through an `any` cast; the
      // cast's removal is tracked separately and is what makes this entry
      // load-bearing rather than documentary.
      increment_dispute_request: {
        Args: {
          p_flag_id: string;
        };
        Returns: number;
      };
      // UX #8: Monthly leaderboard RPC. Ranks contributors by THIS calendar
      // month's points from peer-validated work. Optional until the migration
      // FILE is applied to the live backend — listMonthlyLeaderboard() in
      // src/lib/users.ts degrades gracefully (console.warn + return []) when the
      // function is absent (PostgREST 42883 / PGRST202), so the client can ship
      // before the SQL runs.
      list_monthly_leaderboard: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          monthly_points: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
