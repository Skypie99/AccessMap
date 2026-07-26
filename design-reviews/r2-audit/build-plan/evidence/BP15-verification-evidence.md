# BP15 — the drawer passage + the guest Profile · verification evidence

**Branch:** `r2/bp15-drawer-guest` · **base** `edfcb08` (`r2/bp14-editorial-frame`) **→ tip** `c0ee449` · **date** 2026-07-18
**Provenance (disclosed, per S-10):** phase authored on Claude Fable 5 max (2026-07-15); **executed on Opus 4.8 ultracode max effort, all sub-agents max** — Sky's direction for this train, and Sky-approved this window (plan `~/.claude/plans/bp16-the-peppy-pascal.md`, approved).
**STOP:** built + green + **STOPPED on `r2/bp15-drawer-guest`**. NOT merged / pushed / built / deployed — Sky's hands.

> Context: BP16 was fired one phase early; BP15 had not run (no branch, §P ended at BP14). Sky chose to plan + execute BP15 in this window. This is that execution.

---

## Gates (all hard — all PASS)

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** |
| `npm test` | **2040 passed / 0 failed / 84 todo · 142/142 suites** (baseline 2029/0 at `edfcb08` + 11 new guards; +3 suites) |
| `npm run lint` | **0 errors / 77 warnings** — the BP14 baseline exactly (0 new; the sole listed warning is pre-existing in `NearbyFlagsModal.tsx`) |
| Arbiter (T10, MANDATED) | `r2-guest-profile-stacks.json` → **RESULT: ALL PASS, exit 0** |
| 7 immutable stacks files | **untouched** — tracked `map-stacks.json` byte-identical vs base (`git diff edfcb08 -- …map-stacks.json` empty); the other 6 are untracked and never edited |
| Diff scope | **intended files only** — committed `edfcb08..c0ee449` = exactly 9 tracked files (below). `.claude/launch.json` is a *pre-existing uncommitted* working-tree deletion, absent from every BP15 commit |
| Commit-plan items | all CLOSED (one deferred guard, forked with written reason — see Deferred guards) |

**Committed tracked diff (`edfcb08..c0ee449`, 9 files, +429/−48):** `HamburgerDrawer.tsx`, `HamburgerDrawer.exitLatch.test.tsx`, `reduceMotion.drawer.test.tsx`, `RootNavigator.tsx`, `ScreenFallback.tsx`, `ScreenFallback.test.tsx`, `GuestProfile.tsx`, `ProfileScreen.tsx`, `GuestProfile.test.tsx`. (Untracked-side artifacts: the arbiter sibling under `design-reviews/r2-audit/tools/`, this evidence file, and the DECISIONS append — all inside the untracked `design-reviews/` tree, so never in the tracked diff, per spec.)

---

## What shipped, per commit

