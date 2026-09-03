# Lane E — Privacy / security static review (source-level)

Status: IN PROGRESS (written incrementally; each section is appended as it is completed).
Reviewer: Lane E read-only subagent. Worktree `/Users/skypie/AccessMap-deep-audit-20260902`.
CURRENT_MAIN = origin/main `70b52a30`. SUBMITTED_BUILD_33 = `f5594171` (113 commits ahead of main, not in main).
Production facts relied on (captured read-only by the lead, 2026-09-02): deployed Edge Functions = `send-push-notification`, `notify-flag-status`, `delete-account` (v4, 2026-05-31) ONLY. `delete-flag` and `account-deletion-*` NOT deployed. Applied migrations end at `20260830130000_promptb_media_key_read_contract`; `mod1*` (20260828040000–080000) and `d1f4r3_fix2` (20260828020000) NOT applied. `public.flags` still has `admin delete any flag` + `flags delete own` + `flags_user_scoped` FOR ALL; authenticated and anon hold the full default grant set on `flags`. authenticated has SELECT on `users.is_admin`, NO SELECT on `users.email`.

## Method + files read

- All reads via `git -C <worktree> show <sha>:<path>` / `sed` on the checked-out main worktree. No checkout, no network, no MCP, no production access.
- Line numbers cite the file at the named commit (`main:` = 70b52a30, `b33:` = f5594171). Snippets quoted ≤6 lines.
- Secrets policy: no secret values printed anywhere in this file; only file:line + pattern type.
- `.env` in the worktree is untracked (`git ls-files .env` → nothing; `.gitignore` lists `.env`), and contains only the two `EXPO_PUBLIC_*` keys (names checked, values not read).

Files read (running list, appended as reviewed):
