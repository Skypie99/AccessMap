# Adversarial Skeptic Verdict — S11

**Proposal:** S11 — "Data-layer timeout + honest 'still trying' escalation (the danger-path silence fix)" (resolves L7-01; effort M; tier Signature ★SIGNATURE; FORKS-TO-SKY: none).
**Verdict:** **FIX**
**Reviewed at:** AccessMap @ main `82e738b` (post-glass-chain HEAD). Read-only audit.

---

## Per-rail verdict (true = rail satisfied)

| Rail | Verdict | Basis |
|---|---|---|
| tracesToFinding | **true** | Cites L7-01 (primary) + two verified riders. |
| wcagFloorHeld | **true** | Net WCAG 4.1.3 improvement; no AA regression. |
| glassLawHeld | **true** | Data-layer + copy/state only; no blur/floor/`GlassSurface`/box-none/virtualization touch. |
| protectPreserved | **true** | PROTECT-8/6/15/2 verified intact; PROTECT-9 intact on read path (write-path caveat → fixConditions, not a regression of the crown jewel). |
| rnExpoFeasible | **true** | Uses an always-mounted `accessibilityLiveRegion` (the status-pill pattern), NOT the dead `announceForAccessibility`; `Promise.race` is plain RN JS. |
| accessNotTradedForPolish | **true** | No hidden access regression; change is access-positive. |
| arbiterReRunPresent | **true** | Touches no color/floor/severity token — vacuously satisfied; proposal correctly claims "No AA color traded." |

---

## What I verified in the code (did not trust the write-up)

**The core finding is real and CONFIRMED.**
- `src/lib/location.ts:44-58` — `getCurrentPositionWithTimeout` races GPS against a 15s timer, with the exact rationale S11 quotes ("expo-location can hang indefinitely… leaving the caller stuck on a spinner forever"). ✔
- `src/lib/supabase.ts:29-38` — `createClient` is built with **no custom `fetch`, no `AbortSignal`, no timeout**. ✔
- `grep 'AbortController|AbortSignal|Promise.race|setTimeout'` across `supabase.ts` + `flags.ts` + `flagsStore.tsx` = **zero hits** in the data layer. The GPS-vs-data asymmetry S11 is built on is genuine. ✔
- L7-01 in `02_findings.md:51` = **HIGH, CONFIRMED (0 skeptic-refuted)**; verdicts.md:106 confirms HIGH stands (eventual honest state arrives, but the undifferentiated-middle window on the danger path justifies HIGH). ✔

