# Accessibility & UX Pass — AccessMap — 2026-06-01

**Auditor:** Alex (Accessibility Engineer) · **Standard:** WCAG 2.2 AA (+ iOS HIG / Material)
**Branch:** `qa-alex/accessmap-2026-06-01` (off `main` @ `5fb80ce`) · **Do not merge — Sky's gate**
**Verification:** typecheck ✅ green · Jest ✅ 94/94 suites, 1553 passed · 10 fixes committed, 0 regressions

> AccessMap exists for disabled users, so accessibility is treated as core functionality, not a
> lint score. This was a final pre-tester sweep of the **entire** app — every screen, modal, form,
> the map, and custom controls — walked the way a VoiceOver/TalkBack, keyboard, low-vision,
> colour-blind, motor-impaired, or cognitively-loaded user would.

---

## ⭐ DECISIONS FOR SKY (read first)

1. **Git entanglement during the parallel audits — needs a cleanup decision.**
   The three audits (me, Steve/security, Peter/perf) ran against the same repo. Peter isolated his
   work in a git **worktree** (`.claude/worktrees/qa-peter-perf`) — correct. Steve and I both worked
   in the **shared** main checkout, and the working-tree HEAD silently switched to `qa-steve` mid-session,
   so my first three a11y commits **landed on `qa-steve`**, interleaved with Steve's security commits.
   - I recovered clean copies of all my work onto `qa-alex` via a fresh isolated worktree at
     **`/Users/skypie/AccessMap-qa-alex`**, and finished the pass there. `qa-alex` is now correct and
     self-contained (`git diff main..qa-alex` shows only my 13 files).
   - **`qa-steve` still contains 3 of my a11y commits** (`f6bd898`, `8ddb534`, `02b6317`) mixed into its
     history. **Action:** when reconciling, treat **`qa-alex` as authoritative for accessibility**, and
     have Steve drop/rebase those 3 commits out of `qa-steve` so his diff is security-only. Nothing is
     lost either way. Going forward, give every parallel agent its own worktree.

2. **Report delivery — not emailed.** Per the Morgan-only / no-external-send rule (Constitution Art. 9),
   I did **not** email this. It's saved to `qa-reports/`. I can stage a Gmail **draft** (not send) on
   request, or Morgan can deliver it — your call.

3. **Audit base.** You merged `ui-polish` into `main` (`5fb80ce`) mid-planning, so `main` *is* the
   polished tester build. I branched off `main` as the task asked — no deviation. The earlier
   "off ui-polish?" question is moot.

