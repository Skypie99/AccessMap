# SECURITY AUDIT TRAIN — PHASE B CLOSE-OUT

**Repo:** `/Users/skypie/AccessMap` · **Date:** 2026-07-31
**Branch:** `sec/phase-b-hardening-2026-07-31` · **Base SHA: `9964f8f`** (`main` tip, re-read at
branch time and verified unmoved since Phase A banked)
**Model:** Fable 5, max effort. The fire directive asked for top-available Opus and "never lower";
Fable 5 sits above Opus in the model tier, so this is at or above the floor. Recorded for provenance.
**Status: BUILT AND STOPPED ON THE BRANCH. Nothing merged. Nothing applied to any server.**

---

## 1. THE VERDICT — what could actually hurt you today, and what this train did

**Nothing is on fire, and nothing here needs your evening.** The live database holds 19 flags and
4 accounts, all yours. Today's real blast radius on almost everything below is approximately zero.
Every severity is graded for *the day real testers exist*, because that is the day they start being
true — and TestFlight is the next step.

**One thing is genuinely live right now, and it is not code.** A working credential pair has been
public in `origin/main` for 61 days. The ledger says three times that this was fixed; it was not.
Live checking shows the exact leaked address does not resolve to an account, so the pair opens
nothing as-is — but the password string is public and a reviewer account exists at a
one-character-different domain. **Rotating it is the only step that ends the exposure, it takes a
minute, and only you can do it.** Procedure: `FORK_S1_credential_rotation.md`.

**The cheapest real win is two dashboard fields.** The `flag-photos` bucket is public with no size
limit and no MIME allow-list, so one free account can upload unlimited files of any type into a
world-readable bucket on your project. About one minute (**A-03**).

