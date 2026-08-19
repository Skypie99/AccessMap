# COWORK PROMPT — App Store blocker 0.1: reviewer credential rotation

> Paste everything below the line into a fresh CoWork session on `~/AccessMap`.
> **Sky does the rotation herself first (steps A–C). The agent only does the cleanup (steps 1–5).**

---

## YOUR HANDS FIRST — do these three before firing the agent

**A.** Supabase dashboard → **Authentication** → find the App Store reviewer account → **set a new password**.
**B.** **Log in once** with the new pair to prove it works. (Rotating without testing just moves which credential is dead.)
**C.** Put the new pair **only** into App Store Connect → App Review Information → review notes. **Never back into a repo file, never into the chat, never into a commit.**

Then paste the prompt below.

---

# PROMPT — copy from here

Work on `~/AccessMap`. Task: purge the ROTATED-OUT reviewer credential from the repo. I have already rotated it in Supabase and placed the new pair in App Store Connect. The string now in the repo is DEAD, but it is still live in a **public** GitHub repo and has been for 60+ days, so it goes.

## HARD RULES — do not violate these

1. **Never print, echo, log, paste, or commit any credential value** — not the old one, not the new one, not in a commit message, not in your summary to me. Refer to it as "the credential." If you must confirm a match, report a line number, never the string.
2. **I will not give you the new password and you must never ask for it.** It exists only in App Store Connect now.
3. **Do NOT rewrite git history.** No `git filter-repo`, no force-push, no rebase to scrub. The old string is public forever — clones, forks, scrapes and caches already hold it. History rewriting breaks every clone and changes nothing about the exposure. This is a deliberate decision, not an oversight.
4. **Do not touch the live database.** Migrations are files. You do not run them.
5. **Work on a branch** (`security/reviewer-cred-purge`) and **do not merge or push to main.** I merge.
6. If any step is ambiguous, stop and ask rather than guessing — this is the estate's only live security exposure and a wrong move is worse than a slow one.

## THE WORK

**1. Find every in-tree copy of the credential VALUE.**
Start with the two known carriers:
- `docs/APP_STORE_REVIEWER_NOTES.md` (tracked; carries email + password)
- `supabase/migrations/2026-05-31_reviewer_test_account.sql` (tracked; likely embeds the password in the account-creation SQL)

Then sweep the rest of the tree for the literal value. Roughly a dozen other files *mention* the reviewer account (`DECISIONS_LOG.md`, `PROJECT_STATE.md`, `APP_STORE_TODO.md`, `TASK_GRAPH.json`, `QA_PLAN_SECURITY.md`, `docs/MASTER_FIX_LOG.md`, `docs/TESTFLIGHT_ACTION_ITEMS.md`, `security-audit/2026-07-31/*`, `specs/ready/*`) — **distinguish a reference from a copy.** A file that says "the reviewer account exists" is fine and stays. A file that contains the actual password is not. Report the two counts separately.

**2. Purge the values, keep the docs useful.**
Do not delete whole files. Replace each credential value with a pointer, e.g.:
> Reviewer credentials live in App Store Connect → App Review Information. They are deliberately not stored in this repo (rotated 2026-08-13).

For the SQL migration: it is a historical migration and may have already been applied. Do **not** delete it — that would corrupt the migration record. Replace the embedded literal with a placeholder and add a header comment explaining the credential was rotated out-of-band and the file is retained for provenance only. If removing the literal would make the migration non-runnable, say so explicitly rather than silently breaking it, and propose the alternative.

**3. Tighten the adjacent file permissions.**
```
chmod 600 ~/.app-store/itunes_service_key.txt && chmod -R go-rwx ~/.app-store/auth
```
Both are currently mode 644 / world-readable and have been since 2026-05-29. Confirm the new modes by listing them (permissions only — never contents).

**4. Prove the purge.**
- Re-run your sweep and show it returns zero value-matches.
- Confirm `npm run typecheck` and `npx jest --ci -w 3` still pass (the repo's gate law). Nothing here should touch code, so a failure means you changed something you shouldn't have.
- Confirm you did not stage anything under `.claude/` or `~/.claude/`.

**5. Add a guard so this cannot silently recur.**
Add `src/__tests__/noCredentialsInTree.guard.test.ts` following the house static-scan idiom (see `src/__tests__/dismissalStandard.guard.test.ts` for the pattern — comment-stripping, self-exclusion, drain-discipline allowlist). It should fail if a password-shaped literal reappears next to reviewer/demo-account language in any tracked file. Assemble any pattern strings at runtime so the guard cannot match itself. Make it non-vacuous: prove it fails by temporarily planting a fake value, then remove the plant.

## WHAT TO HAND BACK

A short report at `qa-reports/2026-08-13_Steve_ReviewerCredPurge.md` with:
- files that held a **copy** vs files that only held a **reference** (counts + names, no values)
- what changed in the SQL migration and whether it is still runnable
- the new permission modes
- guard test added + the proof it is non-vacuous
- the branch name and commit SHAs, and an explicit line saying **not merged, not pushed**
- anything you found and deliberately did NOT touch, with the reason

Do not message me anywhere except this session. Do not push. Do not merge.

# END PROMPT