- **C1 · `94f4171` · T12 warm + dress** (`RootNavigator.tsx`) — *verified*.
  - **WARM:** `DrawerHost` fires `import('@/screens/SettingsScreen').catch(()=>{})` on drawer-open (a new `useEffect` on `open`), plus the Admin chunk gated on `useIsAdmin() === true`. Extends the shipped Suspense-fallback-null warm-chunk pattern to the nav layer; dynamic import is cached, so repeat opens are no-ops; `.catch` swallows a cold-network reject (the Suspense boundary retries on real navigation).
  - **DRESS:** `ScreenFallback` renders the destination stage (`color.stage1` root → `ScreenStage` wash → a header-shaped static `Skeleton` pair) instead of a bare `ActivityIndicator`/`surfaceMuted`. Opaque primitives only → keeps M-54 opaque-system categorization (F3-01's sanctioned exception, not a material-train migration; ErrorBoundary crash fallback untouched). The `'Opening Settings — one moment'` line is PROPOSED-only → BP16 table; skeleton ships without it, so **`r2-settings-arrival-stacks.json` skipped** this phase.
- **C2 · `9fb637d` · T12 exit-latch + 220→token + test** (`HamburgerDrawer.tsx`, `reduceMotion.drawer.test.tsx`) — *verified*.
  - Local `rendered` latch drives Modal visibility (was `visible={open}`). Mount on open; on close keep mounted while the **existing** exit `Animated.parallel` plays (slide `base`/180 + fade `fast`/120, durations byte-intact), flip closed in `.start(({finished}) => !open && finished && setRendered(false))`. RM path: `setValue` snap + `setRendered(false)` same-tick (no timer). Sub-screens are independent Modals → latch never touches them. Reopen mid-close leaves `rendered` true (callback no-ops on `!finished`/`open`), completed exit leaves `slideAnim` at `-DRAWER_WIDTH` → next open starts off-screen.
  - `navigate()` `220` literal → `motion.duration.base` (retires the transition layer's last off-scale literal; RM branch stays 0). **Same commit (absorbed-FIX law):** `reduceMotion.drawer.test.tsx:55` `toContain(220)` → `toContain(180)`; the RM=0 assertions byte-intact.
- **C3 · `a5535f8` · T10 guest header** (`ProfileScreen.tsx`) — *verified*.
  - The `!user` branch renders the S8 editorial family (`ScreenHeader` eyebrow PROFILE / title "Your profile" / subtitle + `HeaderActions` menu+feedback) above the sign-in CTA, on the existing `ScreenStage`. TRUE render-parity with the signed-in header: eyebrow/subtitle = `color.inkOnStage` (the AA law), title default `textStrong` (no `titleColor` prop exists — spec over-specified), top safe-area inset added, `profileHeader` zero-padding. `drawer`/`setSharedModal` already component-scoped → zero new wiring. **No new copy** — all three strings pre-existed (see §No-new-copy). authLoading skeleton leg **dropped** (runtime-unreachable — code-inferred; see §Re-framing).
- **C4 · `c0ee449` · guards + arbiter** — *verified*. Arbiter sibling + 3 guard suites + 2 testability extractions (`ScreenFallback` → own module; guest state → `GuestProfile.tsx`, same rendered tree, relocated; guest-only styles moved, shared `profileHeader` stays on ProfileScreen).

---

## Arbiter decision (T10, MANDATED)

`design-reviews/r2-audit/tools/r2-guest-profile-stacks.json` proves the guest header inks **byte-pair the shipped signed-in recipe** on the raw stage — eyebrow/subtitle `inkOnStage` + title `textStrong`, over the arbiter-verified worst-case stage bases reused verbatim from the shipped derivation (`audit-stacks.json` rvChip bases): light `#CBDBF4`/`#D1E2FC`/`#E7F0FD`, dark `#1B2940`/`#14223A`/`#0F1F3F`/`#14151A`.

| scheme | pair | worst base | ratio | verdict |
|---|---|---|---|---|
| light | eyebrow/subtitle `inkOnStage` `#525C6B` | `#CBDBF4` | **4.83:1** | PASS |
| light | title `textStrong` `#222` | `#CBDBF4` | 11.35:1 | PASS |
| dark | eyebrow/subtitle `inkOnStage` `#AAAAAA` | `#1B2940` | **6.29:1** | PASS |
| dark | title `textStrong` `#f5f5f5` | `#1B2940` | 13.40:1 | PASS |

**RESULT: ALL PASS, exit 0.** No new inks; the pools are not deepened. The worst pair (light `inkOnStage` 4.83:1) is the *identical* ink+stage the signed-in header already ships and passes — this is a byte-pair proof, not a new risk. (`r2-settings-arrival-stacks.json` correctly absent — the T12 text line is PROPOSED-only, no ink shipped.)

---

## Guards (jest)

- `HamburgerDrawer.exitLatch.test.tsx` — **4/4**. Motion close latches the Modal mounted, then unmounts only on completion `finished:true`; an interrupted exit (`finished:false`) does not; RM close snaps same-tick; reopen re-mounts. (`Animated.parallel` is stubbed to capture the completion callback so the latch lifecycle is deterministic regardless of jest-expo's native-driver timing.)
- `ScreenFallback.test.tsx` — **2/2**. Renders `ScreenStage` + a 2-bar header-shaped `Skeleton`, **never** an `ActivityIndicator`; structure is RM-invariant.
- `GuestProfile.test.tsx` — **5/5**. Renders eyebrow/title/subtitle nodes + the `HeaderActions` pair; menu → `drawer.setOpen(true)`; feedback → `setSharedModal('feedback')`; CTA → the caller's `onSignInPress` (Fork 3 untouched — same button).

### Deferred guards (forked, with reason — nothing silently dropped)
- **drawer-open warm-import "exactly once" guard** — DEFERRED. Dynamic `import()` call-counting isn't cleanly mockable under jest-expo without an invasive seam (the module is also referenced by the `React.lazy` at the top of RootNavigator; jest module-caching makes "once" observationally the same as "at all"). Coverage instead: the preload is **typechecked** (fires on `open`, `.catch`, Admin gated on `isAdmin === true`) and **device-observable** — the warm path shows no interstitial, a Sky device item (§Sky). This is the only deferred commit-plan sub-item.

---

## Captures — device-deferred (honest)

Playwright is absent in this environment (per BP13/BP14 precedent), so the `probe-export`/`capture` rig can't screenshot here. The `profile-signedout__{light,dark}__390` pair and the drawer-dismissal frames (closing t60/t120, standard + rm) are **deferred to Sky's device gate**, not captured. The web tree + jest guards + the arbiter prove the logic; the frames are an eye-pass, not a correctness gate.

---

## Re-framing (code-inferred, not a skeptic claim)

The T10 spec's "authLoading skeleton leg" (F5-06) was **dropped, not built**: `App.tsx`'s `Gate` returns `null` while `loading` (`:141`), and `src/lib/auth.tsx` flips `loading→false` exactly once (in the initial `getSession()` `finally`) and never back — so `ProfileScreen` only ever mounts with `loading===false`, making its `if (authLoading)` branch runtime-unreachable dead code. Threading a Skeleton there would render for zero users. The branch is left untouched (out of scope to delete). *(Tagged code-inferred; adversarially re-verified — see §Adversarial verify.)*

---

## PROTECT — held

- **Presentation grammar (25/5):** the drawer stays its own hand-animated class — no new Modal mounts, `animationType="none"` preserved, the `reduceMotion.modalGate` guard stays green (2/2). ✓
- **Welded arrival → now welded departure:** the exit mirrors the arrival's structure (timing slide + fast fade), just made to actually render. ✓
- **Suspense-fallback-null warm chunks:** cited as the shipped reference pattern and extended to the nav layer — not forked. ✓
- **220ms delay-gate + pulse-token discipline (B5):** completed (last off-scale literal retired to a token), not re-opened; the RM=0 gate byte-intact. ✓
- **PROTECT-17 disabled-label:** untouched (reference only — the OnboardingCards replay Back nuance is a BP16 concern). ✓
- **`GlassSurface` / blur budget:** untouched (no blur added — dressed fallback uses opaque primitives). ✓

---

## Adversarial verify — 5/5 UPHELD, 0 refutations (Opus 4.8 max, S-10)

Five independent skeptics, each tasked to REFUTE one load-bearing claim (default-to-refuted). Four ran as a `Workflow` schema fan-out; the fifth (exit-latch) is re-run below.

- **Exit-latch correctness (F3-02/F3-07)** — **UPHELD (high).** Traced all 7 failure modes — stuck-open, premature unmount, reopen race, stale callback, effect deps, initial state, sub-screen handoff — no defect. The truth table on the closure-captured `open` is correct: only an *uninterrupted* close callback (`open===false && finished===true`) unmounts; any reopen/RM `setValue` stops the in-flight close animation first, forcing its callback to `finished:false` before it can reach `true` (the real guard is `finished`, not `!open` — same outcome). `setRendered` deps-exempt (stable dispatcher); `if (open) setRendered(true)` is at most one extra render, no loop; the drawer + the 3 sub-screen Modals are independent so the latch never strands a sub-screen. Guard suite 4/4. *(Note: the first attempt via the Workflow schema hit a StructuredOutput retry cap — a tooling failure, no verdict — so it was re-run as a plain-text adversarial pass.)*
- **Arbiter honesty (T10 AA)** — **UPHELD (high).** Re-ran the arbiter (exit 0). Confirmed the ink renders directly on the stage (no glass), the header sits top-left over poolA (poolB correctly excluded — its influence at the header is exactly 0), and the declared bases are byte-identical to the shipped `audit-stacks.json` rvChip derivation; the light `#CBDBF4` base is a 1/255 *darker* (conservative) rounding, so the reported 4.83:1 is pessimistic, not optimistic. The declared bases over-bound every real stage pixel under the header in both schemes.
- **RM guarantee** — **UPHELD (high).** RM handoff delay still `0` (the collapse touched only the non-RM operand); RM close snaps via `setValue` + same-tick `setRendered(false)` before the early return (no timer, the completion callback is never registered under RM); the RM=0 assertions are byte-intact and `toContain(0)` remains the load-bearing guard (would fail if the RM path regressed to 180). The 1-frame-later unmount from `visible={rendered}` is seamless (`slideAnim` already at 0).
- **authLoading unreachable** — **UPHELD (high).** Could not construct a reachable path: auth `loading` is monotonic `true→false` once (single `setLoading(false)`, no setter back to true), and `ProfileScreen` mounts only downstream of `App.tsx`'s `if (loading) return null` Gate. Dropping the F5-06 skeleton on dead code was correct.
- **No new copy** — **UPHELD (high).** Enumerated all 5 user-facing strings in `GuestProfile.tsx`; each pre-existed verbatim at `edfcb08` (md5-matched) — eyebrow/title from the signed-in header, subtitle + CTA label + button from the old guest branch. The only copy change is a *removal* (the SignInScreen Modal's `aria-label` relocated to the caller). Nothing rides to the BP16 table.

**Documented nit (recorded, not fixed — §PARKING-LOT):** the animation effect has no cleanup that stops an in-flight close animation, so a completion callback firing after an unmount *mid-close* would log a dev-only "setState on unmounted component" warning. **Unreachable in practice** — `DrawerHost` is a permanent single mount (never unmounts during app life) — and it is a transient dev warning, not a leak; the verifier judged it non-refuting. Left as-is to avoid churn on a landed commit for an unreachable path.

---

## For Sky to eyeball (NEEDS-SKY-DEVICE)

1. **Drawer open→close (motion):** panel and scrim leave together as one welded object (~180ms), no white flash; the sub-screen (Resources/How-to-help/About) appears right as the drawer finishes closing.
2. **Immediate reopen** after a close starts clean (panel from off-screen, no half-state).
3. **RM on:** drawer close is instant (snap), no dead wait before a sub-screen.
4. **Warm path:** opening the drawer then tapping Settings shows no interstitial on a normal network (the dressed skeleton only on a cold/slow load) — the device-observable proxy for the deferred import-once guard.
5. **Guest Profile** (sign out / web guest): the header family matches Home/Tasks (eyebrow PROFILE, title, subtitle, menu + feedback circles), reads correctly in **both** light and dark, and the sign-in CTA sits below — an eye-pass folding toward R2-D11/D3.
