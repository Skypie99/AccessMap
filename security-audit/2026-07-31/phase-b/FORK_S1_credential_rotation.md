# FORK · S-1 — the reviewer credential that is public right now

**Finding:** S-1 (with S-2 as its process half) · **Severity:** HIGH
**Status:** ★ **FORK — Sky executes. No agent may perform any step of this.**
**Why a fork:** it involves rotating a live credential and, optionally, rewriting git history. Both
are irreversible and outside what an agent may do. This is the procedure; the hands are yours.

---

## The one-paragraph version

A working reviewer credential pair has been sitting in `origin/main` of a **public** GitHub repo for
**61 days**. The audit ledger says three separate times that this was fixed; it was not — the
2026-06-02 cleanup fixed the one file the finding cited and missed the credential table added in the
same commit. Live verification shows the exact published address does **not** resolve to an account,
so the leaked pair opens nothing as-is. But the *password string* is public, and a reviewer account
exists at a **one-character-different domain**.

**Rotate first. That is the only step that ends the exposure.** Everything else is hygiene.

---

## ★ THE ORDER MATTERS — do not reverse it

A secret found in history is dead the moment it leaked. Deleting files first *feels* like progress
and changes nothing: the repo is public, has been for two months, and you cannot know how many
clones, forks, scrapes and caches hold the string. **The string is compromised regardless of what
you do to the repo.** Only rotation makes it worthless.

### Step 1 — ROTATE (this is the fix)

The account lives in Supabase Auth, project `kldlwszpfkdmsjrjhjym`.

- If the reviewer account **is** needed: Dashboard → Authentication → Users → set a **new strong
  unique password**.
- If it is **not** needed yet: delete the account outright. App Store review credentials belong in
  **App Store Connect's review-notes field**, which is not a public repo.

★ **Do this even though the published address does not resolve.** Phase A verified the exact address
in the repo does not exist, but an account exists at a one-character-different domain, and anyone
reading the leak tries that variant first. Whether it opens depends on password reuse across the two
addresses — which could not be tested, because attempting a login is an active authentication
attempt, not a read. **Rotation costs a minute and settles it either way.**

★ **Do not reuse that password, or any variant of it, anywhere.**

### Step 2 — then purge the working tree (hygiene)

Six in-tree copies survive. Phase A and Phase B both deliberately left them, because purging before
rotating is theatre in the wrong order.

| # | File | Line | What it is |
|---|---|---|---|
| 1 | `docs/APP_STORE_REVIEWER_NOTES.md` | 8 | **The operational credential table — highest value.** The doc handed to Apple. |
| 2 | `QA_PLAN_SECURITY.md` | ~111 | Finding F5 quotes it |
| 3 | `qa-reports/2026-06-01_Security_Robustness_QA_Report.md` | ~88 | Finding 5 quotes it |
| 4 | `qa-reports/2026-06-02_Final_QA_Merge_Report.md` | ~112 | Rotation to-do quotes it |
| 5 | `qa-reports/cycle-2026-06-02-morgan-pretester-push-call.md` | ~17 | Push-call rationale quotes it |
| 6 | `qa-reports/2026-06-02_Steve_PreTester_Security_SignOff.md` | ~164 | **Quotes the password in the same sentence that declares it absent.** |

> ⚠️ Line numbers shifted slightly for #2, #3 and #6 — Phase B inserted dated correction notices
> above those entries (finding S-2). Re-grep rather than trusting the numbers.

For #1, replace the credential table with a pointer: *"Reviewer credentials live in App Store
Connect review notes. Never in this repo."*

For #2–#6 these are historical audit records. Replacing the value with
`<REDACTED — rotated 2026-07-31>` keeps the record readable, stops future greps re-flagging it, and
stops future readers re-learning the password. **Whether historical audit records may be edited in
place is your call** — that is why Phase B annotated them rather than redacting them.

Find them all with a shape-only grep that does not print the value:

```bash
git grep -lE '[A-Za-z]{6,}20[0-9]{2}!' -- '*.md'
```

### Step 3 — git history rewrite (optional, cosmetic, probably skip)

`git filter-repo` + force-push would remove the string from the six commits that carry it.

**Once step 1 is done this buys close to nothing, and it is not free:**

- it invalidates every one of the ~54 local branches — including the entire unmerged R2 stack, the
  ship-ready cars, and this Phase B branch;
- it breaks the 3 open dependabot PRs;
- GitHub retains unreferenced objects reachable by commit-SHA URL until garbage collection, so the
  string stays fetchable by anyone who noted a SHA.

**Recommendation: skip it.** Do step 1 properly. The password must be treated as permanently
compromised either way, and the rewrite trades real breakage for the appearance of cleanliness.

---

## What Phase B already did about this

- **S-2 corrected** — the four ledger entries that recorded this as fixed or as a false positive now
  carry dated corrections, and the two under-rated findings are re-rated LOW → HIGH. Historical text
  is annotated, never rewritten.
- **S-3 hardened** — the pre-commit hook now catches the shapes that actually leaked. The old rule
  required both a `=`/`:` delimiter and a quote character; the real leak is a markdown table row and
  a SQL comment, so the gate was live two days before the leak and did not fire. It also gained a
  rule for the new-format `sb_secret_*` key, which had no pattern at all.
- **Zero new copies created.** Verified: the Phase B diff adds no credential-shaped string, and the
  count in the working tree is still exactly 6.

## Still open after you finish

- **Q:** does the reviewer account at the `.com` address use the leaked password? Only you can
  answer; rotate regardless.
- **A-13** in the artifact packet — enable leaked-password protection, so a future weak or breached
  password is rejected at signup.
- Consider a CI-side secret scanner (gitleaks or trufflehog). The pre-commit hook is bypassable with
  `--no-verify` and does not run in CI: it is a speed bump, not a control.
