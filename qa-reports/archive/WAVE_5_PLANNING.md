# Wave 5 Planning — Features & Gate Deadlines

**Wave Start:** Monday 2026-06-02  
**Wave End:** Friday 2026-06-06  
**Gate Proposals Due:** Friday 2026-05-29 5pm UTC (EOD today + tomorrow)  
**Gate Reviews:** Saturday 2026-05-30 morning  
**Gates Approved/Applied:** Sunday 2026-05-31  
**Features Merge:** Monday–Friday 2026-06-02 to 2026-06-06  

---

## Queued Features (Ready to Merge Once Gates Apply)

### Shamus — Feature Builder

| Feature | Branch | Status | Blocker | Merge ETA |
|---|---|---|---|---|
| `feat-clustering` | `origin/shamus/marker-clustering-2026-05-25` | ready-to-merge | **D1** | 2026-06-02 (once D1 applied) |
| `feat-notify-flag-status` | `origin/feat/notify-flag-status` | ready-to-deploy | **D2** | 2026-06-03 (once D2 applied + Rory deploys) |
| `fix-statushistory-darkmode` | `origin/fix/dani-statushistory-darkmode-2026-05-25` | in-code-review | None | 2026-06-02 (once Dani approves) |

**Total:** 3 features, 150 new tests (Gary's updateFlagContent suite), 6 days of merged work.  
**Unblocks:** Dani's creative-polish phase, Wave 5 design-final, Will's UX refinement.

---

### Dani — Design & Tokens

| Feature | Branch | Status | Blocker | Merge ETA |
|---|---|---|---|---|
| `design-creative-polish` | `origin/design/creative-polish-wave4` | in-progress (80% done) | **D5** | 2026-06-04 (once D5 unblocks color decisions) |
| `token-residuals-darkmode` | `origin/chore/design-token-residuals-2026-05-25` | ready-to-merge | None | 2026-06-02 (can merge anytime, low risk) |

**Total:** 2 features, 0 tests (design/chore), unblocks future dark-mode work.  
**Parallel:** Can land independently; no dependency on other features.

---

### Steve — Security & RLS

| Work | Status | Blocker | Completion |
|---|---|---|---|
| `sign-off-trigger-logic` (D3) | ready-for-decision | None (Steve approval pending) | 2026-05-28 EOD (Sky applies) |
| `rls-hardening-wave2` | in-progress (60% audit done) | None | 2026-05-31 (proposals for Sky review) |

**Decision D3:** Status-history trigger already merged via migration. Trigger logic sign-off enables D8 EXIF privacy audit path.  
**Security audit:** RLS tightening for public launch readiness (Wave 5 feature set). Merge ETA: 2026-06-01.

---

## D-Gate Deadlines (Friday 2026-05-29 5pm UTC)

All D-gate proposals must be ready for Sky review by **Friday 2026-05-29 5pm**. Gate reviews happen Saturday morning; Sky applies Sunday.

### Gates Ready or In Progress

| Gate | Owner | Status | Target Apply Date |
|---|---|---|---|
| **D1** (flag_edit_rls_replacement) | Shamus | READY FOR SKY | 2026-05-31 |
| **D2** (push_tokens migration + Edge Function) | Shamus + Rory | READY FOR SKY | 2026-05-31 |
| **D3** (status_update_trigger sign-off) | Steve | READY FOR SKY | 2026-05-31 |
| **D5** (heatmap severity colors decision) | Dani | PROPOSAL READY (color gradient choice) | 2026-05-31 |
| **D6** | — | Not yet proposed | — |
| **D7** | — | Not yet proposed | — |
| **D8** (EXIF privacy + public launch) | Steve + Jordan | Deferred to post-Wave-5 | — |

---

## Morgan's Calendar Reminders (Set Today 2026-05-28)

```
🗓️ RECURRING — Every Friday 5pm UTC (starting 2026-05-29):
   "D-gate proposals due. Check qa-reports/DECISION_GATE_TEMPLATE.md for open gates."

🗓️ Saturday 2026-05-30 09:00 UTC:
   "Review D1–D5 gates. Consolidate for Sky approval. Message if blockers found."

🗓️ Sunday 2026-05-31 18:00 UTC:
   "Sky applied D1–D5 gates? Confirm + notify Shamus/Dani/Steve to merge Monday."

🗓️ Monday 2026-06-02 09:00 UTC:
   "Wave 5 features merging Mon–Fri. Daily: spot blockers, surface to Sky. Friday: prepare Wave 6 planning."
```

---

## Success Criteria for Wave 5

- [ ] All D1–D5 gates applied by Sunday 2026-05-31
- [ ] Shamus's 3 features merged by Wednesday 2026-06-04
- [ ] Dani's design + tokens landed by Wednesday 2026-06-04
- [ ] Steve's RLS audit proposes fixes by Friday 2026-06-06
- [ ] Zero unplanned blockers during merge week
- [ ] All team members sent daily checkins (Mon–Fri)
- [ ] Wave 6 planning doc ready by Friday 2026-06-06 EOD

---

## Wave 5 Checkpoint

**Friday 2026-05-29 EOD:**  
Morgan verifies gates are proposed, timeline is locked, team understands Monday start.

**Friday 2026-06-06 EOD (Wave End):**  
Morgan reports: features shipped, tests passing, next wave queued, lessons for Wave 6.

---

**Coordinator:** Morgan  
**Created:** 2026-05-28 14:47 UTC  
**Last Updated:** 2026-05-28 14:47 UTC
