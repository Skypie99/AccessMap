# DEEP CODE QA + CLEANUP TRAIN — PHASE A · STEP 0 DISCOVERY

**Project:** AccessMap (Expo SDK 54 · RN 0.81 · React 19.1 · TypeScript strict · Supabase) · **Date:** 2026-08-06
**Model / provenance:** Fable 5 (`claude-fable-5`), max effort. All Phase-A findings in this run are tagged `[F5/2026-08-06]`.
**Mode:** SLOP-FOCUS (lens 7 runs immediately after lens 1). Phase A is **read-only** — the only writes this session are the untracked reports in this directory. Nothing staged, nothing committed, no server touched.
**First code-qa run on this repo** — no predecessor close-out exists under `design-reviews/code-qa/`. (Dashboard's 2026-08-01 run is the sibling precedent for format.)

---

## 1 · TARGET RESOLUTION

Fire message: *"audit the shipready/3-polish-submission tip if main hasn't merged."*

Verified first-hand:

- `shipready/3-polish-submission` **IS an ancestor of `main`** (`git merge-base --is-ancestor` → yes). Main has merged it.
- `main` = `9964f8f` == `origin/main`.
- Checked-out branch: **`ui-polish/accessmap-preship-2026-08-01` @ `d243b51`** — main+22 / 0 behind, ff-able (this is the exact tip APP_STORE_TODO 1.2 fast-forwards). Tracked working tree is **clean** (`git status --porcelain` minus `??` = empty); all 76+ untracked paths are report bundles/tools.
- Fix trains verified **IN** this tip: `sec/phase-b-hardening-2026-07-31` · `a11yqa/1-fix-train` · `fix/photo-privacy-sanitize` · `shipready/3-polish-submission`.

**⇒ AUDIT TARGET = the checked-out working tree at `d243b51`** — the designated pre-ship superset (main + 11 security fixes + 11 polish commits). Audited in place; no checkout performed.

---

## 2 · STACK + GATES (the floors) — MEASURED first-hand at `d243b51`, 2026-08-06

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Lint | `npm run lint` (eslint 9, pinned — never v10) | **0 errors / 80 warnings**, exit 0 (matches guard-ledger's 2026-08-01 measurement — baseline held) |
| Tests | `npx jest --ci -w 3` (the gate law) | **200 suites passed · 2923 passed · 84 todo · 3007 total · 0 failed · 32.4 s** |
| Build | `expo export --platform web` (not run — Phase B pins it) | CI's version is fail-open (guard-forge HF-1, KNOWN) |

Repo shape: 368 `.ts/.tsx` under `src/` (200 test files; ~90.9k LOC total, **51.3k non-test LOC**). 70 modules in `src/lib/`, 3 hooks, 1 moderation module, 13 `ui/` primitives. Top god-file candidates (lens 5 seed): `MapScreen.tsx` 3702 · `ProfileScreen.tsx` 2674 · `TasksScreen.tsx` 2663 · `FlagDetailModal.tsx` 2533 · `lib/flags.ts` 1781 · `ReportFlagModal.tsx` 1633.

Version facts for later lenses: `package.json` 0.2.0 vs `app.json` 3.0.0 (KNOWN — TODO 0.4). `typescript ~6.0.0`, `jest 29`, `@supabase/supabase-js ^2.106.2`.

---

## 3 · HOUSE GRAMMAR (cleanup conforms to THIS, never to generic taste)

Sources, in authority order: `CLAUDE.md` (conventions + **Error Handling Tiers table** — the house catch policy) · `DESIGN.md` · `GLASS.md` (glass tiers, budget law, rollout recipe) · `LEARNINGS.md` (52 entries, indexed) · `theme.ts` tokens · `src/components/ui/` primitives.

The load-bearing idioms:
- Tokens only — `useColor()` / `spacing` / `radius` / `shadow` / `font` / `motion`; never raw hex/numbers. `<AppText>`, never raw `<Text>`. Primitives: `AppText, Button, Input, Card, GlassSurface, Skeleton, Sheet, ScreenHeader, PressableScale, RemoteImage, OverflowFade, ScreenStage, HeaderActions`.
- Styles: `StyleSheet.create` at file bottom; dark-mode-aware components use `makeStyles(color)` factory or inline `useColor()` reads.
- Forms: plain `useState` + `Pressable` + `Input` primitive — no form library.
- **Error tiers (CLAUDE.md):** AsyncStorage READ → `console.warn` + fallback · AsyncStorage WRITE (user data) → **throw** · AsyncStorage WRITE (ephemera) → warn + ignore · Supabase screen errors → `Alert.alert('Title', errorMessage(e))` · destructive confirmations → `confirm()` from `src/lib/confirm.ts` · info-only → `Alert.alert`.
- `catch (e: any)` is house-accepted in catch blocks.
- DB types: `type` not `interface` in `types/database.ts` (postgrest `Schema = never` trap); `EmptyRelationships` alias.
- Maps only via `PlatformMap` (native/web split); imperative handle `{ animateTo, showCallout }`.
- Photo path scheme `<userId>/<timestamp>.<ext>` is RLS-coupled — never change unilaterally.
- **Fence comments are law:** in-source `PROTECT-n` / `SR-nnn` / `C-nn` / ledger-ref / DO-NOT-EDIT comments are institutional memory — the Protected-Comment Law applies; the slop census never flags preserved-WHY.

## 4 · PROTECT LIST + IN-FLIGHT SEAM

- PROTECT markers live **in source comments** (e.g. `PROTECT-2` recovery card, `PROTECT-11` anon-sheet exemplar copy) — grep `PROTECT` in `src/` before proposing any disposition that touches a marked surface.
- **Never `git gc`** in this repo (202 dangling commits — APP_STORE_TODO law).
- **SEAM (PROVISIONAL, Phase B must not touch):** `src/lib/copy.ts` legal strings (Terms/Privacy). Sky has an open, unrun Cowork prompt on the Terms deletion sentence (TODO 0.3), and the sec-train marked PC-1 as her active seam (2026-07-31). Anything found there is auditable but PROVISIONAL.
- Ratified copy generally (`copy.ts`) is Sky's — strings are never reworded unilaterally (BP16 copy gate is HER open queue).

---

## 5 · PRIOR AUDIT LEDGERS — the CLOSED/KNOWN baseline (re-finding these = a defect of THIS audit)

| Ledger | Where | Status at d243b51 |
|---|---|---|
| Security audit Phase A (74→62 findings) | `security-audit/2026-07-31/00_MASTER_TABLE.md` + 7 lens files | Client-side: **10 commits / 17 IDs FIXED in tip** (TB-3/IO-3/IO-1 render allow-list · IO-2 pkce-web · PL-2/IO-5 cache purge · PL-1/IO-6 headers · PL-5/PL-7 · S-3/S-4 · S-2 ledger · PC-8/10/11/TB-10 claims · S-6/IO-4 revoke backfill · PC-3 avatar sweep). Server-side: **A-01…A-20 Sky-applied artifacts, ALL PENDING** (AB-2 mass-flip, PC-4 k≥3 cosmetic, TB-1 points writable, A3-8 self-award, AB-4 comment spam, A3-3 bucket caps, PC-2 photo-path identity, TB-9 location-history join, …). |
| Guard Forge Phase A | `guards/2026-08-01/GUARD-LEDGER.md` | **HF-1…HF-9 KNOWN-OPEN** (vacuous/false-confidence guards: CI perf budget fail-open, eas production choice-guard unreachable, classA/terms/disputeControl fail-open indexOf, CI zero-test pass, TestFlight self-attestation, `*guard*.sql` enforce nothing, bp10 ink loop tautological). Phase B never fired. 393 invariants censused. |
| A11y deep QA | `a11y-qa/2026-07-31/` (MASTER-TABLE, CLOSE-OUT) | Fix train **IN tip** — A11Y-2xx class CLOSED. Still open: C-1 README overclaim + C-2 hosted-policy republish (both GATED-AWAITING-SKY) + device rows. |
| Ship-ready RUNs 1–3 | `ship-ready/` (13 files) | Cars A–D merged (2026-08-05 verification). Open: B-6 creds = S-1, SR-021 binary evidence, SR-048 points-revoke never executed (= TB-1). |
| Store dossier + gauntlet | `store-dossier/2026-08-05/` | Docs-only. **Q1–Q8 banked for Sky** (name collision, social-media answer, spelling, 24-h sentence, long-press hint, em-dash law, junk-data scope, guest Sign-out). MUST: junk-data cleanup + seeding. |
| Fable audit + R2 (65) + build train BP1–BP17 | `fable-audit/`, `r2-audit/` | Design-domain; slate merged through the trains in tip. BP16 copy gate (38 strings) = Sky's open queue. R2 DECISIONS = ground truth for T-numbered items. |
| UI-polish train | `ui-polish/2026-08-01/` + the 22 commits themselves | This IS the audited tip. |
| Device-tune, fork-briefs | `device-tune/`, `fork-briefs/` | 4 fork briefs = Sky's product decisions, PENDING. Not code-qa ground. |
| APP_STORE_TODO.md (2026-08-03, Morgan) | repo root, untracked | **The live known-open list:** 0.1 reviewer cred (6 in-tree copies, public repo) · 0.2 anon-filter decision (`createAnonFlag` never calls blocked-term filter — DELIBERATE, Sky's call) · 0.3 Terms "Settings" sentence · 0.4 version drift · Admin renders for nobody (`admin.ts` selects non-SELECT-able `is_admin`) · Sentry no-op vs policy claim · points-value drift (live 10/3/15/7 vs docs 5/2/10/5) · branch-prune list. |
| Older qa-reports (May 2026) | `qa-reports/` | Historic; EXIF GPS leak RESOLVED (in-tip). |

**Consequence for this run:** none of the above may be re-presented as a new finding. They appear only as cross-references when a new finding touches them.

---

## 6 · LENS ORDER (SLOP-FOCUS active) + OUTPUT

1 CORRECTNESS → **7 AI-SLOP/ONE-AUTHOR** → 2 TEST QUALITY → 3 TYPE HONESTY → 4 DEAD WEIGHT → 5 DUPLICATION/COMPLEXITY → 6 DEBT CENSUS.

Banked per lens to `design-reviews/code-qa/2026-08-06/` as `01_correctness.md`, `02_slop-census.md`, `03_test-quality.md`, `04_type-honesty.md`, `05_dead-weight.md`, `06_duplication-complexity.md`, `07_debt-census.md`, then `MASTER_TABLE.md` + `QUESTIONS.md`. `HANDOFF.md` updated at every bank. Finding IDs: `COR- / SLOP- / TEST- / TYPE- / DEAD- / DUP- / DEBT-`, tiered Blocker/High/Med/Low, each with file:line evidence. FINISHED is a valid verdict — no quotas.
