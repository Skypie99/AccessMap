# Security & Code-Quality Hardening Pass — 2026-05-25

Scope: a focused security / safety / clean-code review of both projects —
**AccessMap** (Expo/React Native + Supabase) and the **Prompt Library Tool**
(Next.js static export). Read-only audit of the live code. Lens was narrow on
purpose: safety, security, and maintainability — not features, performance, or UX.

---

## Summary

- **Changes committed this run: 0 — on purpose, for two reasons.**
  1. **Everything genuinely actionable is in the "propose-only" zone.** The real
     findings live in Supabase RLS/SQL, an Edge Function that runs with the
     service-role key, and security configuration — exactly the high-blast-radius
     areas the safe workflow says to *propose with exact steps*, never auto-apply
     in an unattended run. The one ordinary code bug I went looking for
     (`severityColor` with no default branch) is **already fixed**.
  2. **I couldn't run the verification toolchain in this run's environment.** The
     safe workflow's hard rule is "keep a change only if `tsc --noEmit` stays
     green and tests pass." In this sandbox the Prompt Library's typecheck can't
     go green and neither project's tests can run — not because of your code, but
     because the installed `node_modules` are macOS-native and one of them is
     polluted with duplicate files (details in **Verification**). Rather than
     commit changes I can't prove are safe, I'm handing them to you as exact
     diffs to apply and verify locally, where the toolchain works.

- **The good news first:** the things most likely to hurt a public app are
  already handled well. AccessMap's RLS is sound and **not weakened**; the
  Prompt Library's markdown renderer has **no XSS surface**; and untrusted JSON
  import is validated at the boundary. See *Already solid* below.

- **Most important new finding:** the `notify-flag-status` Edge Function runs
  with the **service-role key** (which bypasses RLS) but does **no caller
  authentication and no input validation**. Worth hardening before you rely on
  it. (Severity: High.) See **A1**.

- **Second new finding:** points can be **farmed** by toggling a flag's status
  back and forth, because the award trigger isn't idempotent and the triage RLS
  policy allows unrestricted status transitions. (Severity: Medium.) See **A2**.

---

## Already solid (verified, no action needed)

**AccessMap**
- **RLS is the real enforcement layer and it holds up.** The community-triage
  policy (`flags status update by any authenticated`) correctly freezes every
  non-`status` column by comparing the new row to a subselect, so a non-owner
  can change *only* `status` and nothing else. The `(select auth.uid())` initplan
  rewrite is applied. `push_tokens` and `flag_status_history` RLS are correctly
  owner-scoped / maintainer-scoped. The two `security definer` trigger functions
  have direct RPC `execute` revoked from `anon`/`authenticated`. Storage
  upload/delete are scoped to the user's own `auth.uid()` folder.
- **Photo upload (`uploadFlagPhoto`)** validates URI scheme, extension, and byte
  size, *rejects* `http(s)://` sources (so it can't be tricked into re-uploading
  a remote image), and writes to the exact `<userId>/<timestamp>.<ext>` path the
  Storage RLS policy requires.
- **No secrets leak.** `.env` is gitignored and untracked; only `.env.example`
  (empty placeholders) is committed. The service-role key is referenced only by
  env-var name inside the Edge Function — never hardcoded.
- The previously-documented dead `extra` block in `app.json` is **already gone**.

**Prompt Library**
- **Markdown rendering has no XSS surface.** `Markdown.tsx` / `markdown.ts` build
  a typed AST and render it as React elements (auto-escaped) — there is no
  `dangerouslySetInnerHTML` anywhere in the render path, and links pass a
  protocol allowlist (`https:` / `http:` / `mailto:`) with `rel="noreferrer
  noopener"`. This is the right design for streaming model output.
- **Import is validated at the trust boundary.** `parseImport` rejects malformed
  JSON / wrong shape / future versions, validates each prompt and run, silently
  drops corrupt sub-entries (counted in `droppedCount`), and forces
  `isSeed:false` on import.
- **`library.ts` closed its known gaps:** writes return a structured
  `StorageWriteResult` (no silent data loss), IDs use `crypto.randomUUID()` with
  a strong fallback (collision risk gone), and dates are normalized to ISO
  (`normalizeIsoDate`) so sorting is stable.
