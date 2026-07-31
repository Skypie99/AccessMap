# PHASE B — FIX LOG (bank-as-you-go)

**Branch:** `a11yqa/1-fix-train` off the audited tip `5ab3f0c`. One commit per fix; guard test with non-vacuity proof (RED against the defect, GREEN after) on every behavioral fix. STOP on branch — Sky merges.
**Provenance:** Phase B running on Fable 5 max effort (at/above the Opus 5 floor the train sets; Phase A same window family, banked separately).
**Fix order:** Blocker → High → Medium. Low = parking lot (close-out). C-1/C-2 = Sky-gated.

| # | Finding | Tier | Commit | Guard + non-vacuity | Gates at commit |
|---|---|---|---|---|---|
| 1 | A11Y-212 — notification toggles announce-but-inoperable | **Blocker** | `d57b65f` | A11Y-212 guard in NotificationPreferencesScreen.test.tsx; RED 9-fail pre-fix → GREEN 19/19 | suite 19/19 · tsc 0 · eslint touched-files clean |
| 2 | A11Y-203 — sign-in client validation silent on iOS/web | High | `9464454` | new SignInScreen.test.tsx (announce per branch); RED 3-fail pre-fix → GREEN 3/3 | suite 3/3 · tsc 0 · eslint clean |

| 3 | A11Y-202 — Nearby list no focus-in (incl. SR auto-open) | High | `c104a08` | new NearbyFlagsModal.focus.test.tsx (behavioral, RendererProxy handle mock); RED 2-fail pre-fix → GREEN 2/2 | suite 2/2 · tsc 0 · eslint clean (1 pre-existing carried warning at :203) |

| 4 | A11Y-201 — focus-in absent on 29/36 dismissables (SR-070) | High | `a654b52` | new focusOnOpen.guard.test.ts (source census, ALLOWED markers, rot tripwire); RED 23-file violations → sweep → GREEN | **full jest 189 suites/2838+84todo/0** · tsc 0 · lint 0/80 exact |

| 5 | A11Y-213 — labeled containers swallow actions ×3 (incl. PROTECT-2 card) | High | `0c6c52d` | new accessibleParentTrap.guard.test.ts (site-pinned tag parse); RED 3/3 → GREEN 3/3 | tsc 0 · adjacent Map suites green · lint carried-only |

| 6 | A11Y-214 — 6 swallowing Pressables (incl. SR-040, SR-072) | High | `a17103d` | 6 site pins added to accessibleParentTrap.guard; RED 6/6 → GREEN 9/9 | tsc 0 · 11 adjacent suites green · eslint clean |

| 7 | A11Y-223 — Home Clear-search 36→44 (slop math) | Med | `b0b0cbb` | 44pt assertion in trap guard; RED at hitSlop 10 → GREEN | tsc 0 · eslint clean |
| 8 | A11Y-221 — lightbox swipe-only paging (2.5.7) | High | `8392a71` | 4 behavioral tests in PhotoGallery.test; RED 3 → GREEN 16/16 | tsc 0 · eslint clean (carried warn) |

| 9 | A11Y-228 — keyboard covers focused inputs ×3 | High | `b5ce96d` | new keyboardAvoidance.guard.test.ts; RED 3/3 → GREEN 3/3 | tsc 0 · dismissal/focus guards green · eslint clean |

| 10 | A11Y-226 — guest sign-in destroyed report draft (3.3.7) | High | `95755c9` | 2 tree-swap seam tests in ReportFlagModal.test; behavioral RED → GREEN 43/43 | tsc 0 · eslint clean · strings PROPOSED per S-8 |
| 11 | A11Y-229 — dark white-on-brand ×7 → ctaFill (SR-112 run) | High | `70829eb` | brandInkAA.guard (swaps + deliberate keeps); RED 5/5 → GREEN · **arbiter exit 0 both themes** (a11yqa-brand-ink-stacks.json) | 48 tests green · tsc 0 |

