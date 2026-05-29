# Security Scan — Track A/B New Files
**Author:** Steve  
**Date:** 2026-05-29  
**Scope:** `.github/workflows/`, `.github/dependabot.yml`, `.github/pull_request_template.md`, and `src/lib/` files modified today  
**Status:** COMPLETE — findings below, no code changes made

---

## Summary

| Area | Status | Severity |
|---|---|---|
| `ci.yml` | ✅ Clean | — |
| `eas-build.yml` | ⚠️ Minor issues | LOW |
| `eas-testflight-submit.yml` | ⚠️ Issues | LOW–MEDIUM |
| `dependabot.yml` | ⚠️ Gap | INFO |
| `pull_request_template.md` | ✅ Clean | — |
| `eas.json` | 🔴 PII in repo | MEDIUM |
| `app.json` | ✅ Clean | — |
| `src/lib/pushNotifications.ts` | ✅ Clean | — |
| `src/lib/watchedFlagsFilter.ts` | ✅ Clean | — |
| `supabase/migrations/2026-05-29_function_search_path_hardening.sql` | ✅ Clean (PROPOSE-ONLY, good work) | — |

---

## Findings

### 🔴 MEDIUM — `eas.json`: Personal email + Apple Team ID committed to repo

**File:** `eas.json` lines 32–34

```json
"appleId": "skylerhalisky@gmail.com",
"ascAppId": "TODO_ASC_APP_ID",
"appleTeamId": "S78F8ZA8QU"
```

- `skylerhalisky@gmail.com` — Sky's personal email is PII committed to version control (and thus git history). Not a credential, but it will be indexed by GitHub if the repo is ever made public.
- `appleTeamId: S78F8ZA8QU` — Apple Team IDs are semi-public (they appear in provisioning profiles), but committing them to version control is avoidable. It's not a secret per se, but combined with the email it narrows the attack surface for social engineering against Sky's Apple Developer account.

**Recommendation:** Move `appleId` and `appleTeamId` out of `eas.json` and into GitHub Secrets (already done for `APPLE_TEAM_ID` in the workflow — just need `eas.json` to reference `$APPLE_TEAM_ID` via env). The `eas.json` `submit.production` block can be omitted or use placeholder values; EAS CLI picks up env vars at submit time.

**Note for Jordan:** personal email in git history is PII — flag for Jordan to review per the privacy gate.

---

### LOW — `eas-testflight-submit.yml`: Apple ID password in CI

**File:** `.github/workflows/eas-testflight-submit.yml` line 62

```yaml
EXPO_APPLE_PASSWORD: ${{ secrets.EXPO_APPLE_PASSWORD }}
```

The secret itself is stored correctly (not hardcoded). However, Apple ID passwords have broad account access — they can manage devices, change account settings, etc. The recommended replacement is an **App Store Connect API Key** (narrower scope, revocable independently):

```yaml
# Recommended replacement in eas-testflight-submit.yml:
EXPO_ASC_KEY_ID: ${{ secrets.EXPO_ASC_KEY_ID }}
EXPO_ASC_ISSUER_ID: ${{ secrets.EXPO_ASC_ISSUER_ID }}
EXPO_ASC_KEY_P8: ${{ secrets.EXPO_ASC_KEY_P8 }}
```

EAS submit supports API keys natively. Not a blocker for current dev use, but should be addressed before production release.

---

### LOW — `eas-testflight-submit.yml`: Mutable action tag (supply chain)

**File:** `.github/workflows/eas-testflight-submit.yml` line 68

```yaml
uses: softprops/action-gh-release@v1
```

`v1` is a mutable tag — if the action is compromised, the `v1` tag can be moved to the malicious commit and all workflows silently pick it up. Should be pinned to a full SHA:

```yaml
uses: softprops/action-gh-release@v2  # or pin to SHA: softprops/action-gh-release@<sha>
```

---

### LOW — All workflows: No explicit `permissions:` declarations

None of the three workflow files declare a `permissions:` block. GitHub's default `GITHUB_TOKEN` permissions are `read` on most scopes and `write` on `contents`/`metadata` (when not a fork). For least privilege:

- `ci.yml`, `eas-build.yml` — should add `permissions: { contents: read }` at the workflow level (no writes needed).
- `eas-testflight-submit.yml` — the release step needs `contents: write`; all other steps only need `read`. Should scope explicitly.

```yaml
# Add near the top of each workflow, after `on:`:
permissions:
  contents: read
```

For `eas-testflight-submit.yml`, scope only the release job:
```yaml
jobs:
  build-and-submit:
    permissions:
      contents: write
```

---

### INFO — `eas-build.yml`: Triggers on all branches (`'**'`)

Every push to every branch triggers an EAS build attempt. The `EAS_TOKEN` guard (`if: env.EAS_TOKEN != ''`) prevents the actual build step from running if the secret isn't set — that guard is correct. However:

- Any contributor with push access can trigger builds (consuming EAS build minutes).
- The job still starts and runs typecheck/tests even when EAS_TOKEN is absent.

Not a secrets-exposure issue, but worth noting for cost control. Consider restricting to `main` and `phase*` patterns if this becomes noisy.

---

### INFO — `dependabot.yml`: No `github-actions` ecosystem monitoring

```yaml
updates:
  - package-ecosystem: npm  # only
```

The actions used in workflows (`actions/checkout@v4`, `actions/setup-node@v4`, `softprops/action-gh-release@v1`) won't get automated Dependabot PRs for updates. Add:

```yaml
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

---

## Clean Items (no issues)

- **`ci.yml`** — No hardcoded secrets. Uses `${{ secrets.* }}` nowhere (no secrets needed). Pinned action versions (`@v4`). The soft-fail lint pattern is a quality concern, not a security one.
- **`pull_request_template.md`** — No internal IPs, env names, tokens, or credentials. The security and privacy gate checklists are good hygiene.
- **`app.json`** — EAS `projectId` (`a7149107-...`) is expected to be public (analogous to an OAuth client ID). Bundle identifier and permission strings are standard.
- **`src/lib/pushNotifications.ts`** — No hardcoded secrets. Uses `supabase` client correctly (credentials via env). Explicit privacy comments about not logging push tokens. PIPEDA-aware. Clean.
- **`src/lib/watchedFlagsFilter.ts`** — Pure filter function. No secrets, no external calls. Clean.
- **`supabase/migrations/2026-05-29_function_search_path_hardening.sql`** — Correct remediation for Supabase `0011_function_search_path_mutable` advisory. Correctly targets the `SECURITY DEFINER` function (`handle_flag_status_change`) as highest priority. Propose-only header is present and correct. No issues.

---

## Decisions for Sky

1. **`eas.json` email/Team ID** — Remove `skylerhalisky@gmail.com` and `S78F8ZA8QU` from `eas.json` and use GitHub Secrets instead. This also means removing them from git history (a `git filter-repo` or `BFG` run). Worth doing before any repo visibility change.

2. **Apple ID password vs. API key** — Switching `EXPO_APPLE_PASSWORD` to App Store Connect API keys is the right long-term move. Low urgency for private dev use; higher urgency before public release.

3. **Search path migration** — Dana's `2026-05-29_function_search_path_hardening.sql` is correct and safe. Recommend Sky apply it at next maintenance window.
