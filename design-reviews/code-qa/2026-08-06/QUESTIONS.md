# BANKED QUESTIONS — code-qa Phase A · 2026-08-06 (unattended run; nothing blocked on these)

> Each row notes what Phase B will do if unanswered. Answers can land here, in a fire message, or in DECISIONS-style files — Phase B never self-answers.

**Q-1 — Extend the ratified content filter to owner EDITS? (COR-1's third guard)**
The create path filters descriptions (your D-2 curated list); the edit path currently filters nothing. Phase B lands the mechanical halves regardless (2000-char cap + category/severity validation — pure parity). The blocked-term half on edit is the same filter, same user, same 1.2(a) surface — recommended YES, but it sits one step from your 0.2 anon decision, so it's yours in one breath with it. *Unanswered → cap+validation land, filter half stays OPEN.* **Rider for whoever lands 0.2:** the anon catch needs the same `showBlockedContentAlert` routing the auth path has (ReportFlagModal.tsx:422 vs :529) — one more line, same commit.

**Q-2 — Blocked-term filter on display_name? (COR-2)**
Slur display names currently land and render on the public leaderboard + comment bylines. Same moderation-policy class as 0.2 ("adding a filter to a submit path is yours to make"). One line in `updateUserProfile` if yes. *Unanswered → OPEN, no change.*

**Q-3 — The 52-stub wave6 test plan: any rows you want KEPT as a plan?**
Default triage: implement the still-true cheap ones, delete the ones superseded by the a11y train's real coverage (each deletion citing its superseding suite), park ambiguous rows back to this file. *Unanswered → default triage proceeds; the commit lists every deleted row.*

**Q-4 — God-file splits: park until Guard Forge Phase B?**
18 guard suites read source by path/anchor; four are fail-open (HF-3/4/5/9) until the forge hardens them — splitting first risks silently defusing guards. Recommended sequence: Guard-Forge B → then MapScreen split. The one safe-now candidate is extracting flags.ts's photo pipeline (pure move, re-exports kept). Want that this train, or parked? *Unanswered → all splits PARKED, including the safe one.*

**Q-5 — `_to_delete/` at repo root (quarantined git lock files, untracked): delete?**
One keystroke, yours since it's named for deletion but predates this train. *Unanswered → untouched.*

**Q-6 — Dead artifacts with a maybe-future: `deleteFlagPhoto` + 6 category SVGs.**
Default: delete both (smallest honest state; the function half-promises an Edge Function that doesn't exist — DEAD-6). Keep instead if per-photo removal UI or SVG category art is on your roadmap. *Unanswered → deleted, revivable from git.*

**Q-7 — `apply-migrations.js`: delete, or rebuild against the artifact packet?**
It prints one hardcoded May migration; the living workflow is `security-audit/2026-07-31/phase-b/00_SKY_APPLIED_ARTIFACTS.md`. *Unanswered → deleted.*

**Q-8 — PROJECT_STATE.md: regenerate (`/new-window`) or archive-banner?**
It pins a five-trains-ago main. Phase B's safe default is a one-line ARCHIVED banner pointing at APP_STORE_TODO. *Unanswered → banner only.*

**Q-9 — (Pointer, no new decision) Your PC-4 artifact should add one site: `README.md:10`** carries the same k≥3 promise the audit found cosmetic — the most public copy. Fold into whichever way you settle PC-4 (make the floor real, or reword the promise everywhere at once).

---
*Advisory riders already noted in lens files: SLOP-2's key renames need the read-old-key migration or they reset user state · DEBT-1's README count fix must not touch the C-1 WCAG sentence (yours) · DEBT-2's CLAUDE.md fix records reality without pre-empting your points-values decision.*

---
## PHASE B ADDENDUM (2026-08-06, per Q-3's "park ambiguous rows back to this file")

**Q-3 parked rows** — wave6.test.tsx was deleted (52 todos: superseded citations in commit `TEST-1`); these rows were neither superseded nor cheap, so they're parked here as intent, not kept as stubs:
- Dark-mode render variants for the comment surfaces (theme guards cover tokens, not composed renders).
- RTL layout for comment bubbles (RTL has never been a stated target — say if it should be).
- Two integration rows: "FlagDetailModal renders a CommentBubble per comment" and "a11y tree correct when all comment components render together" (integration-harness class, same bucket as the 32 kept todos).
- The cosmetic px-pin family (bubble alignment/radii/80% maxWidth/token-per-slot) — the house pins CONTRACTS, not pixels; revive only if you want style pins as a policy.

**Q-3 note on the KEPT 32:** MapScreen.heatmap (14, incl. the PC-4-adjacent k-anonymity disclaimer row), MapClustering (7), WatchedFlagsSearch (6), OfflineIndicator (5) stay as `it.todo` — live features, honest markers of the missing integration harness, adjacent to your device-gate system. Todo estate: 84 → 32.

**COR-3 rider (new, small):** the photo gallery in FlagDetailModal has no error-state UI — after COR-3 the view path degrades (warn + keep list) while writes fail loudly. If you want "couldn't load photos" to LOOK different from "no photos", that's a small feature fork for your queue.
