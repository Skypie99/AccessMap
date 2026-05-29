# Feature Push — AccessMap — 2026-05-23 (continuation #2)

## Summary

Two more features built this turn, each on its own branch:

1. **Auto-open the accessible list when a screen reader is on (Phase 2)**
   Branch: `feat/auto-open-list-a11y-2026-05-23`
   Stacks on `feat/nearby-flags-list-2026-05-23` (depends on it).
   New `useScreenReader()` hook in `src/lib/accessibility.ts`; MapScreen
   uses it to auto-open `NearbyFlagsModal` once when VoiceOver / TalkBack
   is detected.

2. **First-run Onboarding cards**
   Branch: `feat/onboarding-cards-2026-05-23` (off `main`, independent).
   3 swipeable cards explaining flags / severity / points. Shown on
   first sign-in, gated per-user via `AsyncStorage` (already installed
   for Supabase auth — no new dependency).

**Typecheck:** green throughout on both branches.
**Status:** both complete, each one reviewable diff. Neither merged.
Branches are not pushed.

---

## Feature 3 — Auto-open accessible list (Phase 2)

### Spec as built

**What:** When the Map mounts and the system reports a screen reader
on, automatically open `NearbyFlagsModal` once. If the user closes it
explicitly, we leave them on the map — we don't re-open. Live: if the
user toggles VoiceOver/TalkBack mid-session the listener catches it
and (on first such event) opens the modal.

**Where:**
- New: `src/lib/accessibility.ts` — `useScreenReader()` hook (~40 lines).
- Updated: `src/screens/MapScreen.tsx` — imports the hook plus one
  `useEffect` and one `useRef`. ~16 lines added.

**User flow (for a screen-reader user):**
1. Sign in.
2. Map tab loads. The `useScreenReader()` hook reports `true`.
3. Within a tick of mount, `NearbyFlagsModal` slides up.
4. VoiceOver reads the modal header *"Nearby flags"* and starts
   reading the first list row.
5. The user navigates rows by swipe. Tapping a row centers the map on
   that flag with the callout open (same chain as Phase 1).
6. If they close the modal (tap **Close**), they're back on the map.
   The auto-open does *not* re-fire — they can re-summon it any time
   via the "📋 List" FAB.

**User flow (for a sighted user):** no change. `useScreenReader()`
returns `false` so the useEffect's body never runs. The FAB still
opens the modal manually.

**Components & data:** No new components. Just one hook and one
useEffect.

**Accessibility (the whole point):**
- The hook itself uses `AccessibilityInfo.isScreenReaderEnabled()` for
  the initial value and subscribes to `screenReaderChanged` for live
  updates. Cleans up its listener on unmount.
- Web and any platform that rejects the initial promise is treated as
  *"not on"* so the sighted experience remains the default fallback.
- The auto-open uses a `useRef` to guard against re-opening — respect
  the user. The point is to make the linear view immediately
  reachable, not to trap them in it.

**Assumptions documented:**
- "Once per Map mount" instead of "every Map focus." Map is the
  default landing tab; in a bottom-tab navigator it stays mounted.
  Re-tapping the tab doesn't unmount/remount, so this is effectively
  "once per app session." If a future change moves Map under a Stack
  Navigator that unmounts on push, revisit.
- We *don't* announce *"List opened automatically"* via
  `AccessibilityInfo.announceForAccessibility` — the modal's slide
  animation triggers VoiceOver to read the title naturally. An extra
  announcement would just step on that.

### Files / size

| File | Change |
|---|---|
| `src/lib/accessibility.ts` | +41 (new) |
| `src/screens/MapScreen.tsx` | +16 |
| **Total against `feat/nearby-flags-list-…`** | **+57**, 1 commit |

Commit: `5bf753b  Auto-open NearbyFlagsModal when a screen reader is
on (Phase 2)`.

### How to try it

```bash
cd ~/AccessMap
git checkout feat/auto-open-list-a11y-2026-05-23
```