**Both bundled riders are real, not padding.**
- "Unknown error" rider (02_findings.md #14): the Map `loadError` banner (`MapScreen.tsx:1901`) renders `{loadError}` verbatim. `errors.ts` `NETWORK_RE = /failed to fetch|network request failed|networkerror/i` does **not** match an abort's message ("The operation was aborted" / DOMException / empty → `'Unknown error.'` fallback at `errorMessage`'s tail). So an offline-abort path skips the friendly `NETWORK_TROUBLE` copy. Rider CONFIRMED; the fix (route the abort through the network branch) adopts existing `errors.ts` copy, invents nothing. ✔
- "Loading flags…" copy at `MapScreen.tsx:1279`; the L7 copy-observation register (L7.md / 02_findings.md:1438) already flags reserving it for cold load vs "Updating…" over live data. Rider CONFIRMED. ✔

**RN/Expo feasibility — the make-or-break rail — passes.**
S11 explicitly routes the escalation announcement through "a real, persistent live region," NOT `announceForAccessibility`. Verified the mechanism it leans on already works: the status pill (`MapScreen.tsx:1275`) is an always-mounted node carrying `accessibilityLiveRegion="polite"`; an always-mounted live region DOES translate to `aria-live` on RN-web (the same reason the severity echo line and this very pill announce today). This is the L6-02-safe path, not the web no-op trap. The `Promise.race` timeout mirror is plain JS. **Not dead on arrival.** ✔

**PROTECT claims — verified, not trusted.**
- **PROTECT-8** (shaped honest loading/terminal states): S11 fills the *unbounded middle* between the shaped skeletons and the terminal cards; it does not touch the terminal error cards or skeletons. Verified the terminal states it must not disturb exist (Home error card `HomeScreen.tsx:283-297`, Map banner `:1901-1927`). Preserved. ✔
- **PROTECT-6** (GPS race / battery posture, zero watchers): the fix *mirrors* the race and adds zero pollers/intervals. Verified L7 PROTECT-2 nomination — "zero `watchPositionAsync` anywhere." A one-shot `setTimeout` per request is not a poller. Preserved. ✔
- **PROTECT-15** (store fetch discipline — `fetchSeqRef` stale-discard + SWR paint): a timeout composes with, and does not replace, the stale-discard/SWR logic. Preserved (composition claim is plausible and the fix doesn't rewrite the store's sequencing). ✔
- **PROTECT-2** (empty-filters recovery card): verified intact at `MapScreen.tsx:1929+` (role=alert + per-axis reset chips); S11 only *aspires* to it as the template and does not edit it. Preserved. ✔

---

## The one real tension → the FIX condition

S11 field (1) says: *"race every data read **and write** against a timeout."* The write path is `createFlag` / `createAnonFlag` / `uploadFlagPhoto` (`flags.ts:797 / 1270 / 536` — `.insert()` / `.rpc()`). A hard timeout-race on a **write** carries a classic hazard the GPS race does not: a request that has already reached the server and committed the row, but whose *response* is merely slow, gets its client-side promise aborted at the threshold. The user then sees a false "still trying," and the honest reflex is to resubmit — producing a **duplicate flag**, which the anon **5/day rate limit** (`anonRateLimit.ts`, cited by S10) then punishes. This is the very doubt-resubmit harm S10 is written to prevent, re-manufactured by an over-broad write-timeout.

This is **not** an access violation, a GLASS breach, or an infeasibility — it is a data-integrity/idempotency gap. PROTECT-9 (report-submit hardening: the synchronous `submittingRef` double-submit guard at `ReportFlagModal.tsx:277-282`, `reset()`-only-on-success, partial-failure honesty) is verified intact and guards *in-session* double-taps, but it does **not** cover an abort-then-manual-resubmit against an already-committed row. Hence: sound idea, one rail-adjacent condition.

**fixConditions (must be met for KEEP):**
1. **Scope the hard timeout-abort to READS.** For WRITES (`createFlag`/`createAnonFlag`/`uploadFlagPhoto`), do NOT abort the in-flight insert at the threshold. Instead surface the "still trying — check your signal" state as an **escalation-only** overlay while the write continues, OR — if a write must be abortable — pair the abort with server-side idempotency/dedup (e.g. a client-generated idempotency key or a short-window duplicate guard) so a committed-but-slow write cannot become a duplicate report. State this write/read split explicitly in field (1) and (6).
2. **Name the guard test for the write path too.** Field (7) already pins "data read/write racing a timeout"; extend it to assert that a write which resolves *after* the escalation threshold does not double-insert (or that the write path surfaces escalation without aborting).
3. Leave the read-half exactly as written — it is clean.

Everything else ships as-is. The read-side danger-path fix (the mission core: "an empty map reads as no barriers") is correct, RN-feasible, and PROTECT-safe; the two riders are verified and adopt existing copy.

---

## Verdict rationale

All seven rails are **satisfiable and currently satisfied** as written for the read path; the only defect is an over-broad write-timeout that risks a data-integrity duplicate — a concrete, bounded condition, not a fundamental rail violation. Per the verdict rule, a sound idea needing a concrete condition = **FIX**, not KILL (nothing is infeasible or access-trading) and not KEEP (the write-path duplicate risk is a real, actionable gap the assembler must close).
