# 🍎 Flagstone → App Store — THE TO-DO LIST

> **Total: 4.6 hours to submittable · 5.3 hours to submittable-and-not-embarrassing.**
> Every single item is **your hands**. Zero agent work remains in this repo.
> Verified read-only against `~/AccessMap` on **2026-08-03**. `main` = `9964f8f` == `origin/main`.

**The one thing to understand:** this is not 5 hours of work, it's 5 hours *in a chain*.
Step 2 can't start until step 1 is done. Steps 3–7 can't start until step 2 makes a binary.
**The serialization is the risk, not the hour count.** Do steps 0 and 1 tonight and the rest can drift.

**Two clocks:** Apple's social-media questionnaire becomes mandatory for new apps **Sept 2026**.
Your medical leave ends **Thu 2026-09-17** — 45 days out. After that, these 5 hours compete with a job.

---

## 🔴 PHASE 0 — Tonight. 25 minutes. Do these before anything else.

### ☐ 0.1 — Rotate the reviewer credential (5 min) ★ START HERE

`docs/APP_STORE_REVIEWER_NOTES.md` carries a plaintext reviewer email **and password**, in a **public**
repo, on `origin/main`, live for **62+ days**. This one act closes **two** blockers at once:
the estate's only live security exposure, *and* Apple 2.1(a) (dead demo creds = automatic rejection).

1. Supabase dashboard → **Authentication** → find the reviewer account → set a new password.
2. **Log in once with the new pair** to prove it works. (Rotating without testing just moves which credential is dead.)
3. The new pair goes **only** into App Store Connect's review-notes field in step 4. **Never back into a repo file.**
4. *Then* purge the six in-tree copies (order matters — purge-before-rotate is theatre).

> **Skip the `git filter-repo` history rewrite.** The old string is public forever — clones, forks, scrapes
> and caches already hold it. Rewriting history force-pushes a public repo, breaks every clone, and changes
> zero about the exposure.

**Free adjacency while you're in credential-hygiene mode** — two files are world-readable (mode 644):

```bash
chmod 600 ~/.app-store/itunes_service_key.txt && chmod -R go-rwx ~/.app-store/auth
```

### ☐ 0.2 — Decide: filter on anonymous reports? (5 min)

**The hole:** `createAnonFlag` (`src/lib/flags.ts:1740`) **never calls** the blocked-term filter.
The only call site is line `1207`, inside `createFlag`. So the *entire* Apple 1.2(a) content filter
is bypassed by reporting anonymously — **which is exactly how an App Review reviewer will test it**,
because anonymous reporting is your headline feature.

It was found deliberately and **not** patched, because adding a filter to a submit path is a
moderation-policy change and those are yours to make.

**Morgan's rec: yes, ship it in v1.** It's one line. "We chose amber" is a defensible position;
"one function forgot to call another" is not the same claim.

→ Say the word and an agent lands the one-liner. **0.1 h to decide.**

### ☐ 0.3 — Fix one false sentence in the Terms (15 min)

`src/lib/copy.ts:621` says: *"You can delete your account any time in **Settings**."*
The control is on **Profile**. Your **live privacy policy already says "Profile > Delete Account"** —
I loaded it today to check. So two published documents currently contradict each other, in the
document Apple reads under Guideline 1.2.

A ready-to-paste prompt is already banked and unrun:
`design-reviews/a11y-qa/2026-07-31/COWORK-PROMPT_terms-deletion-fix.md`

### ☐ 0.4 — Make the version number legible (3 min)

