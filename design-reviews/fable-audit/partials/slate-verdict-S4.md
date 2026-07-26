# Adversarial Skeptic Verdict — S4

**Proposal:** S4 — "Honest arrival: kill the 'N flags nearby' lie and surface the denied-location banner (CRITICAL)"
**Resolves:** L3-2 (CRITICAL), L7-03 (copy half), L3-13, L3-8
**Verdict:** **FIX** (sound; one concrete condition on the denied/undetermined banner branch)

---

## Per-rail verdict

| Rail | Result | Basis |
|---|---|---|
| tracesToFinding | **true** | All four cited IDs verified in `02_findings.md`; the code sites match at HEAD. |
| wcagFloorHeld | **true** | Improves 4.1.3 truthfulness; no AA regression. Live-region wrapper untouched. |
| glassLawHeld | **true** | No color/floor/blur/box-none/GlassSurface touch. Pure copy + state gating. |
| protectPreserved | **true** | PROTECT-6/1/10 verified intact (see below) — but see FIX condition. |
| rnExpoFeasible | **true** | Web reach is via the *pill live region* + `role=alert` banner (both web-real); the L3-8 leg is a string-swap, not a new web announce. |
| accessNotTradedForPolish | **true** | No hidden access regression; this IS an access + honesty gain. |
| arbiterReRunPresent | **true** (n/a) | Touches no color/floor/severity value → rail auto-satisfied. |

---

## What I verified (not trusted)

**The copy defect is real and exactly located.** `MapScreen.tsx:1277-1283` — the pill reads
``` `${flags.length} flag${flags.length === 1 ? '' : 's'} nearby` ``` in the else branch.
`flags.ts:606-615` (`listFlags`) and `:652-671` (`listFlagsPage`) have **no lat/lng predicate** —
the count is geo-unbounded, so "nearby" is false-by-construction in every state. Confirmed.

**The banner-gating defect is real.** `permissionDenied` is set `true` at exactly one site —
`MapScreen.tsx:999`, inside `requestLocation` — and the banner renders only when it is true
(`:2004`, `accessibilityRole="alert"`). The mount effect (`:1043-1061`) clears `setLocating(false)`
on the non-granted branch but never sets `permissionDenied`. So arrival never enters the honest
denied state. Confirmed against both L3-2 and L7-04.

**The query is correctly forked OUT.** S4's FORKS-TO-SKY line names Sky-note #1 (proximity
architecture) and explicitly does NOT touch `flags.ts` fetch scope or the realtime viewport gate.
Verified this is the correct scoping — the geo-scoped-query decision is genuinely a data-layer call
(`sky-notes.md` #1), and S4 scopes only the UI honesty half. Clean.

**The RN/Expo web-reach claim survives scrutiny (the rail that would most plausibly kill this).**
`02_findings.md:1166` is explicit about what survives on web: *"liveRegions on persistent elements
(map status pill, severity hint, bulk count) and `role=alert` mounts (anon banner, permission-denied,
empty-filters)"* — and what dies: *"the auto-list's count"* (`NearbyFlagsModal.tsx:73`,
`announceForAccessibility`). Mapping this onto S4:
- The **pill** carries `accessibilityLiveRegion="polite"` (`MapScreen.tsx:1275`) → its honest string
  reaches web SR. ✓
- The **denied banner** is a `role=alert` mount (`:2007`) → it announces on web arrival. ✓
- The **L3-8 announcement** (`NearbyFlagsModal.tsx:61-75`) is `announceForAccessibility`, dead on web —
  and S4 does **not** claim to fix web SR via it. Field (3) correctly attributes web reach to the
  *pill*, and characterizes the L3-8 fix as "stops the SR announcement contradicting the visible
  banner" (a native-truth benefit). It is a *string selection* between two strings passed to an
  already-native-only call — it introduces no NEW dead web announcement. This is exactly the
  distinction the rail protects, and S4 stays on the right side of it. **Not dead on arrival.**

**PROTECT verification (each claim checked, not trusted):**
- **PROTECT-6** (locating fix + `location.test.ts`): S4 adds `setPermissionDenied` *beside* the
  existing `setLocating(false)` in the 'clear' branch and does NOT modify `initialLocationAction`.
  `location.test.ts` only asserts `initialLocationAction(status)` return values (`'fetch'`/`'clear'`),
  which are untouched → tests stay green, the spinner-clear that closed the prior CRITICAL hang is
  preserved. **Holds.**
- **PROTECT-1** (Nearby list as accessible twin): the L3-8 leg touches only the *opening
  announcement* string, never row content (`:125-129`) or the honest visible notice (`:198-204`).
  **Holds.**
- **PROTECT-10** (Home's honesty law): S4 extends the honesty principle to the Map pill; does not
  touch Home. **Holds.**

**No collision.** S4 is the sole owner of the pill/banner copy and the mount-path gating. S6
references the pill only for occlusion geometry, not its copy. No disposition override exists for
L3-2/L3-8/L3-13.

**L3-13 resolution is legitimate (copy half only).** The finding's core defect is the misleading
"nearby" count over a one-pin viewport; making the count say "N reports loaded" defuses the
count/picture *mismatch* without a fit-to-flags feature. The picture-half (edge cues / bounds-fit)
is knowingly deferred as a Fork #1 consideration — honest scoping, consistent with the finding's own
"count wording escalated separately in L3-2" note.

---

## The one real defect → FIX condition

**`initialLocationAction` collapses `'undetermined'` and `'denied'` into the same `'clear'` result**
(`location.ts:78`; locked by `location.test.ts:20-27`). S4's field (1) says to set the banner-state
"when `initialLocationAction` returns `'clear'` for a denied/undetermined status," and field (7)'s
guard test says to pin `permissionDenied` "for denied/undetermined status." Taken literally, this
would set `permissionDenied = true` for a **first-run user who has never been asked** (status
`'undetermined'`, prompt deliberately deferred to onboarding per `MapScreen.tsx:1039-1042`). That user
would then read **"Location access is off. Turn it on…"** — which is a NEW false statement (they
denied nothing), i.e. an honesty fix that manufactures a fresh first-run lie. Replacing one L3-2
symptom with another is exactly the failure a skeptic must catch.

This is a FIX, not a KILL: the raw `status` string IS available in the mount effect
(`MapScreen.tsx:1045`, `.then(({ status }) => …)`), so the branch can and must distinguish the two
cases. The idea, mechanism, and scoping are otherwise sound.

**fixConditions:**
1. Gate the arrival banner on **`status === 'denied'` only**, NOT the whole `'clear'` branch — OR use
   a **status-neutral, first-run-safe** message that is true for an un-asked `undetermined` user
   (e.g. an "off / not enabled — turn on to find barriers" frame that does not assert the user
   *denied* access). Do NOT show "Location access is off" to a never-prompted first-run user.
2. The new guard test (field 7) must pin `permissionDenied`/banner-state for **denied**, and must
   pin that a first-run **undetermined** arrival does **not** assert a false "access is off" claim —
   so the undetermined case can't silently regress into a lie.
3. Keep the banner re-word (finding-job framing + web-accurate "browser's site permission" rather
   than "device Settings") — this is an extension toward PROTECT-11's truth voice and should stay.
4. State plainly in VERIFICATION that the L3-8 announcement leg benefits **native SR only**
   (web routes the honest ordering claim through the pill live region, not the dead
   `announceForAccessibility`) — the proposal already implies this; make it explicit so no downstream
   builder mistakes it for a web-SR fix.

Nothing above requires a data-layer change; all four conditions are UI-local and preserve every
cited PROTECT item.