**★ MILESTONE: Blocker + ALL 9 Highs FIXED (+A11Y-223 Med). Remaining: 12 Med · Lows parked · C-1/C-2 Sky-gated.**

| 12 | A11Y-230 — comment timestamp ink fails both themes | Med | `ed84609` | source pin in brandInkAA.guard; **arbiter exit 0 both themes** (a11yqa-timestamp-ink-stacks.json) | 19 tests green · tsc 0 · eslint clean |

| 13 | A11Y-204/205/206/207 — the status-message cluster | Med ×4 | `368674b` | new announceCoverage.guard; **8/8 assertions RED against pre-fix HEAD sources**, GREEN 10/10 | 51 tests green · tsc 0 |
| 14 | SR-042 spoken distance + A11Y-208 map-gesture focus return | Med ×2 | `cba6851` | guard pins added; 3/3 RED vs pre-fix HEAD → GREEN 12/12 | 37 tests green · tsc 0 |
| 15 | A11Y-215/216/217/234 + A11Y-218/220 | Med ×4 + Low ×2 | `3c948e4` | 3 new class-wide scanners (labelInName, toggleStateWeb, decorativeHiding); 16 + 14 + 69 sites | **full jest 195/2879/0** · tsc 0 · lint 0/80 exact |
| 16 | A11Y-234 pass 2 — leaves hidden on iOS ONLY | Med (same finding) | `a2ae39f` | 39 more leaves + 3 hand-written conditional/forwarded mirrors | tsc 0 · 16 tests green |
| 17 | A11Y-222 — non-drag refresh on 4 list sheets | Med | `d32e85c` | guard in announceCoverage; 3 screens routed to Sky's mockup gate | 243 tests green · tsc 0 |
| 18 | The Low parking lot — 8 items | Low ×8 | `e6a289b` | 231/233/209/219/211/232/L3-1/210 | tsc 0 · eslint 0 errors |

## ★ PHASE B COMPLETE

**Every Phase-A finding is dispositioned. Conservation table + claims verdict: `CLOSE-OUT.md`. Device rows: `DEVICE-SCRIPT.md`.**

## Final Gate

| Gate | Result |
|---|---|
| `npx jest --ci -w 3` | **195 suites / 2879 passed / 0 failed / 84 todo** (clean run) |
| `npm run typecheck` | **0 errors** |
| `npm run lint` | **0 errors / 80 warnings** — the exact baseline |
| Arbiter proof sets | 13/13 ratified + **2 new** (brand-ink, timestamp-ink) all exit 0 |
| `GlassSurface.tsx` PROTECT | 0 changed lines |
| Agent-applied migrations | 0 |

**Flake note, recorded honestly:** one later gate run showed `ReportFlagModal.test.tsx` failing a rate-limit assertion. It passes **3/3 in isolation** and passed in the clean full run; the failing run happened at load average 18–28 with swap at 6.8 GB of 8 GB — i.e. under contention from this session's own background jobs. That is the repo's documented `ReportFlagModal` flake class (gate quirks: "passes in isolation"), not a regression. Re-verify on a quiet machine before treating it as anything else.

## Not done, and why (all recorded in CLOSE-OUT §2)

**GATED-AWAITING-SKY:** C-1 (README wording) · C-2 (republish the hosted privacy policy) · A11Y-222 for Tasks/Profile/Admin (primary chrome → mockup gate).
**PARKED-with-reason:** A11Y-218 (7 inert labels, per-site judgement) · A11Y-225 (latent, nav-config risk) · A11Y-227 (one dual-purpose password field) · L1-1 (a11y lint plugin = dependency change; materially mitigated by 8 new source-scanning guards).
**DEVICE-PENDING:** A11Y-224 + every row in `DEVICE-SCRIPT.md`.

## Remaining queue

High: A11Y-203, 202, 201, 213, 214, 221, 226, 228, 229.
Med: A11Y-204, 205, 206, 207, 208, 215, 216, 217, 222, 223, 230, 234, SR-042.
Then: full-gate run · device script final · close-out conservation table · claims verdict handoff (C-1/C-2 → Sky).