**iOS simulator:**
1. `npm start` and open in the iOS sim.
2. Sign in.
3. With the sim focused, hit **Cmd + F5** to enable VoiceOver.
4. After a second, `NearbyFlagsModal` should slide up automatically.
5. Hit Cmd+F5 again to turn VoiceOver off. (Sighted users see no
   change to default behavior.)

**Android:**
1. Settings → Accessibility → TalkBack → On. Reopen the app.
2. Same behavior — modal auto-opens on Map mount.

**Sighted sanity check** (no screen reader on): modal should NOT
auto-open. FAB still works.

---

## Feature 4 — First-run Onboarding cards

### Spec as built

**What:** A full-screen Modal with 3 horizontally-swipeable cards,
shown once per user on first sign-in. The cards cover:

1. **📍 Welcome** — what AccessMap is and what flags are.
2. **🎯 Severity 1–5** — how the scale works, with the explicit note
   that meaning is carried by both color and number.
3. **⭐ Earn points** — the reporter/actor points loop.

A **Skip** button (top-right) and a primary action button (bottom —
*"Next"* on cards 1–2, *"Get started"* on card 3) both dismiss and
persist *"seen"* for this user.

**Where:**
- New: `src/lib/onboarding.ts` — `hasSeenOnboarding(userId)` /
  `markOnboardingSeen(userId)`. Uses already-installed
  `@react-native-async-storage/async-storage`.
- New: `src/screens/OnboardingModal.tsx` — the modal itself. Pure
  presentational: props `visible`, `onDone`. Parent owns visibility
  and persistence.
- Updated: `App.tsx` — extracted a small `SignedInArea` wrapper
  inside the existing `Gate`. It hosts `RootNavigator` plus the
  `OnboardingModal`, checks storage when the user is available, and
  on dismiss writes the flag and hides the modal.

**User flow:**
1. New user signs in for the first time on a device.
2. Modal slides up, full-screen.
3. They tap **Next** (or swipe horizontally) to move through the
   cards. Pagination dots highlight the current step.
4. On card 3 they tap **Get started**. Modal slides away. They land
   on the Map.
5. They sign out and back in — the modal does **not** reappear.
6. If a different user signs in on the same device, **they** see the
   modal once. (Storage key includes the user id.)
7. The "Skip" button at any step dismisses just the same as
   "Get started" — both mark the intro as seen.

**Components & data:**
- `CARDS` array — three plain `{ emoji, title, body }` objects. Easy
  for Sky to edit copy or add a fourth card without restructuring.
- One `useState` for the current index, one `useRef` for the
  ScrollView. Horizontal ScrollView with `pagingEnabled` is the
  built-in RN primitive — no `react-native-pager-view` dependency.
- Persistence: AsyncStorage. Key
  `@accessmap/onboarding_seen_v1:<userId>` — namespaced and versioned
  so a future revamp can bump `v1 → v2` and re-show the intro without
  touching unrelated storage.

**Accessibility:**
- Each card is one accessible unit. Its `accessibilityLabel` is the
  whole sentence: *"Step 2 of 3. Severity 1 to 5. When you report a
  flag, pick how bad it is. …"* — so a screen reader user gets the
  full card in one read rather than three nested elements.
- The decorative emoji is hidden from accessibility
  (`importantForAccessibility="no"` + `accessibilityElementsHidden`)
  since its meaning is already in the label.
- The dots row has its own announcement: *"Step 2 of 3"*. Individual
  dots are hidden.
- The **Next** button's label includes the current step so the screen
  reader user knows where they are:
  *"Next step. Currently on step 2 of 3. Button."*
- All three buttons (Skip / Next / Get started) have `minHeight: 44`.
  The Skip button additionally has `hitSlop: 12` since it's small.
- High-contrast text (`#222` on `#fff`, `#444` for body). Body has
  `lineHeight: 24` and `maxWidth: 360` so it stays a comfortable
  measure at large dynamic type.