`app.json` says `3.0.0`. `package.json` says `0.2.0`. Set both the same before you build so the
build provenance makes sense. `app.json` is the authoritative one (it's what ships).

---

## 🟠 PHASE 1 — The one merge. 10 minutes.

### ☐ 1.1 — Confirm nothing tracked is in flight

```bash
cd /Users/skypie/AccessMap && git status --porcelain | grep -v '^??' | head
```

*(Expect empty. There are 76 untracked paths — all `design-reviews/` artifacts. A checkout won't touch them.)*

### ☑ 1.2 — Fast-forward and push — ✅ **DONE 2026-08-07 (as a merge commit)**

**This step is complete. Do not run the command below** — it is kept only to record what changed.

`main` and `origin/main` are at merge commit **`2f7531c`**, which published **49 commits**: the
48-commit `codeqa/1-cleanup-2026-08-06` stack (security-B + ui-polish + the code-qa train + Q-1) plus
the merge commit itself. That stack supersedes both the 22-commit `ui-polish/accessmap-preship-2026-08-01`
plan below and the `d243b51` tip this section used to name.

**It was NOT a fast-forward.** `main` had moved two commits past the stack's base — `f8aa4f6` (the
credential redaction) and `d8630d4` (the reviewer-email fix) — so `--ff-only` was impossible. A rebase
was tested in a scratch worktree first and conflicted at commit 7 of 48, which would also have rewritten
all 48 SHAs that the code-qa reports cite. A merge commit resolved the one conflict once and kept every
commit byte-identical.

**The conflict was load-bearing:** `qa-reports/2026-06-02_Steve_PreTester_Security_SignOff.md` — the
scrub redacted a line the stack's S-2 commit was correcting. Resolved to keep both (the S-2 correction
block **and** the `[REDACTED]` line); merging it unresolved would have re-published the reviewer
credential to a public repo. Publicity scan on the staged merge: **0 secret-bearing added lines across 129 files.**

Gates on merged `main`: `tsc` exit 0 · jest **199 suites / 2939 passed / 32 todo / 0 failed**.

**Rollback if anything looks wrong:** `git reset --hard d8630d4` (plus the stack is preserved at
`backup/codeqa-stack-2026-08-07` @ `7d83998`) — **not** the stale `9964f8f`.

> **Note on 0.2 above:** Q-1 (the owner-**edit** 1.2(a) filter) was ruled YES and shipped in this stack
> as `7d83998`. The **`createAnonFlag` anonymous-path hole in §0.2 is still open and still yours** —
> it is a different call site and a moderation-policy decision.

### ☐ 1.3 — (Optional, 2 min) Delete two dead branches

```bash
cd /Users/skypie/AccessMap && git branch -D fix/tasksflagcard-date-flake fix/noscript-fallback
```

`fix/tasksflagcard-date-flake` would **delete 6 live tests** if merged (main has 18 `it()` blocks,
the branch has 12) — the flake it fixes is already fixed on main by a better mechanism.
`fix/noscript-fallback` is one string on the web build, 225 commits behind, on a surface Apple never sees.

> ⚠️ **Never run a bare `git gc` in this repo.** It holds 202 dangling commits. Deleting branches is safe;
> garbage-collecting after it is not.

---

## 🔵 PHASE 2 — The hinge. 30 minutes, mostly waiting.

### ☐ 2.1 — The first EAS build

```bash
cd /Users/skypie/AccessMap && npx eas-cli build --platform ios --profile testflight
```

**Use the `testflight` profile, not `preview`** — `preview` produces an internal link, not a TestFlight build.

**Why this is the hinge:** *no binary-launch evidence has ever existed for this app.* Not once.
Everything after this step is downstream of a binary existing; everything before it is 30 minutes of your hands.
The distance between "an app with 2,891 passing tests" and "an app that has never been proven to launch"
is exactly one command.

Local simulator builds are currently broken (the `fmt` pod vs Xcode 26.6), so there is **no cheaper tier
that would have caught a launch defect.** This is the step most likely to surprise you — which is precisely
why it should happen early, not the night before you submit.

---

## 🟢 PHASE 3 — Device, forms, ship.

### ☐ 3.1 — One device sitting (~1 hour)

Follow `design-reviews/a11y-qa/2026-07-31/DEVICE-SCRIPT.md §C` — it was written as the honest 80/20.
**Start with D-B6**, end on the 10-line TestFlight smoke script.

> **Line 4 of that script matters more than the other nine combined:** an anonymous report, end to end.
> It is the first proof this app can write to production *at all*.

### ☐ 3.2 — App Store Connect forms (~90 min)

