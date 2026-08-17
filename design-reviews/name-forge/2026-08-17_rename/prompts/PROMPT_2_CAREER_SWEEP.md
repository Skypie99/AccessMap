# THE FLAGSTONE CAREER SWEEP [TOP AVAILABLE OPUS · MAX EFFORT · execution run · branch-only, Sky merges]

USAGE: fire in a fresh session. This is Phase B of the Flagstone rename, which Phase A banked because its two GO boxes were unticked. **Tick both GO boxes in DECISIONS FOR SKY before firing.** If either is unticked, do Phase 0 only (it is pure data safety and needs no permission), then bank the rest and stop.

WHAT THIS IS: AccessMap became **Flagstone** on 2026-08-17. The app repo is done (`design-reviews/name-forge/2026-08-17_rename/CLOSE-OUT.md`). Every place Sky's job hunt names the project still says AccessMap. Cross-artifact consistency is a standing law of that hunt, so this happens as ONE dated sweep: resume, portfolio, interview arsenal, and the LinkedIn snippet all flip together, saying it the same way. Ideally no application goes out mid-sweep.

Read `04_phaseB_banked.md` in that folder first. It carries the reconnaissance already done, so you do not rediscover it.

★ HOUSE PROTOCOLS: UNATTENDED (questions bank, no mid-run stops) · RESUME (bank each phase file as it completes) · OUTPUT: `~/career-arsenal/rename-flagstone/2026-08-17/` (create; `RUN_LOG.md` with a phase table first, then phase files, then `CLOSE-OUT.md`) · REGISTER: warm, human, boutique, zero corporate slop, **ZERO EM DASHES** in anything an employer could read.

★ THE PROVENANCE LINE, verbatim, reused everywhere:
> shipped as Flagstone; built under the working title AccessMap

Introduce it **once** per document, where the project first appears. Repeating it on every mention reads as anxious. Never reword the project's mission text.

★ NEVER TOUCH: `main` on any repo (Sky merges) · anything under `design-reviews/`, `qa-reports/`, `security-audit/`, or any dated audit bundle, in any repo: those say AccessMap because that is the history · `~/career-arsenal/housekeeping/**` and `~/career-arsenal/roadmap/**`, same reason · LinkedIn itself, or any live profile, or any send: paste-ready snippets only, the agent never posts · no purchases, no domains.

---

## PHASE 0 · Rescue the resume toolchain (runs unconditionally, needs no GO box)

**The problem, found 2026-08-17.** `RESUME_SOURCE.md` is the declared source of truth for every job application, and it is **not** in `~/career-arsenal/` or in any repo. The only copy on the machine, along with the built resume, is here:
```
~/Library/Application Support/Claude/local-agent-mode-sessions/c33613f8-b7b5-4c3d-b309-221e8e82c10a/de10261b-e063-47df-a47a-8448c4f835e4/local_5eb17c51-e781-4cfc-860e-86cdfabc5540/outputs/
```
That folder holds `RESUME_SOURCE.md`, `RESUME_SOURCE_2026-07-16_full-version-backup.md`, `Skyler_Halisky_Resume.html`, `Skyler_Halisky_Resume.pdf`, `Application_Package.md`, `Interview_Answers.md`, plus a `Delta-X` docx variant. A Claude session-outputs directory is not a safe home for any of that.

1. **COPY** (never move, never delete the originals) that whole set into `~/career-arsenal/resume/` .
2. Write `~/career-arsenal/resume/PROVENANCE.md`: where each file came from, the copy date, the file sizes and dates as found, and which file is truth.
3. Verify the copies are byte-identical to the originals (`shasum` both sides, paste the output).
4. Only after that verification does Phase 2 edit anything. Phase 2 edits the **copy in `~/career-arsenal/resume/`**, never the session folder.
5. Bank as `00_phase0_rescue.md`. If anything about the copy is uncertain, stop this phase and bank it: losing the resume is worse than a late rename.

`~/career-arsenal/` is **not a git repo** (verified). There is no undo. That is exactly why step 3 exists.

## PHASE 1 · Portfolio (gated on both GO boxes)

`~/Portfolio`, verified 2026-08-17: on `main`, **local `main` = `8373c6a` is AHEAD of `origin/main` = `3e874cd`**, and the tree is **dirty on tracked files** (`.claude/launch.json`, `DECISIONS_LOG.md`, `PROJECT_STATE.md`).