- `pagingEnabled` ScrollView responds to VoiceOver's three-finger
  horizontal swipe.
- `onRequestClose` wired → Android back-button dismisses (and
  persists "seen", same as Skip).

**Assumptions documented:**
- **Per-device, not per-Supabase-account.** A user signing into the
  same account on a new device will see the intro again. This is the
  pragmatic choice — local storage is simple, no server round-trip,
  and the cost of an extra appearance on a second device is
  trivial. If you'd rather make it global, add a
  `seen_onboarding_v1 timestamptz` column on `public.users` —
  **propose-only**, with steps below.
- **Three cards, not four.** Started with the three highest-value
  topics (what / severity / points). Easy to add a fourth (e.g.
  "Verify and resolve to help") later — just push another entry into
  `CARDS`.
- **Skip behaves identically to Get started.** Both mark as seen.
  Discoverability of skip is good (top-right, all caps style) so
  users who want to bail aren't trapped. If you want Skip to *not*
  mark-as-seen so they get prompted again next launch, easy 2-line
  change.

### Files / size

| File | Change |
|---|---|
| `src/lib/onboarding.ts` | +40 (new) |
| `src/screens/OnboardingModal.tsx` | +235 (new) |
| `App.tsx` | +40 / -2 |
| **Total** | **+315 / -2**, 1 commit |

Commit: `95e7059  Add first-run OnboardingModal (3 swipeable cards)`.

### How to try it

```bash
cd ~/AccessMap
git checkout feat/onboarding-cards-2026-05-23
```

**Fresh-user flow:**
1. `npm run web` (or `npm start`).
2. Sign in with a brand-new account (or one that hasn't seen the
   intro yet). The 3-card modal should appear right after sign-in.
3. Tap **Next** twice → see the third card with *"Get started"*.
4. Tap **Get started**. Modal dismisses. You land on Map.
5. Sign out, sign back in with the same user. **No modal** — it
   remembered.
6. Sign in with a different account. **Modal appears** for that user.

**Re-showing intro for the same user (manual reset for testing):**
- Web: DevTools → Application → Local Storage → delete the
  `@accessmap/onboarding_seen_v1:<userId>` key.
- Native: `AsyncStorage.removeItem('@accessmap/onboarding_seen_v1:<userId>')`
  from a debug tool, or just sign in with a different user.

**VoiceOver/TalkBack sanity:**
- Each card should read as one composed sentence including "Step X
  of 3".
- Pagination dots should announce the step number on their own
  (not each individual dot).
- The Next button should read with current-step context.

---

## Proposals (NOT applied — need your review)

### 1. Merge order (suggested)

Both can merge in any order, but Feature 3 depends on the nearby-
flags-list branch being merged first. Suggested order:

1. `feat/legend-sheet-2026-05-23` (open from earlier today)
2. `feat/flag-load-error-banner-2026-05-23` (earlier)
3. `feat/status-filter-2026-05-23` (earlier)
4. `feat/nearby-flags-list-2026-05-23` (earlier — must precede #5)
5. **`feat/auto-open-list-a11y-2026-05-23`** — depends on #4
6. **`feat/onboarding-cards-2026-05-23`** — independent

```bash
git checkout main
git merge feat/nearby-flags-list-2026-05-23      # if not already merged
git merge feat/auto-open-list-a11y-2026-05-23
git merge feat/onboarding-cards-2026-05-23
```

No schema, dependency, or auth changes. No conflict expected between
any of these branches (different files; the auto-open branch only
adds lines to MapScreen and a new lib file).

### 2. Optional follow-up — global onboarding flag on `public.users`

If you'd rather have onboarding state follow the user across devices
(rather than per-device via AsyncStorage), the migration is small:

```sql
alter table public.users
  add column if not exists onboarded_at timestamptz;
```

Then `markOnboardingSeen(userId)` becomes a server upsert, and
`hasSeenOnboarding(userId)` reads from the users row. RLS would need
a small policy update so a user can read+update their own row.
**Propose-only.** I did not apply this.

### 3. FEATURES.md updates after you merge

- "Accessible list view of nearby flags" — **Phase 2 shipped** with
  this run; move it from *Next* to *Shipped (unmerged)* once Feature
  3 is merged, then remove once on main. Or merge Phases 1 + 2 in
  the same review pass.
- "Onboarding / first-run flow" — move from *Next* to *Shipped
  (unmerged)* once Feature 4 is merged, then remove once on main.

---

## Suggested next features (1–2)

1. **Profile editing** (already in *Next*). Three small controls in
   the Profile tab: edit `display_name`, choose default landing tab,
   and a "show me the intro again" button (calls
   `AsyncStorage.removeItem('@accessmap/onboarding_seen_v1:...')`).
   This last one becomes a nice loop with today's work — gives users
   a deliberate way to revisit the cards if they want.

2. **Confirmation & feedback flows for reporter points** (in
   *Later*). The TasksScreen already shows a flash banner when an
   actor verifies/resolves, but the reporter currently never sees a
   "+N points" confirmation when *their* flag is acted on by someone
   else. Could be a small toast surfaced via a points-changed
   subscription on `public.users`. Builds toward a real notifications
   system later.

---

## Verification

| Check | Status |
|---|---|
| Typecheck on `feat/auto-open-list-a11y-2026-05-23` | ✓ green |
| Typecheck on `feat/onboarding-cards-2026-05-23` | ✓ green |
| Feature 3 reachable | Map mount with screen reader on → auto-opens |
| Feature 4 reachable | First sign-in → modal appears |
| Matches house style | Hook follows existing useAuth pattern; OnboardingModal uses the same Modal/Pressable/StyleSheet idioms |
| Accessibility built in | Composed labels, decorative children hidden, ≥44pt targets, no color-only meaning, onRequestClose for back-button |
| Load-bearing gotchas | None broken — no schema, no map-library reach-through, no new dependency, types use `type` |
| Secrets / destructive | None |

**Branches not merged. No remote push attempted.**

---

## How to review

```bash
# Feature 3 (against its base branch — pure feature diff):
git diff feat/nearby-flags-list-2026-05-23..feat/auto-open-list-a11y-2026-05-23

# Or against main (includes Feature 2 since it's stacked):
git diff main..feat/auto-open-list-a11y-2026-05-23

# Feature 4:
git diff main..feat/onboarding-cards-2026-05-23

# Discard:
git branch -D feat/auto-open-list-a11y-2026-05-23
git branch -D feat/onboarding-cards-2026-05-23
```

---

## Learnings & suggested skill updates

- **A11y APIs as React hooks.** `useScreenReader()` is the second
  RN-`AccessibilityInfo`-backed hook this codebase could benefit
  from (the first would be `useReducedMotion()`). The pattern is
  identical: initial value from a Promise + subscription to a change
  event. Worth lifting into `src/lib/accessibility.ts` as a small
  family of hooks as future features need them.

- **Stacked feature branches.** Feature 3 depends on Feature 2. The
  clean approach: branch Feature 3 off Feature 2 directly, and report
  the diff against its *base branch* (not main) so the review reads
  cleanly. When Sky merges in order, history stays linear and
  readable. Worth a sentence in the skill: *"When a follow-up depends
  on an unmerged feature, branch off that feature rather than off
  main. Note the dependency in the report and explicitly suggest a
  merge order."*

- **AsyncStorage is already here.** Anything that needs a small piece
  of local state (onboarding seen, default landing tab, "preferred
  list view") can use the already-installed
  `@react-native-async-storage/async-storage` — no new dependency.
  Worth noting in the AccessMap reference file under "Where new
  features plug in": *"Need to remember a small UI preference?
  AsyncStorage is already installed; namespace under
  `@accessmap/<key>_v1`."*