- `.env*.local` is gitignored; no key material is committed (the `sk-ant-…`
  matches are a placeholder and test fixtures).

---

## Proposals — AccessMap (nothing applied; apply + verify locally)

### A1 · [High] Edge Function `notify-flag-status` has no caller auth and no input validation
**File:** `supabase/functions/notify-flag-status/index.ts`

**What's wrong.** The function creates a client with the **service-role key**
(bypasses RLS) and then trusts the request body completely:

```ts
const { record } = await req.json();
if (!['verified', 'resolved'].includes(record.status)) { ... }
```

Two problems:
1. **No caller verification.** Supabase Edge Functions are publicly reachable.
   If this is deployed without `verify_jwt` or a shared-secret check, anyone who
   knows the URL can POST a crafted `record`. They can't read a user's push
   token (it's fetched server-side and never returned), but they **can spam
   arbitrary users with notifications**, and the `'sent'` vs `'no token'`
   response is a **user-enumeration oracle** (it reveals which `user_id`s have
   notifications enabled).
2. **No input validation.** If `record` is missing/not an object,
   `record.status` throws and the function 500s. A trigger/webhook should fail
   *safely*, not crash.

**Why this is propose-only.** It touches a service-role security boundary and
only takes effect on `supabase functions deploy`, plus it needs a new secret —
all in the propose-only zone for an unattended run.

**Exact fix (hardened version):**

```ts
// DO NOT log push tokens — they are device identifiers (PIPEDA personal information).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // service-role bypasses RLS
);

// Shared secret set as a Function secret (see steps below). The DB webhook
// must send it in this header. Reject anything that doesn't match.
const EXPECTED_SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET')!;
const ALLOWED = new Set(['verified', 'resolved']);

Deno.serve(async (req) => {
  // 1. Caller auth — constant-ish comparison; reject unknown callers.
  if (req.headers.get('x-webhook-secret') !== EXPECTED_SECRET) {
    return new Response('forbidden', { status: 403 });
  }

  // 2. Validate input shape before touching anything.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const record = (body as { record?: Record<string, unknown> } | null)?.record;
  if (!record || typeof record.user_id !== 'string' || typeof record.status !== 'string') {
    return new Response('bad request', { status: 400 });
  }

  if (!ALLOWED.has(record.status)) return new Response('ok', { status: 200 });

  const { data: tokenRow } = await supabase
    .from('push_tokens').select('token').eq('user_id', record.user_id).single();
  if (!tokenRow) return new Response('ok', { status: 200 }); // same body as success — no oracle

  const message = {
    to: tokenRow.token,
    title: 'AccessMap',
    body: `Your ${typeof record.category === 'string' ? record.category : ''} flag was ${record.status}.`.replace('  ', ' '),
  };
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
  } catch {
    // Expo unreachable — don't 500 the webhook; the status change already happened.
    return new Response('ok', { status: 200 });
  }
  return new Response('ok', { status: 200 });
});
```

**Steps to apply:**
1. Supabase Dashboard → Edge Functions → Secrets → add `NOTIFY_WEBHOOK_SECRET`
   to a long random value (e.g. `openssl rand -hex 32`).
2. Wherever the function is invoked (Database Webhook / trigger), add the header
   `x-webhook-secret: <that value>`.
3. Replace the function body with the version above and
   `supabase functions deploy notify-flag-status`.
4. (Optional, stricter) If only the DB webhook should call it, you can also leave
   `verify_jwt` on and inject the secret — the shared-secret check is the part
   that closes the public-spam/oracle hole.

---

### A2 · [Medium] Points can be farmed by toggling a flag's status
**Files:** `supabase/schema.sql` (`handle_flag_status_change`) +
the triage policy `flags status update by any authenticated`.
**Status: appears undocumented** (the existing notes mention UI toggle races and
*migration* idempotency, not award idempotency).

**The exploit.** The award trigger gives the reporter `+5` every time a flag goes
`open → verified` and `+10` on `→ resolved`, and an actor bonus to whoever made
the change. The triage RLS policy allows **any** authenticated user to set
**any** status with no forward-only constraint. So two accounts (or one person
with two) can loop a single flag `open → verified → open → verified …`; each
`open → verified` re-awards points. There's no cap, so the leaderboard / points /
reputation tiers can be inflated arbitrarily.

**Why propose-only.** It's a trigger + RLS change (schema).

**Recommended fix (sketch — refine against your live schema):** make the award
**idempotent and forward-only**. The cleanest lever is the new
`flag_status_history` audit table (A3 / the status-history migration): award only
the *first* time a flag reaches a given milestone.

```sql
-- inside handle_flag_status_change(), before awarding:
if exists (
  select 1 from public.flag_status_history
  where flag_id = new.id and to_status = new.status
) then
  return new;  -- already credited for reaching this status once
end if;
```

Optionally also forbid backward transitions in the triage policy (e.g. only
allow `open→verified`, `open→resolved`, `verified→resolved`, `*→rejected`) so the
loop can't even be set up. Verify with a two-account smoke test: B verifies A's
flag (A +5, B +2 once), B sets it back to open then verified again (no further
points).

---

### A3 · [Medium] Status-history client query doesn't match the privacy view
**File:** `src/lib/flags.ts` → `listFlagStatusHistory` (+ `FlagStatusHistoryEntry`).

The privacy fix for status history (correctly) hides `user_id` behind a
`flag_status_history_public` **view** with columns
`id, flag_id, from_status, to_status, created_at`, and **revokes** table-level
`SELECT` from `authenticated`. But the client still queries the **raw table**
with the **old column names**:

```ts
.from('flag_status_history')
.select('old_status, new_status, changed_by, changed_at')
```

Two consequences once the migration is applied:
1. **The feature silently returns nothing** for normal users — the raw-table
   grant is revoked, and the column names don't exist there anyway, so the query
   errors and the code's catch returns `[]`.
2. **Privacy footgun:** the client references `changed_by` — the exact attribution
   column the design deliberately hides. If someone "fixes" the broken feature by
   re-granting raw-table access, they'd leak it.

**Fix (apply together with the status-history migration):**

```ts
export interface FlagStatusHistoryEntry {
  from_status: string | null;
  to_status: string;
  created_at: string;
}
// ...
const { data, error } = await supabase
  .from('flag_status_history_public')
  .select('from_status, to_status, created_at')
  .eq('flag_id', flagId)
  .order('created_at', { ascending: true });
```

Then update the `StatusHistoryModal` field references accordingly. (Flagged, not
applied, because it's coupled to the propose-only migration and I can't run
AccessMap's tests here to confirm the modal still renders.)

---

### A4 · [Quick win] Enable leaked-password protection
Supabase Dashboard → Authentication → Providers/Policies → enable the
**HaveIBeenPwned** "leaked password protection." One toggle; blocks sign-ups/
password changes that use known-breached passwords. (Advisor item.)

### A5 · [Decision, not a bug] `flag-photos` is a public-read bucket
Every photo URL is world-readable once known, and flags carry **precise lat/lng
tied to a user** — that combination is privacy-sensitive for a civic app. This
may be intentional (thumbnails should load without auth). Decide consciously:
keep public-read, or switch to a private bucket served via signed URLs
(`createSignedUrl`, ~1h expiry) if photos should not be enumerable. Propose-only
(bucket visibility = security config).

### A6 · [Note] No content moderation / rate limiting
A public crowdsourced app with anonymous-ish triage has no abuse controls beyond
Supabase defaults. Pair with A2. Worth a small rate-limit and a report/flag-abuse
path on the roadmap (trust & safety).

---

## Proposals — Prompt Library (nothing applied; apply + verify locally)

### P1 · [Low–Med] `loadSettings` doesn't clamp `maxTokens` (validation at a trust boundary)
**File:** `src/lib/settings.ts`. This is the small, safe fix I *would* have
committed if the toolchain could run here — and the test suite already
anticipates it (`settings.test.ts` pins the current gap and says to flip the test
when clamping lands).

`SettingsModal` clamps on **save** to `[256, 8192]`, but `loadSettings` accepts
any finite value from `localStorage`. A hand-edited or legacy value (negative,
`0`, `1e9`) loads unvalidated and is sent straight to the API. Mirror the clamp
on load:

```ts
export const MIN_MAX_TOKENS = 256;
export const MAX_MAX_TOKENS = 8192;

export function clampMaxTokens(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_MAX_TOKENS, Math.max(MIN_MAX_TOKENS, Math.round(n)));
}

// in loadSettings():
const rawMax = localStorage.getItem(STORAGE_KEYS.maxTokens);
const parsedMax = rawMax ? Number(rawMax) : NaN;
const maxTokens = Number.isFinite(parsedMax) ? clampMaxTokens(parsedMax) : DEFAULT_MAX_TOKENS;
```

Then flip the "known gap" test in `settings.test.ts` (stored `"1000000000"`
should now expect `8192`) and add a lower-bound case (`"-5"` → `256`). Optional
clean-up: have `SettingsModal` import `MIN_MAX_TOKENS`/`MAX_MAX_TOKENS` instead of
hardcoding `256`/`8192`, so the bounds can't drift.

### P2 · [Low] Add a Content-Security-Policy (defense-in-depth)
There's no CSP. The API key lives in plaintext `localStorage`; the markdown
renderer is XSS-safe today, but a CSP is cheap insurance if a future dependency
introduces a sink. For a static export, add a `<meta>` CSP in
`src/app/layout.tsx` `<head>` (tune to what the app actually loads):

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self'; connect-src 'self' https://api.anthropic.com;
           img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'" />
```

Test the production build (`npm run build && npm run preview`) since a too-strict
CSP can break the no-flash theme script. Propose-only (security config).

### P3 · [Option] Offer a session-only API key
Today the key persists in `localStorage`. A "don't remember my key" option that
keeps it in memory only (cleared on tab close) is a reasonable choice for users
on shared machines. Small additive feature — your call on priority.

---

## Verification

| Project | `tsc --noEmit` | Tests | Notes |
|---|---|---|---|
| AccessMap | **PASS** (0 errors) | **Could not run** | `node_modules` ships `lightningcss-darwin-arm64` (macOS-only); sandbox is `linux arm64`. |
| Prompt Library | **FAIL** (4 errors) | **Could not run** | All 4 errors are `TS2688` for `babel__* 2` — i.e. **113 duplicate `" 2"` directories** in `node_modules` (a macOS file-copy artifact), not your source. Tests need `rollup-darwin-arm64`; sandbox is Linux. |

- **Commits this run: 0. Branches created: 0. Nothing to merge.**
- Working trees were also non-clean (both on feature branches with untracked
  `qa-reports/*.md`) and the repos show heavy concurrent automation (AccessMap
  ~51 branches/108 reports; Prompt Library ~29 branches) — another reason an
  unattended run should not add commits into that churn without a verifiable
  green baseline.

---

## Environment / repo-hygiene note (worth a one-time cleanup)
1. **Prompt Library `node_modules` is polluted** with 113 `" 2"` duplicate
   directories (macOS copy/sync artifact). They break `tsc`. A clean reinstall
   fixes it: `rm -rf node_modules && npm install`.
2. **These `node_modules` were installed on macOS.** Any unattended QA runner on
   Linux can't run the test/build steps (platform-native binaries: rollup,
   lightningcss, esbuild). For the scheduled audit to actually *fix and verify*,
   it needs either a fresh platform-correct install in its own environment or to
   run on macOS. Until then, scheduled runs can audit and propose but can't
   safely commit.

---

## Two forward-looking suggestions
1. **Make the typecheck/test ship-gate real in CI.** Both repos have
   `.github/` workflows — make sure they run `npm ci` (clean install) +
   `npm run typecheck` + `npm test` on every push/PR. That gives each QA branch a
   trustworthy green/red signal independent of any local machine, and it would
   have caught the `node_modules` pollution above.
2. **Codify AccessMap's "award once, forward-only" invariant.** The whole
   community-triage model's integrity rests on it (see A2). Making point awards
   idempotent (keyed on `flag_status_history`) and constraining status
   transitions turns a soft, exploitable rule into an enforced one — the kind of
   thing that gets much harder to retrofit after real users and a leaderboard
   exist.

---

## How to review
- Nothing was committed, so there's no branch to diff or merge this run.
- To apply any proposal: make the change locally, run `npm run typecheck`
  (and `npm test`) in that project, then commit on a branch you control.
- Re-run this audit once `node_modules` is reinstalled cleanly (and ideally in a
  Linux-compatible environment) and it'll be able to commit the verifiable fixes
  (starting with P1) instead of only proposing them.