1. Do not branch from a dirty tree. Report the dirty files and what is in them, and bank the question of which base is correct (local `main` carries unpushed commits). If the dirt is unrelated to this sweep, leave it alone and say so; do not stash or commit someone else's work.
2. Branch `rename/flagstone` off `main` once clean.
3. Sweep the project page and case study: title becomes Flagstone, the provenance line appears once, body references follow. Files that name it outside `design-reviews/`: `app/page.tsx`, `app/layout.tsx`, `app/about/page.tsx`, `app/work/[slug]/page.tsx`, `app/blog/[slug]/page.tsx`, `content/case-studies.md`, `content/blog.json`, plus the planning docs (`SHOW_WORK_PLAN.md`, `UI_SYSTEM.md`, `VOICE_PASS_PLAN.md`, `FINAL_POLISH_PLAN.md`, `FEATURES.md`, `TASK_GRAPH.json`, `COWORK_PROMPT.md`, `docs/COWORK_GITHUB_URLS.md`, `designs/phase2-design-spec.md`). `.context-bundle.md` is generated: leave it.
4. **`app/__tests__/work-receipt.test.tsx` names the project too.** The Portfolio has the same paired-test fence as the app repo: brand strings and the assertions that check them move together, in the same commit. Never skip or delete a test to make a rename pass.
5. Run whatever gate chain that repo actually has (find it, do not assume: check `package.json` scripts) and paste the outputs verbatim.
6. Propose-only. Sky merges and deploys.
7. Screenshots: the capture factory picks up the new home-screen label on its next run. List it as a follow-up; do not re-run it inside this sweep.

## PHASE 2 · Resume, then the arsenal (gated on both GO boxes; requires Phase 0 verified)

**The resume, on the rescued copy.** `RESUME_SOURCE.md` is truth: one substitution with the provenance parenthetical the FIRST time the project is introduced, and plain `Flagstone` after. Then the resume law in full: re-run the **whole** HTML + PDF chain, **ligatures off**, and then **verify the PDF's ATS text layer actually reads Flagstone** by extracting the text, not by looking at the render. Paste the extracted line as proof.

**The arsenal**, `~/career-arsenal/`, 154 hits across the top-level docs:

| File | Hits |
|---|---|
| `RECEIPTS.md` | 77 |
| `01_WAR_STORIES.md` | 31 |
| `05_TECHNICAL_QA.md` | 22 |
| `CORPUS_MAP.md` | 14 |
| `03_MASTER_NARRATIVE.md` | 4 |
| `06_CROSS_CHECK.md`, `07_GAPS_AND_QUESTIONS.md` | 2 each |
| `00_INDEX.md`, `04_AI_ORCHESTRATION_STORY.md` | 1 each |

⚑ **This is a judgment call, not a sed.** `RECEIPTS.md` at 77 hits is a receipts ledger: it cites commits, reports, and dated artifacts that genuinely were AccessMap at the time. Renaming a citation makes the receipt un-checkable, which is the opposite of what a receipts file is for. So bucket every hit before editing, exactly as Phase A did in the app repo, and bank the bucketed list first:
- **BRANDS THE PROJECT TO A READER** (narrative, war stories, master narrative, index, technical Q&A prose) → becomes Flagstone.
- **CITES A DATED ARTIFACT** (commit SHAs, report filenames, paths, "as of 2026-07-xx") → stays, because it is a receipt.
- **UNCLEAR** → banked question, not an edit.
Then add the provenance line once at the top of each file that carries both names, so a reader is never confused.

Copy the files before you touch them: no git safety net here.

## PHASE 3 · LinkedIn and live profiles (gated on both GO boxes)
Produce `03_linkedin_snippets.md`: exact old line → exact new line, one pair per surface, ready to paste. **The agent never posts, never logs in, never opens LinkedIn.** If the current live text is not known, say so plainly and write the snippet against the text found in the arsenal, flagging that Sky must confirm the live wording.

## PHASE 4 · The consistency check that closes the sweep
Fill in and bank the checklist: resume PDF text layer · resume HTML · `RESUME_SOURCE.md` · arsenal narrative files · LinkedIn snippet · Portfolio branch. Every one says **Flagstone**, the same way, with the same one-line provenance, introduced once. Any row that cannot be ticked is named in the close-out with the reason.

---

★ DECISIONS FOR SKY (tick both, or only Phase 0 runs):
1. [ ] **GO: trademark knock-out glance done.** CIPO + USPTO for "Flagstone" in software/app classes. The known neighbour is Flagstone Group, a UK cash-savings fintech, plus small B2B IT shops; none on the App Store. Flags are not legal advice. This box is Sky accepting the landscape.
2. [ ] **GO: domain situation accepted.** `flagstone.com`, `flagstone.ca`, and `flagstone.app` are all registered by others (fetched 2026-08-16, `.app` rechecked 2026-08-17). A domain is optional for shipping: the store listing plus the github.io privacy page suffice. Variants like `flagstoneapp.com` stay a Sky-manual hunt.

★ FENCES: no merge, no push, no deploy, no post, no send, no purchase · `main` untouched on every repo · no live database · no credentials · history and dated bundles immutable · originals in the session-outputs folder are copied, never moved or deleted · nothing invented, banked questions for anything genuinely open. Report and STOP.
