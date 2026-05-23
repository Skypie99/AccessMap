# Feature Push — AccessMap — 2026-05-23 (continuation #3)

## Summary

Two more features built this turn, each on its own branch:

1. **Profile editing — display name, default tab, show intro again**
   Branch: `feat/profile-edit-2026-05-23`
   Stacks on `feat/onboarding-cards-2026-05-23` (uses its
   `clearOnboardingSeen` helper for the "Show me the intro again"
   button).

2. **Reporter-side points toast**
   Branch: `feat/reporter-points-toast-2026-05-23` (off `main`,
   independent).
   When the app launches, diff the user's current `points` value
   against the locally-remembered watermark; if higher, raise a
   floating "+N points while you were away" banner.

**Typecheck:** green throughout on both branches.
**Status:** both complete, each one reviewable diff. Neither merged.
Branches are not pushed.

---

## Feature 5 — Profile editing

### Spec as built

**What:** Three new sections in the Profile tab, below the existing
points / reported / resolved cards:

1. **Display name** — `TextInput` + Save. Updates
   `public.users.display_name` (existing column — no schema change).
   Empty value persists as `NULL`.
2. **Default landing tab** — three segmented pills (Map / Tasks /
   Profile). Per-user `AsyncStorage` preference. On next launch, the
   app opens directly to the chosen tab.
3. **Show me the intro again** — link button + confirm dialog. Wipes
   the onboarding "seen" key for this user so the 3-card intro from
   `feat/onboarding-cards-2026-05-23` re-shows on next sign-in.

Plus a Sign-out button (kept from before, unchanged).

**Where:**
- New: `src/lib/preferences.ts` — typed `getDefaultTab` / `setDefaultTab`
  for per-user landing tab. Exports `DefaultTab` type and
  `DEFAULT_TABS` array.
- New: `src/lib/users.ts` — `updateUserProfile(userId, patch)`, a
  typed Supabase update. The `UserProfilePatch` interface is the
  allowlist for editable fields (today: `display_name`).
- Updated: `src/lib/onboarding.ts` — adds `clearOnboardingSeen(userId)`
  helper. Mirrors the existing has/mark pair.
- Updated: `src/navigation/RootNavigator.tsx` — accepts optional
  `initialRouteName` prop (defaults to `'Map'`).
- Updated: `App.tsx` — reads `defaultTab` alongside onboarding state
  before first render; holds render until both are in hand to avoid
  the Map→Tasks "flash" you'd see with a post-mount `navigate()`.
- Updated: `src/screens/ProfileScreen.tsx` — three new sections + the
  state/effects/handlers they need.

**User flow (display name):**
1. Open Profile. *Display name* shows current value (or placeholder).
2. Type a new name. *Save* becomes enabled.
3. Tap Save. Spinner replaces the button briefly; row updates.
4. Screen reader announces *"Display name saved."*
5. Save returns to disabled (draft now matches persisted value).

**User flow (default landing tab):**
1. Open Profile. *Default landing tab* shows your current pick
   highlighted.
2. Tap a different pill — selection moves optimistically.
3. Screen reader announces *"Default tab set to Tasks."*
4. Sign out + back in (or restart the app). You land on Tasks.

**User flow (show intro again):**
1. Tap *Show me the intro again*.
2. Confirm dialog: *"Show intro again? The 3-card introduction will
   appear the next time you sign in on this device."*
3. Tap Reset. Onboarding flag is cleared; screen-reader announces
   confirmation.
4. Sign out + sign back in. The 3-card intro appears.

**Components & data:** No new visual components — reuses
`Pressable`/`TextInput`/`View`/`Text` with `StyleSheet.create`,
matching ProfileScreen's existing structure. Two new lib modules.
One new prop on `RootNavigator`. The schema column `display_name`
already exists.

**Accessibility:**
- Every interactive element: `accessibilityRole="button"`, full
  `accessibilityLabel`, `accessibilityState` for `disabled`/`busy`/
  `selected`.
- Section headers use `accessibilityRole="header"` so a screen-reader
  user can jump straight to the section they want with the heading
  navigation gesture.
- `AccessibilityInfo.announceForAccessibility` on every success
  (display name saved / default tab set / intro reset) so confirmation
  is heard without requiring focus on the affected control.
- All controls have `minHeight: 44`. TextInput has `maxLength: 60`
  and `autoCapitalize="words"`.
- Hints under each control explain function in plain language
  (e.g. *"The app opens to this tab when you sign in."*).

**Assumptions documented:**
- `display_name` stored server-side; default tab stored per-device
  per-user via AsyncStorage. Schema-light: UX preferences don't need
  a column.
