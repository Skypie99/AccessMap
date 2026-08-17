# 04 · PHASE B — BANKED, READY TO FIRE
Phase B did not run: both GO boxes in the rename prompt were `[ ]` unticked at fire time. Nothing outside `~/AccessMap` was touched by this run. This file is the follow-up, plus the reconnaissance done today so the next run does not have to rediscover it.

---

## To fire it
Re-fire the same rename prompt (`../2026-08-16/RENAME_PROMPT_FLAGSTONE.md`) with **both** GO boxes ticked `[x]`, and add `RESUME` so it runs Phase B only and does not redo Phase A.

The two boxes are Sky's acceptances, not research tasks:
1. **Trademark landscape accepted.** CIPO + USPTO glance for "Flagstone" in software/app classes. The known neighbour is Flagstone Group, a UK cash-savings fintech, plus small B2B IT shops. None on the App Store, all in different worlds. Ticking this is Sky accepting the landscape, not legal advice.
2. **Domain situation accepted.** `flagstone.com`, `flagstone.ca`, and `flagstone.app` are all registered by other parties (fetched 2026-08-16; `.app` rechecked 2026-08-17 after a faulty first probe). A domain is optional for shipping: the store listing plus the github.io privacy page are sufficient. Variants like `flagstoneapp.com` are a Sky-manual hunt and purchase.

**Why B should stay one dated sweep:** cross-artifact consistency is a standing law of the job hunt. Resume, portfolio, arsenal, and LinkedIn should flip together, and ideally no application goes out mid-sweep.

---

## Reconnaissance for the next run (verified today, read-only)

### B1 · `~/Portfolio` — check the tree before branching
```
HEAD branch : main
local main  : 8373c6a  feat(chrome): the menu icon joins the drawn family — B, The Horizon [LUXE-4]
origin/main : 3e874cd  Merge pull request #15 from Skypie99/archive/supply-swatches-2026-08-09
```
Two things the next run must handle:
- **Local `main` is ahead of `origin/main`.** Branching `rename/flagstone` off local `main` inherits unpushed commits. That is probably fine and probably intended, but it is Sky's call which base is correct, and it should be stated rather than assumed.
- **The tree is dirty on tracked files:** `.claude/launch.json`, `DECISIONS_LOG.md`, `PROJECT_STATE.md`. Branch from a clean tree, so these get resolved first.

Files naming AccessMap outside `design-reviews/` (the sweep surface): `app/page.tsx`, `app/layout.tsx`, `app/about/page.tsx`, `app/work/[slug]/page.tsx`, `app/blog/[slug]/page.tsx`, `app/__tests__/work-receipt.test.tsx`, `content/case-studies.md`, `content/blog.json`, plus the planning docs (`SHOW_WORK_PLAN.md`, `UI_SYSTEM.md`, `VOICE_PASS_PLAN.md`, `FINAL_POLISH_PLAN.md`, `FEATURES.md`, `TASK_GRAPH.json`, `COWORK_PROMPT.md`, `docs/COWORK_GITHUB_URLS.md`, `designs/phase2-design-spec.md`) and the generated `.context-bundle.md`.

Note `app/__tests__/work-receipt.test.tsx`: the Portfolio has its own paired-test fence, same as AccessMap's. Brand strings and their assertions move together there too.

Screenshots: the capture factory picks up the new home-screen label on its next run. That is a follow-up, not part of the sweep.

### B2 · The resume — a blocker found today
`RESUME_SOURCE.md` is **not** in `~/career-arsenal/` and not in any repo. The only copy on this machine is:
```
~/Library/Application Support/Claude/local-agent-mode-sessions/c33613f8-…/local_5eb17c51-…/outputs/RESUME_SOURCE.md
```
The whole toolchain sits in that same ephemeral session-outputs folder: `RESUME_SOURCE.md` (1 AccessMap hit), `RESUME_SOURCE_2026-07-16_full-version-backup.md`, `Skyler_Halisky_Resume.html`, `Skyler_Halisky_Resume.pdf`, plus `Application_Package.md` and `Interview_Answers.md`.

**Sky decides before B2 runs:** move that set into `~/career-arsenal/` (or another durable home) first? A session-outputs directory is not a safe home for the document that is declared the source of truth for every application. Editing it in place would leave the resume law pointing at a path that can vanish.

Once relocated, the resume law still applies in full: edit `RESUME_SOURCE.md`, then re-run the **whole** HTML + PDF chain with ligatures off, and verify the PDF's ATS text layer reads Flagstone.

### B2b · `~/career-arsenal/` — the sweep surface
Not a git repo (confirmed), private, never published. 154 AccessMap hits across the top-level docs:

| File | Hits |
|---|---|
| `RECEIPTS.md` | 77 |
| `01_WAR_STORIES.md` | 31 |
| `05_TECHNICAL_QA.md` | 22 |
| `CORPUS_MAP.md` | 14 |
| `03_MASTER_NARRATIVE.md` | 4 |
| `06_CROSS_CHECK.md`, `07_GAPS_AND_QUESTIONS.md` | 2 each |
| `00_INDEX.md`, `04_AI_ORCHESTRATION_STORY.md` | 1 each |

**A judgment call the next run must make deliberately, not mechanically.** `RECEIPTS.md` at 77 hits is a receipts ledger: it cites commits, reports, and dated artifacts that genuinely were AccessMap at the time. Same tension this run hit in the app repo. The likely right shape is the same answer: rename where the document *brands the project to a reader* (narrative, war stories, master narrative, index), and leave citations of dated artifacts as history, with one provenance line at the top of each file that carries both names. Since `housekeeping/` and `roadmap/` are dated audit bundles, they are history and stay.

No git safety net here. Copy the files first.

### B3 · LinkedIn and live profiles
Paste-ready before/after snippet file, one exact pair per surface. The agent never posts. Nothing was drafted in this run because the current live text was not read.

### B4 · Consistency check
Close B by confirming resume, arsenal, LinkedIn snippet, and the Portfolio branch all say Flagstone the same way, with the same one-line provenance. Bank the filled checklist.

---

## The provenance line to reuse verbatim across every career surface
> shipped as Flagstone; built under the working title AccessMap

Introduce it **once**, where the project first appears in each document. Repeating it on every mention reads as anxious.
