# Reconciliation Plan — `qa/auto-2026-05-29`
**Date:** 2026-05-29  
**Author:** Rory (DevOps, READ-ONLY audit mode — background loop active)  
**Branch:** `qa/auto-2026-05-29`  
**Target:** `origin/main` @ `259a034`  
**Merge base:** `04dd160` (docs(state): update PROJECT_STATE.md — merge wave 2026-05-29 complete)  
**Conflict file:** `supabase/functions/send-push-notification/index.ts`  
**Recommendation:** SALVAGE_CHERRYPICK — 5 of 7 commits have genuine value; 1 is divergent (drop in favour of main's superior version); 1 is genuinely new docs+state; 1 is a pure doc set that should land.

---

## 1. Branch anatomy

The branch diverged from main at `04dd160`, which is itself on main's history (the branch point is reachable from `origin/main`). After the branch point, **7 commits** exist exclusively on `qa/auto-2026-05-29`:

| # | SHA | Title | Files touched |
|---|-----|-------|---------------|
| 1 | `8e02302` | QA(heatmap): D5 test verification report — 79 tests passing | `DECISIONS_LOG.md`, 4 × `qa-reports/*.md` |
| 2 | `edb30a2` | fix(security): add caller auth gate to send-push-notification | `supabase/functions/send-push-notification/index.ts` |
| 3 | `1c4afd8` | fix(validation): validate lat/lng bounds in createFlag | `src/lib/flags.ts` |
| 4 | `022dd0b` | fix(privacy): remove email from updateUserProfile select | `src/lib/users.ts` |
| 5 | `7a05f1f` | fix(lint): void-annotate signOut call in ProfileScreen | `src/screens/ProfileScreen.tsx` |
| 6 | `ad11e0b` | fix(security): remove hardcoded Supabase project ref from apply-migrations.js | `apply-migrations.js` |
| 7 | `2a9bd86` | docs(qa): Steve security hardening report 2026-05-29 | `qa-reports/2026-05-29_Steve_SecurityHardening.md` |

---

## 2. Per-commit verdict

### Commit `8e02302` — D5 test verification report + DECISIONS_LOG entry
**Status: GENUINELY NEW — cherry-pick**

- `qa-reports/2026-05-29_Gary_D5_Tests.md` — not present on main. Keep.
- `qa-reports/2026-05-29_Gary_D8_Implementation.md` — not present on main. Keep.
- `qa-reports/2026-05-29_Jordan_D8_BranchSignoff.md` — not present on main. Keep.
- `qa-reports/2026-05-29_Morgan_BranchTriage_05-30set.md` — not present on main. Keep.
- `DECISIONS_LOG.md` addition (D5 heatmap gradient Sky decision) — main's `DECISIONS_LOG.md` has **no D5 entry** at all, even though the heatmap code itself landed via `3096f0f`. This log entry records Sky's explicit product decision and belongs on main. Keep.

Action: cherry-pick `8e02302` as-is (docs + state only; no code touched; no conflict risk).

---

### Commit `edb30a2` — add caller auth gate to send-push-notification
**Status: DIVERGENT — DROP; main's version is strictly superior**

Both `origin/main` and the branch independently fixed the same open endpoint (`8f24ba4` from 2026-05-25 had removed the auth gate). The race is clear from timestamps:

- Main: `e84f24d` committed **03:38:34 PDT** — restored auth with oracle fix + input length limits
- Branch: `edb30a2` committed **10:14:28 PDT** — added basic auth gate 6.5 hours later, unaware of `e84f24d`

**Main's implementation is strictly superior on every axis:**

| Dimension | Branch `edb30a2` | Main `e84f24d` |
|-----------|-----------------|----------------|
| Auth parsing | `header.split(' ')` — fragile | `auth.startsWith('Bearer ')` + slice — correct |
| Missing token response | Returns 404 — **token oracle** | Returns `200 {"status":"queued"}` — oracle-safe |
| Input size limits | None | title ≤ 150, body ≤ 300, data ≤ 1 KB |
| Fail-closed on missing env var | Yes | Yes |
| Steve-audited | Yes (edb30a2 is the A1 fix Steve mentions) | Yes (e84f24d = Steve A1 originally from 2026-05-26, restored) |

Resolution for the conflict: **take origin/main's file verbatim.** The branch's version of this file is an inferior duplicate. Do not apply any hunk from `edb30a2`.

---

### Commit `1c4afd8` — lat/lng bounds validation in createFlag
**Status: GENUINELY NEW — cherry-pick**

Main's `createFlag` at `origin/main:src/lib/flags.ts` line 554 begins the function immediately with `basePayload = { ... }` — no coordinate validation guards exist. The branch inserts:

```typescript
if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
  throw new Error('Invalid coordinates: lat and lng must be finite numbers.');
}
if (input.lat < -90 || input.lat > 90) { ... }
if (input.lng < -180 || input.lng > 180) { ... }
```

This is a trust-boundary validation that main lacks entirely. The flag creation rate-limit migration (`4de52a4`) that landed on main after the branch point does not cover coordinate validation. Genuine new value.

Action: cherry-pick `1c4afd8`. No conflict risk (the `createFlag` function signature is unchanged on main).

---

### Commit `022dd0b` — remove email from updateUserProfile select
**Status: GENUINELY NEW — cherry-pick**

Main's `src/lib/users.ts` line 45 still contains:
```typescript
.select('id, email, display_name, avatar_url, points, created_at')
```

The branch changes this to:
```typescript
.select('id, display_name, avatar_url, points, created_at')
```

with an explanatory comment noting the 2026-05-27 email-privacy migration revokes column-level access. This is a privacy correctness fix — selecting `email` post-migration would silently return `null`, which is confusing. The UI reads email from the auth JWT via `useAuth()` anyway.

Action: cherry-pick `022dd0b`. No conflict risk.

---

### Commit `7a05f1f` — void-annotate signOut in ProfileScreen
**Status: GENUINELY NEW — cherry-pick**

Main's `ProfileScreen.tsx` at the `signOut` call site (around line 1297) has:
```typescript
if (ok) signOut(user?.id);
```

The branch adds:
```typescript
// void: signOut is best-effort; errors are already logged inside
// the helper. We don't await here to avoid blocking the sign-out
if (ok) void signOut(user?.id);
```

Main has `void` applied in many other call sites in the same file (lines 370, 397, 428, 496, 514) but this one was missed. The fix silences the float-promise lint rule and documents intent.

Action: cherry-pick `7a05f1f`. Low conflict risk — ProfileScreen received design changes after the branch point (`97c085f`, `3c30d1e`) but the signOut button region is in a stable scroll view and the surrounding structure is unlikely to have moved. If a line-number conflict arises during cherry-pick, the resolution is trivial: find the `if (ok) signOut(user?.id)` line and prepend `void `.

---

### Commit `ad11e0b` — remove hardcoded Supabase project ref from apply-migrations.js
**Status: GENUINELY NEW — cherry-pick**

Main's `apply-migrations.js` line 33 still contains the literal project ID:
```
console.log('   2. Select project: kldlwszpfkdmsjrjhjym');
```

The branch replaces it with:
```
console.log('   2. Select your Supabase project (URL from EXPO_PUBLIC_SUPABASE_URL in .env)');
```

While `kldlwszpfkdmsjrjhjym` is not a secret key, embedding infrastructure identifiers in committed scripts is unnecessary and creates a maintenance burden when the project changes. The fix is correct and the file has no other modifications on main since the branch point.

Action: cherry-pick `ad11e0b`. No conflict risk.

---

### Commit `2a9bd86` — Steve security hardening report
**Status: GENUINELY NEW — cherry-pick**

`qa-reports/2026-05-29_Steve_SecurityHardening.md` does not exist on main (main has `2026-05-30_Steve_SecurityHardening.md` which is a *different* report covering different fixes: flag rate limit migration, iOS plist keys). The branch report covers the auth gate fix (`edb30a2`), lat/lng validation, email select cleanup, and the hardcoded project ref — providing Steve's sign-off rationale for all four.

Note: even though `edb30a2` itself is being dropped (main's version supersedes it), the Steve report still belongs on main as an audit trail of Steve's independent discovery and reasoning about the same H1 vulnerability.

Action: cherry-pick `2a9bd86`. No conflict risk (new file).

---

## 3. Conflict resolution for `supabase/functions/send-push-notification/index.ts`

**Conflict type:** DIVERGENT — both sides added auth independently from the same unauthenticated base.

**Resolution:** Take **origin/main's version entirely.** The branch's hunk from `edb30a2`:
- Uses inferior `split(' ')` auth parsing
- Returns 404 for missing push token (push-token oracle vulnerability)
- Lacks input length limits

Do not apply any line from `edb30a2` to the final file. After rebasing the 6 keepers onto `origin/main`, this file will already be at main's superior version and needs no further edit.

---

## 4. Ordered cherry-pick recipe

The rebase must skip `edb30a2`. Recommended sequence on a new branch off `origin/main`:

```
# Step 1 — create the reconciliation branch (executed by whoever holds write authority)
git checkout -b rory/recon-qaauto-2026-05-29 origin/main

# Step 2 — cherry-pick the 6 keepers in chronological order
git cherry-pick 8e02302   # D5 qa-reports + DECISIONS_LOG
# (skip edb30a2 — DROPPED)
git cherry-pick 1c4afd8   # lat/lng validation
git cherry-pick 022dd0b   # remove email from users select
git cherry-pick 7a05f1f   # void signOut lint fix
git cherry-pick ad11e0b   # remove hardcoded project ref
git cherry-pick 2a9bd86   # Steve security hardening report

# Step 3 — run CI gate before raising for merge
#   typecheck, lint, tests must all pass
```

If `7a05f1f` produces a context conflict (ProfileScreen changed post-branch-point), the resolution is: find the `if (ok) signOut(user?.id);` line in the file and change it to `if (ok) void signOut(user?.id);`. No other lines in that commit change.

---

## 5. Summary verdict

**SALVAGE_CHERRYPICK** — the branch has genuine value and should not be abandoned.

| Commit | Disposition | Rationale |
|--------|------------|-----------|
| `8e02302` | KEEP — cherry-pick | New qa-reports + D5 decision log entry absent from main |
| `edb30a2` | DROP | Divergent; main's auth gate (oracle fix + limits) is strictly superior |
| `1c4afd8` | KEEP — cherry-pick | Lat/lng coordinate validation not on main |
| `022dd0b` | KEEP — cherry-pick | Email column removal from users select not on main |
| `7a05f1f` | KEEP — cherry-pick | void signOut annotation not on main at that call site |
| `ad11e0b` | KEEP — cherry-pick | Hardcoded project ref still in main's apply-migrations.js |
| `2a9bd86` | KEEP — cherry-pick | New Steve audit report, different scope from 2026-05-30 report |

**Net result:** 6 commits to land, 1 to drop, zero conflict in the cherry-pick path (the only conflict file is the one we drop).

---

## 6. Decisions for Sky

None required — no privacy-sensitive changes, no DB writes, no external sends. All 6 keepers are in-code/docs changes within Rory's merge authority (subject to Gary audit gate as per Rory Elevated Authority through 2026-05-30). Morgan should route this to Will or Gary for a quick pre-merge test-pass confirmation before Rory executes the cherry-pick.