- Tab preference is per-user (key includes userId). If two people
  share a device, their picks don't overwrite each other.
- "Show intro again" prompts a confirmation rather than firing
  immediately, because resetting an onboarding flag is a one-way
  small surprise — better to ask once.

### Files / size

| File | Change |
|---|---|
| `src/lib/preferences.ts` | +50 (new) |
| `src/lib/users.ts` | +28 (new) |
| `src/lib/onboarding.ts` | +13 |
| `src/navigation/RootNavigator.tsx` | +10 / -1 |
| `App.tsx` | +18 / -4 |
| `src/screens/ProfileScreen.tsx` | +252 / -4 |
| **Total against base (`feat/onboarding-cards-…`)** | **+370 / -9**, 1 commit |

Commit: `a849a56  ProfileScreen: editable display name, default tab,
show intro again`.

### How to try it

```bash
cd ~/AccessMap
git checkout feat/profile-edit-2026-05-23
npm run web    # or npm start
```

1. Sign in. (If you haven't seen onboarding, dismiss it.)
2. Switch to **Profile** tab.
3. **Display name:** type a name → tap **Save** → it persists.
4. **Default landing tab:** tap **Tasks** → sign out → sign back in → 
   you land on **Tasks**.
5. **Show intro again:** tap the link → confirm Reset → sign out → 
   sign in → the 3-card onboarding reappears.

VoiceOver/TalkBack:
- Each section reads as a heading you can jump to.
- Save / pill picks announce confirmation via
  `announceForAccessibility`.
- Disabled Save button reads as *"disabled"*.

---

## Feature 6 — Reporter-side points toast

### Spec as built

**What:** When the app launches with a signed-in user, fetch their
current `points` value and compare against the locally-stored
watermark. If `current > lastSeen`, raise a top-of-screen banner:
*"You earned +N points while you were away!"* The banner auto-
dismisses after 4 s and is tap-to-dismiss.

This is the launch-time half of the reporter-feedback loop. The
flag-status trigger in `supabase/schema.sql` already updates
`public.users.points`; this surface makes that change visible to
the reporter.

**Where:**
- New: `src/lib/points.ts` — `fetchCurrentPoints(userId)` reads
  `public.users.points`. `getLastSeenPoints` / `setLastSeenPoints`
  store the watermark under
  `@accessmap/points_last_seen_v1:<userId>` in AsyncStorage.
- New: `src/components/FlashBanner.tsx` — generic floating banner.
  Props: `message`, `onDismiss`, `tone`, `durationMs`. Pure
  presentational, no business logic. Auto-dismiss timer in
  `useEffect`.
- Updated: `App.tsx` — `SignedInArea` runs the diff check on user
  availability, shows the banner if there's a positive delta, then
  advances the watermark.

**User flow:**
1. Reporter is offline / app closed.
2. Someone else verifies the reporter's flag → DB trigger awards +5
   points to the reporter.
3. Reporter opens the app. The diff check runs.
4. Banner slides in at the top: *"You earned +5 points while you
   were away!"* — green, with shadow.
5. VoiceOver/TalkBack speaks the message via
   `announceForAccessibility` + `accessibilityLiveRegion="polite"`.
6. After 4 s the banner auto-dismisses. The user can tap it sooner.

**First-launch behavior:** the very first time we observe the user
(no watermark stored), we silently record their current points
without raising a toast — so users with existing points don't see a
spurious *"+200 points!"* on day one.

**Components & data:**
- `FlashBanner` is **deliberately generic** (`message`/`onDismiss`/
  `tone`/`durationMs`) so future "Saved", "Synced", "Welcome back"
  toasts can reuse it without forking.
- One new `useState<string | null>` in `SignedInArea` for `flash`.
- No new dependencies.

**Accessibility:**
- `AccessibilityInfo.announceForAccessibility(message)` on every
  appearance so screen-reader users catch it even if their cursor is
  far from the top of the screen.
- `accessibilityLiveRegion="polite"` on the banner Pressable for
  Android live-region announcement.
- `accessibilityRole="button"`, full message as label, hint *"Tap to
  dismiss"*.
- `minHeight: 44`. Tap-to-dismiss gives an explicit close path.
- Green color is **paired with explicit text** — the "+N points"
  message — never carrying meaning by color alone.
- `maxWidth: '90%'` so a long delta string doesn't overflow.
- Singular vs plural copy (*"+1 point"* vs *"+N points"*).
- Positioned at `top: 56` — clear of the iOS notch and well above
  any tab/screen content.

**Assumptions documented:**
- **Launch-time check, not Supabase Realtime.** Real-time would
  require `alter publication supabase_realtime add table flags` (or
  `users`), which is a schema/dashboard change — propose-only under
  the feature-development skill. Launch-time gives ~99% of the value
  because the reporter goes through this check every time they open
  the app. Realtime is a clean follow-up; spec'd below.
- **One toast per launch, one delta.** We don't try to itemize *which*
  flag earned points or break it down by verify-vs-resolve. The
  watermark is just an integer; we report the diff. Per-flag detail
  would need either Realtime or a `points_history` table — both
  bigger changes.
- **Watermark only advances forward.** If the server reports lower
  than the watermark (defensive — shouldn't happen with the
  forward-only trigger), we still update the watermark so we don't
  re-fire stale toasts; just no banner.
- **Banner placement.** Positioned absolute at `top: 56`. On Android
  with display cutouts, this should still sit nicely below the
  status bar; on iOS sims I tested at iPhone 14 dimensions and the
  positioning looked clean. If you find it bumps against tall
  notches in the wild, the obvious fix is wrapping it in `useSafeAreaInsets`.

### Files / size

| File | Change |
|---|---|
| `src/lib/points.ts` | +78 (new) |
| `src/components/FlashBanner.tsx` | +96 (new) |
| `App.tsx` | +60 / -2 |
| **Total** | **+234 / -2**, 1 commit |

Commit: `a93091a  Reporter points toast — "+N points while you were
away"`.

### How to try it

```bash
cd ~/AccessMap
git checkout feat/reporter-points-toast-2026-05-23
npm run web        # or npm start
```

**The natural way (requires two sessions or sample data):**
1. Sign in as **User A**.
2. Report a flag.
3. Sign out. Sign in as **User B** (or use Supabase SQL editor:
   `update flags set status='verified' where id='<user-A-flag-id>'`
   then run the points-trigger manually if needed).
4. Sign out, sign back in as User A.
5. **Banner should appear** at the top of the screen with the
   delta from the points trigger.

**The faster way (cheating — confirms the UI works without two
users):**
1. Sign in. Open the app.
2. Use the Supabase SQL editor to bump your own row:
   `update users set points = points + 5 where id = auth.uid();`
3. Force-quit the app and reopen, or call sign-out + sign-in.
4. **Banner appears**: *"You earned +5 points while you were away!"*

**First-launch sanity:** on a brand-new user, the banner should
**not** appear (first observation is silent).

VoiceOver/TalkBack sanity:
- Even if your VO cursor is on the Map, you should hear the message
  announced as the banner appears.
- Swipe to the banner — reads as *"You earned +5 points while you
  were away! Tap to dismiss. Button."*

---

## Proposals (NOT applied — need your review)

### 1. Merge order (suggested)

Many open branches now. Recommended order:

1. `feat/legend-sheet-2026-05-23` (open from earlier today)
2. `feat/flag-load-error-banner-2026-05-23` (earlier)
3. `feat/status-filter-2026-05-23` (earlier)
4. `feat/nearby-flags-list-2026-05-23` (earlier — precedes #5)
5. `feat/auto-open-list-a11y-2026-05-23` (depends on #4)
6. `feat/onboarding-cards-2026-05-23` (earlier — precedes #7)
7. **`feat/profile-edit-2026-05-23`** — depends on #6
8. **`feat/reporter-points-toast-2026-05-23`** — independent

```bash
git checkout main
git merge feat/onboarding-cards-2026-05-23      # if not already in
git merge feat/profile-edit-2026-05-23
git merge feat/reporter-points-toast-2026-05-23
```

Light conflict possible in `App.tsx` between Feature 5 and Feature 6
(both add things to `SignedInArea`). They're additive — a simple
merge that combines both `useEffect` blocks. Sample resolution:

```tsx
function SignedInArea() {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [defaultTab, setDefaultTabState] = useState<DefaultTab | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // …both effects (onboarding+defaultTab from F5; points diff from F6)
  // …both children (RootNavigator + OnboardingModal from F5; FlashBanner from F6)
}
```

### 2. Optional follow-up — Supabase Realtime for live points

When you're ready to move from launch-time to live:

```sql
-- one-time, in the Supabase SQL editor:
alter publication supabase_realtime add table public.users;
```

Then in `App.tsx` or a small new `usePointsSubscription` hook:

```tsx
useEffect(() => {
  if (!user) return;
  const ch = supabase
    .channel(`user-points-${user.id}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
      (payload) => {
        const next = (payload.new as { points?: number }).points ?? null;
        // diff against your current watermark and raise FlashBanner
      },
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}, [user]);
```

The toast surface (`FlashBanner` + the points lib) doesn't change.
The schema change is the gate. **Propose-only.**

### 3. FEATURES.md updates after you merge

- *Profile editing* — move from **Next** to **Shipped (unmerged)**
  once Feature 5 is merged; remove once on main.
- *Confirmation & feedback flows* — split into "reporter side
  (shipped — launch-time)" and "actor side (already shipped earlier)"
  + a follow-up note for the Realtime upgrade. Or just collapse it
  to *shipped* and re-add the Realtime piece as its own bullet under
  *Later*.

---

## Suggested next features (1–2)

1. **Marker clustering on the Map** (already on *Later* — Proposal P4
   in `qa-reports/qa-2026-05-22.md`). With pagination still capped at
   500 rows and the filter rows getting richer, dense urban areas
   benefit from visual grouping. A `<Marker.Clusterer />` pattern
   (or react-native-maps' built-in `cluster` prop) is a focused
   one-screen change.

2. **Shared FlagsProvider** (also on *Later* — Proposal P5). The
   `listFlags` fetch is currently duplicated between MapScreen and
   TasksScreen, and our new `NearbyFlagsModal` reads MapScreen's
   state directly. A single context provider would unify all three,
   eliminate the duplicate fetch, and make future "live updates"
   (Realtime or otherwise) trivial to add — flip one provider and
   every consumer updates. Touches three files but the diff is
   mostly mechanical and the architectural win is real.

---

## Verification

| Check | Status |
|---|---|
| Typecheck on `feat/profile-edit-2026-05-23` | ✓ green |
| Typecheck on `feat/reporter-points-toast-2026-05-23` | ✓ green |
| Feature 5 reachable | Profile tab → three new sections + sign-out |
| Feature 6 reachable | Sign-in (or launch) when remote points changed |
| Matches house style | Hooks follow useAuth pattern; libs mirror flags.ts shape; FlashBanner mirrors TasksScreen's flash pill |
| Accessibility built in | Headers, composed labels, announce on success, ≥44pt targets, no color-only meaning, hints under each control |
| Load-bearing gotchas | None broken — display_name already on schema; no map-library reach-through; types use `type`; no new dependency |
| Secrets / destructive | None |

**Branches not merged. No remote push attempted.**

---

## How to review

```bash
# Feature 5 (against its base — pure feature diff):
git diff feat/onboarding-cards-2026-05-23..feat/profile-edit-2026-05-23

# Or against main (includes Feature 4 since it's stacked):
git diff main..feat/profile-edit-2026-05-23

# Feature 6:
git diff main..feat/reporter-points-toast-2026-05-23

# Discard:
git branch -D feat/profile-edit-2026-05-23
git branch -D feat/reporter-points-toast-2026-05-23
```

---

## Learnings & suggested skill updates

- **Worktree-aware branching.** When the project has worktrees (this
  one has four — main, perf branch, two claude/ branches), a fresh
  `git checkout main && git checkout -b …` fails. The fix is
  `git checkout -b feat/<slug> <main-sha>` — branch from main's tip
  without checking it out. Worth a sentence in the skill's Phase 0
  *Safe workspace* section: *"if `git checkout main` errors with a
  worktree conflict, branch from main's SHA directly."*

- **FlashBanner as a generic component.** It would have been easy to
  inline this in App.tsx for the points toast. Putting it in
  `src/components/` with a clean `{ message, onDismiss, tone,
  durationMs }` API costs nothing today and means every future
  confirmation surface ("Saved", "Synced", "Welcome back") gets it
  for free. The same applies to the haversine helper in
  NearbyFlagsModal — keep self-contained until a second consumer
  appears, then lift.

- **Watermark + first-observation-silent.** The reporter points toast
  pattern (compare against a stored watermark, suppress the first
  observation) is a generic "show what changed since last time"
  recipe. It applies equally well to unread message counts, new
  available updates, etc. Captured here as a recipe; will live in
  LEARNINGS.md once that file moves to a shared base branch.

- **Stacking branches pays off when features touch the same module.**
  Feature 5 ("Show intro again") needed to extend `onboarding.ts`
  from Feature 4. Branching on top of Feature 4 instead of duplicating
  the helpers means there's exactly one `clearOnboardingSeen`
  implementation. Worth a sentence in the skill: *"if a follow-up
  must extend a module added by an unmerged feature, stack the new
  branch on top rather than duplicating helpers."*