Answers are pre-written in `design-reviews/ship-ready/04_appstore_readiness.md §A-Sheet-A / §A-Sheet-B`.

- Privacy nutrition labels — *(worth a Jordan read-through first: this is a binding public declaration covering precise location)*
- Age rating — **expect 13+**. Answer honestly; social-media = Yes is the correct answer for a public browsable map with comments, and 13+ is not a problem for this app.
- EU DSA trader declaration — *or* deselect the EU
- Metadata
- Review notes — the **new** creds from step 0.1, plus a **"Browse without an account"** line

✅ **Already checked for you:** your privacy policy URL (`https://skypie99.github.io/AccessMap/privacy/`)
**is live and serving** — a real policy, v1.1, dated 2026-07-31. That was the #1 automatic-rejection risk
on the list. It's closed.

### ☐ 3.3 — Accessibility Nutrition Labels (~25 min)

Declare **only** the rows step 3.1 actually verified. Realistically: VoiceOver · Larger Text ·
Dark Interface · Sufficient Contrast · Reduced Motion.
**Do not** declare Captions or Audio Descriptions (no media in the app).

Apple calls this optional. For *this* app an empty accessibility label is a credibility problem —
and it's the row a hiring manager notices.

### ☐ 3.4 — Screenshots (~60 min)

**iPhone 6.9″ and 6.5″ only.** `supportsTablet: false` retired the 13″ iPad set — verified in `app.json`.

### ☐ 3.5 — Submit. (10 min)

---

## ⚠️ ONE MORE THING WORTH 15 MINUTES

**The Admin tab renders for nobody — including you.**
`src/lib/admin.ts:27` does `.select('is_admin')`, but `is_admin` is not SELECT-able by `authenticated`.
Your content-takedown authority genuinely exists in SQL (applied and verified 2026-07-29) — but it's
exercised through a screen that renders for no account.

It **fails closed**, so nothing is exposed. But if a reviewer asks *"show me how you take content down,"*
the answer today is a screen that renders for nobody. One read-only grant check settles whether this is
still true; an agent can fix it cheaply once you decide.

**The Sentry mismatch.** Your live privacy policy says *"We use Sentry to capture crash logs"* and
*"30 days (via Sentry)."* But `src/lib/sentry.ts` is a **4-line no-op stub** — `// Sentry removed — re-add in Phase 6`.
Over-disclosure is the legally safe direction, but reviewers cross-read the policy against the nutrition
labels. Also worth knowing: **no crash reporting ships**, so a reviewer-side crash is invisible to you
post-submit. Knowingly accepted is fine. Unknowingly is not.

---

## 🚫 NOT ON THIS PATH — do not let these become gates

There are **33 open items** and ~14 honest hours of real work that **do not ship this app.**
Naming the big ones so they can't get smuggled in:

| Item | Why it's off the path |
|---|---|
| BP16 copy gate — 38 proposed string rows | 1.5 h of your per-string picks + a Jordan sign-off. **Apple does not read it.** |
| The nine fable-audit forks | Real product decisions. None gates a submission. |
| The "Flagstone" name collides with accessmap.io | Not an Apple blocker — but it's the one off-path item with a real deadline shape. A 1-hour conversation, cheapest *before* submission. |
| Server-side filter mirror (leg (a) → green) | Amber is honest, documented, defensible. Apple's 1.2 asks for a filter, not a perfect one. |
| Flag-level hide (leg (c) → green) | You scoped this out deliberately. Building a new destructive action weeks before submit, with no device tier to verify it, inverts the risk. |
| The 3-hour standing device backlog | `DEVICE-SCRIPT §C` is the honest 80/20. **Owed is not blocking.** |
| Prune 53 merged branches | Cheapest clarity win in the repo (0.25 h) — but do it *after* step 1, not before. |

---

_Sources: `~/career-arsenal/roadmap/2026-08-01/03_CRITICAL-PATH-APP-STORE.md` (Opus 5, 2026-08-02) ·
re-verified read-only by Morgan 2026-08-03 · full briefing at
`qa-reports/cycle-2026-08-03-morgan-appstore-distance.md`_