**What this train fixed itself, on the branch:** the beacon (an attacker-controlled URL in
`photo_url`/`avatar_url` rendering on ~12 surfaces and harvesting viewers' IPs), the web session
injection that could silently sign someone into an attacker's account, the sign-out that left the
previous user's reported locations in the browser cache, the missing security headers, the secret
scanner that was live two days before the leak and didn't fire, four user-facing claims that were
not true, and a parked account-deletion sweep that would have reported success while leaving the
deleted user's face photo in place.

**What it deliberately did not do:** touch the live database, touch the surfaces you are editing,
or answer the eight questions that are yours.

---

## 2. MEASURED GATE BASELINE — pinned by running them, not by reading docs

★ First action of Phase B, per the directive. Worth noting: the ledger recorded `186 / 2826 / 0`.
The real numbers were already different, which is exactly why this is measured.

| Gate | At base `9964f8f` | At branch tip | Δ |
|---|---|---|---|
| `npx jest --ci -w 3` | 196 suites · 2891 passed · 84 todo · **0 failed** | **200 suites · 2923 passed · 84 todo · 0 failed** | +4 suites, +32 tests |
| `npx tsc --noEmit` | exit 0 | **exit 0** | — |
| `npm run lint` | 0 errors · 80 warnings | **0 errors · 80 warnings** | **unchanged** |

The +32 tests are the new guard tests. The lint count is deliberately identical: two warnings I
introduced while splitting a test file were cleaned up rather than absorbed into the baseline.

---

## 3. WHAT WAS BUILT — ten commits, one item each

| # | Commit | Findings | What it does |
|---|---|---|---|
| 1 | `5c634f7` | TB-3 / IO-3 / IO-1 | Render allow-list for `photo_url` + `avatar_url`, wired at `RemoteImage` (10 of 12 surfaces) plus the 3 raw sites. 10 tests. |
| 2 | `0a24e61` | IO-2 | `flowType: 'pkce'` **on web only**. 4 tests. |
| 3 | `bd6456f` | PL-2 / IO-5 | Purge Cache Storage on sign-out, by prefix, outside the `userId` guard. 4 tests. |
| 4 | `5af4978` | PL-1 / IO-6 | Vercel security headers; CSP as Report-Only. 13 tests. |
| 5 | `3385d4e` | PL-5 / PL-7 | SW tile rule targets CARTO not OSM; suffix host matching; `http-equiv` casing. |
| 6 | `6ca336d` | S-3 / S-4 | Secret scanner catches the shape that leaked + `sb_secret_*`; both workflows get a permission ceiling. |
| 7 | `b2b9f91` | S-2 | Four false ledger entries corrected; two re-rated LOW → HIGH. |
| 8 | `69b9806` | PC-8 / PC-10 / PC-11 / TB-10 | Four claims the code contradicts. |
| 9 | `cd9d143` | S-6 / IO-4 | SR-018 revoke back-filled so the repo stops shipping the insecure state. |
| 10 | `9e72446` | PC-3 | R-1 deletion sweep would have left the avatar. Fixed; still undeployed. |

**Non-vacuity was proven, not assumed.** The allow-list guard was neutered on purpose and 7 of its
10 tests failed; restored, all 10 pass. The hardened secret hook was run against crafted diffs in a
throwaway repo: it blocks all four leak shapes and allows all five legitimate ones.

---

## 4. FOUR PHASE-A ERRORS CAUGHT DURING THE BUILD

Building the fixes falsified parts of the audit. Recorded because a future train will read Phase A
and should know.

1. **"Six render surfaces" was ten.** The `TasksScreen` card path — the highest-traffic list surface
   — and the `FlagDetailModal` before/after path were missed. A 6-site fix would have left the
   busiest surface beaconing.
2. **A bare `flowType: 'pkce'` would have broken native sign-up.** The client is shared; on native
   the verifier sits in AsyncStorage while the confirmation email opens in the system browser, with
   no auth deep-link route back. Scoped to web, which is also the only surface where the hole exists.
3. **The CSP draft would have broken the map three ways** — it named the OSM tile host (the app uses
   CARTO), omitted CARTO from `connect-src` (tiles are `fetch()`ed for the offline cache), and
   omitted the `wss://` origin Realtime needs. Also missed the inline SW-registration script, whose
   hash was computed and verified here.
4. **Cache names are computed, not literal.** A hardcoded `caches.delete('accessmap-v2')` would
   silently stop working on the next version bump — a purge that looks like it ran and does nothing.

Phase A also self-corrected two of its own errors before banking (a falsified finding, and a
redaction of a password it had quoted into its own report). That is the discipline working.

---

## 5. THE SKY-APPLIED ARTIFACT PACKET

**All in one place:** `security-audit/2026-07-31/phase-b/00_SKY_APPLIED_ARTIFACTS.md`
**Plus the fork:** `FORK_S1_credential_rotation.md`

Twenty artifacts, **A-01 … A-20**, covering every server-side finding regardless of severity — they
are documents, cheap to write, yours to schedule. Each carries the statement, a rollback, a
read-only verify query, and its pre-state assumptions stated explicitly.

★ **Every artifact is tagged `[LIVE-VERIFIED]`, `[LIVE-VERIFIED, PARTIAL]` or `[REPO-INFERRED]`, and
every one that is not fully live-verified carries a MANDATORY live pre-state capture step.** This is
the C-5 rule and it is not ceremony: this project has already nearly restored a wrong function body
by reasoning from repo files. Phase A found repo and production disagree in *both* directions.

**Where an artifact stops short, that is deliberate.** A-02 does not print a full
`CREATE OR REPLACE` because the only available capture of that function body is known to be
incomplete — writing one from the fragment would delete whatever the elision hid. A-14 back-fills
one migration and refuses to guess the other ten, because re-deriving ten migrations from prose is
how you invent SQL that does not match production.

Suggested order, and the two sequencing constraints that matter:
1. **A-01 before A-02.** The self-award fix protects nothing while `points` is directly writable.
2. **A-07 before any Disputed badge ships**, not before that — at threshold 2, one person marks any
   report "Disputed" the moment a surface reads the counter.

---

## 6. BANKED QUESTIONS — still yours, untouched

Phase B fixed only unambiguous dispositions. These stayed open, by design.

| # | Question | Where |
|---|---|---|
| 1 | Does the reviewer account at the `.com` address use the leaked password? *(Rotate regardless.)* | FORK |
| 2 | Owner-edit rule: "only while open, never move the pin" (written) vs "anything, forever" (live)? | A-10 |
| 3 | Anonymous rate limiting — every alternative costs privacy or the anonymous path. | A-11 |
| 4 | Is email confirmation on? Sets the price of every account-gated finding. | A-20 |
| 5 | Storage caps — the numbers are yours; I suggested 10 MB and four image types. | A-03 |
| 6 | Should resolving a barrier need more than one person's word? | A-05 |
| 7 | Admin tab renders for nobody, including you. Intended, or a regression? | A-19 |
| 8 | Per-person location histories — Const. Art. 2.4, wants Jordan. | A-16 |
| 9 | Is the k≥3 promise buying honest copy, or real protection? | A-17 |

---

## 7. ACCEPTED-RISKS REGISTER — honest, dated, yours to overturn

Recorded as accepted **with reasons**, not silently dropped. Security theatre is also a finding.

| Risk | Why accepted | Date |
|---|---|---|
| **Full-corpus scrape with the public anon key** (AB-6) | It *is* the product — a public accessibility map. Jordan-approved 2026-05-29; `public.users` has no anon grant, so reports cannot be tied to a person under `anon`. Mitigations cost more product than the risk. ⚠️ The **authenticated** version is NOT accepted — that is A-16. | 2026-05-29, re-affirmed 2026-07-31 |
| **npm advisories: 23 open, incl. 1 Critical** (PL-3) | None reachable from the shipped app. Metro bundles by import reachability; every advisory is in build/dev tooling. Grading the `tar` Critical as a release blocker would be a security-practice defect, not a finding — its threat model is "attacker already controls what the CLI downloads", and such an attacker already has code execution via lifecycle scripts. Dependabot carries them forward. | 2026-07-31 |
| **Global anonymous cap is monopolisable** (A-11) | Every fix costs either IP logging against disability-adjacent reports or the anonymous path itself. A global cap with a documented no-IP constraint may be the right trade. **Accepting is a legitimate answer**; changing it without your decision would not be. | 2026-07-31, pending Q3 |
| **Maintainer email in the shipped web bundle** (PL-6) | Required by OSM policy on native; inert as a header on web, but scrapeable from the bundle. A role address would fix it; not worth a change on its own. | 2026-07-31 |
| **Apple IDs in `eas.json`** (S-5) | Not secrets — `appleId` is a username, half a pair, mitigated by Apple-mandated 2FA. Documenting, not recommending change. | 2026-07-31 |
| **Pre-commit hook is bypassable** (S-3) | `--no-verify` exists and it does not run in CI. It is a speed bump, not a control, and is now honest about that. A CI-side scanner is proposed, not imposed. | 2026-07-31 |
| **Six credential copies left in-tree** | Deliberate. Rotation is what ends the exposure; purging first is theatre in the wrong order, and whether historical audit records may be edited in place is your call. Annotated, not rewritten. | 2026-07-31 |

---

## 8. CONSERVATION

| | |
|---|---|
| Phase A findings carried in | 74 raw · ~62 unique · 2 Critical · 12 High |
| **CLIENT-FIX dispositions built** | **10 commits covering 17 finding IDs** |
| **SKY-ARTIFACTS authored** | **20 (A-01 … A-20), all server-side findings regardless of severity** |
| **FORK authored** | **1 (S-1 credential rotation)** |
| Question-gated items left open | 9 |
| Accepted-with-reason, recorded | 7 |
| Phase A errors caught and corrected | 4 |
| **Server-side changes made by this train** | **ZERO** |
| **Live database writes** | **ZERO** |
| Seam violations | **ZERO** |
| New credential copies created | **ZERO** (verified: still exactly 6 in tree; diff adds none) |
| Gate regressions | **ZERO** (200/2923/0 · tsc 0 · lint 0 errors, 80 warnings — baseline exactly) |

### Seam compliance — the surfaces you are editing

`docs/privacy/index.html`, `src/lib/copy.ts` and Terms copy were **not touched**. Verified:

```
git diff --stat 9964f8f..HEAD -- docs/privacy/index.html src/lib/copy.ts
  (empty)
```

This blocked **PC-1, PC-5, PC-12** entirely and the claim-half of **PC-2, PC-6, PC-7**. Those remain
open and are listed in the artifact packet. **PC-4/A-17 was additionally left alone** because it sits
under the BP16 copy gate and needs a Jordan Art. 7 sign-off.

⚠️ **One thing to look at:** commit 8 edits ratified copy (`SignInScreen`, `HelpModal`) outside the
named seam. The facts are not in question — the app was telling users things the code contradicts —
but the phrasings are yours to overrule, and `HelpModal` overlaps BP16.

### Cross-train law

`sec/phase-b-hardening-2026-07-31` is the **only** security fix-branch on this repo. Base stated:
**`9964f8f`**. Unmerged stacks this branch does *not* touch and does not duplicate:
`fix/photo-privacy-sanitize`, the R2 stack (`r2/bp3…bp17`), `shipready/3-polish-submission`,
`a11yqa/1-fix-train`, the `devicetune/*` and `bench/*` branches.

★ Phase A noted `fix/photo-privacy-sanitize` as carrying a critical unmerged EXIF fix. A Phase A lens
re-verified that **`sanitizeImageMetadata` is already merged on `main`** (`src/lib/flags.ts`), so the
memory-ledger line describing it as parked is stale. Worth reconciling before that branch is merged.

---

## 9. WHAT TO DO NEXT — in order

1. **Rotate the reviewer credential.** One minute, and it is the only genuinely live exposure.
2. **Two dashboard fields on `flag-photos`** (A-03). One minute, highest value per effort.
3. **Check "Confirm email"** (A-20). Thirty seconds; it sets the price of everything else.
4. **Review this branch and merge it if you're happy.** Ten commits, no gate regressions.
5. **Then schedule the artifacts** at whatever pace suits — A-01 → A-02 first, A-05 when you have
   decided the quorum question.

Nothing on that list is an emergency. The database has 19 rows and four accounts, all yours.

**PHASE B COMPLETE — STOPPED ON THE BRANCH. Nothing merged, nothing applied.**