4. **One contrast fix is proposed, not applied.** `textSubtle` (#999, ~2.85:1) is used for tertiary
   text/chevrons below AA. Fixing it means changing a **design-system token** (ripples app-wide, light +
   dark) — that's Dani's lane and a "ripples widely" change, so it's **propose-only** (details below).

5. **Nothing in scope touched** location/disability-data collection, auth, RLS, schema, the database,
   or any paid dependency. All fixes are additive a11y attributes. No privacy-sensitive surface changed.

---

## Summary

The app is in **excellent** accessibility shape — multiple prior passes plus the polish merge already
delivered the screen-reader list alternative to the map, severity-as-text everywhere, labelled forms,
dark mode, reduced-motion gating, and 44pt targets (~1,380 a11y attributes across the tree). So this
pass was about catching the **remaining edge cases**, and it found two genuine *operability* bugs
(controls a screen-reader user literally could not activate) plus a set of smaller gaps.

- **Journeys walked:** onboarding → sign-in/guest → map (browse, filter, saved places, heatmap, report)
  → tasks triage (verify/resolve/reject, bulk, search/sort) → flag detail (+ photos, comments, status
  history) → profile (points, tiers, sub-modals) → settings (dark mode, help, feedback, about) → admin.
- **10 fixes committed** (2 High, 4 Medium, 4 Low) across 12 files; typecheck green after each.
- **7 proposals** written up (not applied).

---

## Barriers fixed (branch `qa-alex/accessmap-2026-06-01`)

### HIGH — real operability bugs (a screen-reader user could not complete the task)

**1. Real-time + Push toggles couldn't be flipped by a screen reader** · blind/low-vision · WCAG 4.1.2 / 2.1.1
`src/screens/ProfileScreen.tsx` (realtime), `src/screens/SettingsScreen.tsx` (push) — commit `1b53c9a`
- *Barrier:* `accessibilityRole="switch"` sat on a wrapper `View` with **no press handler**, while the
  real `<Switch>` (which owns `onValueChange`) was hidden from AT. VoiceOver/TalkBack announced the
  switch correctly, but double-tap hit the handler-less View — the toggle never changed state.
- *Fix:* moved the accessible identity (role + label + hint + state) onto the `<Switch>` itself and kept
  it in the a11y tree, mirroring the already-correct `NotificationPrefsModal`.
- *Verify (VO/TB):* Profile → "Real-time updates", Settings → "Push notifications". Focus the switch,
  double-tap → it must flip and announce "on/off". Repeat with TalkBack.

**2. Admin moderation buttons unreachable on iOS VoiceOver** · blind/low-vision admins · WCAG 4.1.2 / 2.1.1
`src/screens/AdminScreen.tsx` — commit `1afbb15`
- *Barrier:* each flag card `<View>` was `accessible={true}` while containing the **Remove** and
  **Dismiss** buttons. On iOS, an `accessible` container collapses its subtree into one element, so
  VoiceOver couldn't focus or activate those buttons — a moderator using VoiceOver could read a flag
  but not act on it. (Bonus find: severity on the card was **colour-only** — a 10px dot, no number —
  once the composed label was removed, 1.4.1.)
- *Fix:* removed `accessible` from the card (children expose themselves), added visible "Severity N"
  text, and gave the list `accessibilityRole="list"`.
- *Verify (VO):* Admin tab → swipe through a card → you must reach and activate "Remove … flag" and
  "Dismiss … report" as separate buttons; severity reads as a number.

### MEDIUM

**3. Flag-detail changes were silent to assistive tech** · blind/low-vision · WCAG 4.1.3
`src/components/FlagDetailModal.tsx` — commit `bc6b28b`
- *Barrier:* posting a comment, deleting a comment, and an under-threshold reopen request all changed
  the UI with no announcement — no confirmation for AT users.
- *Fix:* `announceForAccessibility('Comment posted' / 'Comment deleted' / "<N> more requests needed")`.
- *Verify:* with VO/TB on, post then delete a comment; submit a reopen request — each must be spoken.

**4. Leaderboard rows dropped rank + "you"** · blind/low-vision · WCAG 4.1.2 / 1.3.1
`src/screens/LeaderboardScreen.tsx` — commit `a87508b`
- *Barrier:* the row built a full label (rank + name + points + "you") but the row `View` lacked
  `accessible={true}`, so the composed label was discarded and the (hidden) rank + "you" badge were lost.
- *Fix:* added `accessible` so the whole row reads as one element.
- *Verify (VO/TB):* Profile → leaderboard → each row announces rank, name, points, and "you" on your row.

### LOW

**5. Sign-up error mislabelled + low-contrast placeholders** · all / low-vision · WCAG 3.3.1 / 1.4.3
`src/screens/SignInScreen.tsx` — commit `0cece24`
- A failed **sign-up** showed the alert title "Couldn't sign you in" (the error branch ran for both
  modes) → made it mode-aware. Input placeholders were `rgba(255,255,255,0.35)` (~2.8:1) → bumped to 0.5
  (~4.6:1, AA), still clearly dimmer than entered text.

**6. Report FAB gave no reason when dimmed** · blind/low-vision · WCAG 3.3.2 / 4.1.2
`src/screens/MapScreen.tsx` — commit `452a259`
- The FAB is disabled until location is on; its hint always described the enabled behaviour. Made the
  hint explain the disabled cause and point to the recenter button. (Location-request flow untouched —
  privacy-sensitive.)

**7. Nearby-list title wasn't a heading** · blind/low-vision · WCAG 1.3.1 / 2.4.x
`src/screens/NearbyFlagsModal.tsx` — commit `cbfaadd`
- `accessibilityRole="header"` sat on the container `View` (which also wraps Close), so the rotor found
  no heading. Moved it onto the "Nearby flags" title. (This list is the map's primary blind-user path.)

**8. Decorative emoji leaked to TalkBack** · blind/low-vision · WCAG 1.1.1
`src/components/MyWatchedModal.tsx` (🔎), `src/components/LeaderboardModal.tsx` (🏆) — commit `ecdfa48`
- `accessibilityElementsHidden` is iOS-only; added `importantForAccessibility="no-hide-descendants"` so
  they're hidden on Android too. (LeaderboardModal is legacy — see proposals.)

**9. Status-history modal ignored Reduce Motion** · vestibular/migraine · WCAG 2.3.3
`src/components/StatusHistoryModal.tsx` — commit `fab5ab6`
- Always slid up, unlike its parent. Gated `animationType` on `useReducedMotion()`.

**10. Address-search modal didn't contain focus** · blind/low-vision · WCAG 2.4.3
`src/components/AddressSearchModal.tsx` — commit `944b6f1`
- Missing `accessibilityViewIsModal`, so VO focus could wander onto the map behind it. Added it.

---

## Proposals (NOT applied — need your review)

1. **Raise the `textSubtle` token to AA** · low-vision/colour-blind · WCAG 1.4.3 / 1.4.11
   `src/theme.ts`. `textSubtle: '#999'` is ~2.85:1 on white — used for hints (`cardHint` "tap to view on
   map"), chevrons, char-counter, counts. The token's own comment says "only for non-essential text or
   18pt+", but it's used on small supplementary text. *Proposed:* bump to ~`#6E767D` (≈4.6:1 on white)
   and re-check the dark-mode value (≥4.5:1 on the dark surface). One-line per palette, but it **ripples
   app-wide** and is a design-system call (Dani) — that's why it's not auto-applied. Risk: low; visual
   change is subtle. Effort: ~15 min + a visual spot-check.

2. **Photo zoom alternative when pinch-zoom lands** · motor · WCAG 2.5.7
   Today the photo lightbox shows the image contain-fit with no pinch-zoom, so there's no gap. *When* a
   zoom gesture is added (it's on the polish backlog), ship it with a button/double-tap zoom alternative.

3. **Broad raw `<Text>` → `AppText` migration** · low-vision (Dynamic Type) + brand
   ~160 raw `<Text>` remain (NearbyFlags, Admin, some modals). They scale, but lack the Dynamic-Type
   caps + brand fonts. This is a design-system sweep (Dani/Shamus), not an a11y blocker — propose as its
   own pass to avoid churn this close to testers.

4. **Web build accessibility** · keyboard/screen-reader (web) · WCAG 4.1.2 / 2.4.7
   `PlatformMap.web.tsx` (react-leaflet) markers lack `role`/`aria-label`; RN-web renders no focus rings.
   Web is secondary (testers are on iOS/Android), and this touches a load-bearing file — propose-only.

5. **Map-overlay / brand components use static `color`** · visual consistency (not a contrast failure)
   `LogoMark`, `CategoryIcon`, `HeatmapLegend` import the static `color` (light palette) rather than
   `useColor()`. They sit over map tiles / are brand marks, so contrast is fine, but in dark mode they
   won't visually match. Worth a look during a dark-mode polish pass. (Every actual **screen** correctly
   uses `useColor()` — dark-mode adoption is complete where it matters.)

6. **Uniform focus-move on modal open** · blind/low-vision · WCAG 2.4.3 (enhancement)
   No modal programmatically moves VO focus to its title on open. RN's `accessibilityViewIsModal`
   handles containment acceptably, so this isn't an AA failure — but a uniform `setAccessibilityFocus`
   pass would be a nice enhancement.

7. **Two cleanups:** `LeaderboardModal` is legacy (referenced only by a test; Profile uses
   `LeaderboardScreen`) — consider deleting it. And consider lightweight regression tests for the two
   toggle operability fixes (assert the `Switch` is queryable by role and not AT-hidden).

---

## SHARED-FILE edits (for merge reconciliation)

I deliberately did **not** touch `src/theme.ts`, the UI primitives, navigation, or `src/lib/`, to keep
conflicts with the security/perf audits minimal. Screen/component files I changed:

| File | What | Conflict watch |
|---|---|---|
| `ProfileScreen.tsx`, `SettingsScreen.tsx` | toggle a11y (localized to one row each) | low |
| `NearbyFlagsModal.tsx` | title heading role (1 line) | ⚠️ **Peter's perf audit also edits this file** (Image→`RemoteImage`); different regions, should merge clean |
| `MapScreen.tsx` | FAB hint (1 prop) | low |
| `AdminScreen.tsx`, `FlagDetailModal.tsx`, `LeaderboardScreen.tsx`, `MyWatchedModal.tsx`, `LeaderboardModal.tsx`, `StatusHistoryModal.tsx`, `AddressSearchModal.tsx`, `SignInScreen.tsx` | localized a11y attrs | low |

Reminder: 3 of my a11y commits are also sitting on `qa-steve` (Decision #1) — `qa-alex` is the clean copy.

---

## Remaining accessibility/UX risk going into testing

- **Device confirmation needed** for the two HIGH operability fixes and the announcements — they're
  correct in code but should be verified with real VoiceOver + TalkBack (steps above).
- **Dynamic Type at max** not yet device-tested; AppText caps + scrollable forms should hold, but verify
  no truncation/overlap on the densest screens (Report form, Profile, FlagDetail).
- **`textSubtle` contrast** (Proposal 1) is unfixed pending your design-token call.
- **Web build a11y** (Proposal 4) unaddressed — fine if testers are native-only.

---

## How to review

```bash
# the branch is checked out in an isolated worktree:
cd /Users/skypie/AccessMap-qa-alex
git diff main..qa-alex/accessmap-2026-06-01      # only 13 files, all additive a11y
git log --oneline main..qa-alex/accessmap-2026-06-01
# merge (your call):  git checkout main && git merge qa-alex/accessmap-2026-06-01
# discard:            git worktree remove /Users/skypie/AccessMap-qa-alex && git branch -D qa-alex/accessmap-2026-06-01
```

**Verify with assistive tech on real devices:**
- **iOS VoiceOver:** Settings → Accessibility → VoiceOver. Walk: Profile/Settings toggles flip on
  double-tap; Admin Remove/Dismiss are reachable; comment post/delete + reopen are announced; leaderboard
  rows read rank + "you"; address-search keeps focus inside the sheet.
- **Android TalkBack:** repeat the above; confirm no 🔎/🏆 emoji are spoken.
- **Reduce Motion** on: status-history modal snaps (no slide).
- **Large Text (max):** scan Report form, Profile, FlagDetail for truncation/overlap.
- **Grayscale / colour filter:** severity is always readable as a number (incl. Admin now).

## Suggested next improvements (1–2)
- **Apply the `textSubtle` AA bump** (Proposal 1) with Dani — it's the single highest-leverage remaining
  contrast win for low-vision users and it's nearly free.
- **Adopt isolated worktrees for every parallel agent** so the branch-entanglement in Decision #1 can't
  recur — it's the main process risk this round surfaced.
