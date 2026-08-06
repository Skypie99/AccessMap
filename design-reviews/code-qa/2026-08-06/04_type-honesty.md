# LENS 3 — TYPE HONESTY · code-qa 2026-08-06 · `[F5/2026-08-06]`

**Config floor (verified):** `strict: true` + `noUncheckedIndexedAccess: true` (tsconfig.json:4-5) — the stricter-than-default setting explains the disciplined `?? 0` index guards in the byte-walkers. `tsc --noEmit` exit 0.

## The full escape-hatch census (production code; tests excluded)
**12 `as any` · 6 `as unknown as` · 0 `@ts-ignore` · 0 `@ts-expect-error` · 0 non-null `!` assertions.** Every single one carries an inline reason. For 51k LOC this is an exceptionally honest type surface. Sites: comments.ts:101,154,185 (embed join — see TYPE-3) · flags.ts:306-324 (web FileReader/Image handlers, eslint-disabled + commented) · useComments.ts:104 (realtime event name typing gap) · disputes.ts:61 (**stale — TYPE-2**) · AboutScreen.ts:34 (legacy Constants field) · createFlag's `as never` (**stale — TYPE-1**) · RootNavigator:232, LeaderboardScreen:454, ScreenStage:52 (platform-boundary style/DOM) · announce.ts:66 (documented private-API probe) · analytics.ts:130 (legacy catalog funnel) · statusHistory.ts:57 (honestly justified — view is propose-only, "don't claim a type for an object that may not exist").

## Findings — the drift here runs in REVERSE: the types caught up and two casts never retired

### TYPE-1 · LOW — createFlag's tagged-insert cast rests on a claim `database.ts` no longer makes
**Surface:** `src/lib/flags.ts:1233-1241` vs `src/types/database.ts:53-55,136-147`.
**Evidence:** the comment says *"The Database type in src/types/database.ts doesn't list context_tags yet … cast to escape the typed Insert shape. Once the migration lands and the type is updated, this cast can come off."* But `FlagRow.context_tags?: string[]` exists (database.ts:55) and survives the Insert's `Omit` (:138-144) — the Insert shape **already accepts** `context_tags`. The retirement condition its author wrote has been met.
**Disposition:** Phase B — drop the `as Record<string, unknown>` / `as never` pair and the stale comment; `npm run typecheck` is the whole proof (behavior identical — same payload bytes).

### TYPE-2 · LOW — disputes.ts casts around an RPC that IS in the Functions union
**Surface:** `src/lib/disputes.ts:55-62` vs `src/types/database.ts:370-375`.
**Evidence:** comment claims *"absent from the generated Functions union in database.ts because it is absent from the database"* — but `increment_dispute_request: { Args: { p_flag_id: string }; Returns: number }` is declared at database.ts:370. The type landed; the cast and its justification didn't retire. (Contrast `requestFlagReopen`, which calls its typed twin `increment_reopen_request` with **no** cast — the house already shows the target form.)
**Disposition:** Phase B — remove the cast, align to the reopen twin; typecheck canary. Keep the migration-absent runtime fallback untouched (that part is live-state-honest, not type-stale).

### TYPE-3 · LOW — The one genuinely-forced cast family: `flag_comments` has no Relationships entry
**Surface:** `src/lib/comments.ts:87-101,151-157,184-189` (3 casts, all documented) ← `src/types/database.ts:200+` (`Relationships: EmptyRelationships`).
**Evidence:** the embed select `users!flag_comments_user_id_fkey(display_name)` cannot typecheck without FK relationship metadata; the in-code comment names regeneration as the alternative. A hand-authored Relationships entry for the `flag_comments → users` FK (following the house's own type-not-interface gotcha) would retire all three casts and let the compiler see `RawCommentRow`.
**Disposition:** Phase B optional (medium fiddliness for a small win — postgrest-js relationship typing is finicky; the type-not-interface trap lives exactly here). Attempt behind the tsc canary; if it fights back, PARK with a note — the current casts are documented and honest.

## Verified CLEAN
- Nullability tells the truth where it matters: `FlagRow.user_id: string | null` (anon), comment author `ON DELETE SET NULL` modeled end-to-end (SR-117), optional columns each annotated with the migration that makes them real.
- No hand-maintained type contradicts a runtime shape found in any file read this run — the optionality annotations (`updated_at?`, `context_tags?`, reopen fields) are the honest encoding of the migrations-pending reality (the client-side cousin of KNOWN X-2, handled correctly here).
- `catch (e: any)` house allowance: used sparingly; most catches type-narrow via `errorMessage`/code probes instead.

**FINISHED** — lens 3 complete. 3 Low (two stale-cast retirements + one optional relationship-typing win). No lies found; two expired excuses.
