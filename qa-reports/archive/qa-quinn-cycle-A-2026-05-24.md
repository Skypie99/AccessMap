# Quinn — Correctness review of Cycle A (F2/F3/F4) — 2026-05-24

## Summary
Reviewed three Cycle-A feature branches (F2 onboarding, F3 Settings hub, F4 filter-presets manager). 11 findings total: 1 HIGH, 4 MEDIUM, 6 LOW. All three branches are mergeable; F2 is the cleanest, F3 has one web-platform regression worth a 5-line fix before merge, F4 has cosmetic dead-logic issues but the lib + UI are correct. No cross-branch merge conflicts: the three branches touch disjoint file sets, and the only shared concept (`RootTabParamList` type, extended by F3) is unused by F2 and F4.

## Findings by branch

### F2 — feat/onboarding-flow-2026-05-24

- **[LOW] Hardware back on Android silently completes onboarding** — `src/components/OnboardingCards.tsx:93` — `<Modal onRequestClose={onDone}>` means an Android back-button press from any card calls `onDone()` and writes the onboarded flag. Whether this is "Skip by another name" or "user lost their place" is a UX call. Either intentional (matches Skip) or surface a confirm. Same pattern is used by existing `OnboardingModal` in main, so this matches prior art — flagging only because the gate now runs pre-auth.
- **[LOW] `FirstLaunchGate` loading splash flashes a white surface on dark mode** — `App.tsx:139-141` — the placeholder while AsyncStorage reads is `backgroundColor: '#fff'`, hard-coded rather than `color.surface`. AccessMap doesn't have dark-mode tokens yet so this is forward-looking, but the surrounding code uses theme tokens. Trivial: swap to `color.surface`.
- **[LOW] `loadOnboarded` error → "false" means a *permanent* AsyncStorage failure re-shows the intro on every launch** — `src/lib/onboardingState.ts:30-34` — the JSDoc notes this is intentional ("show the intro once more rather than swallow forever"). For a real persistent corruption case this becomes "every launch shows intro forever" — the user can never finish. Reasonable trade-off for the v1; flag for future once the app has telemetry.
- **[LOW] The two onboarding layers are now stacked** — by design — but on a brand-new account on a brand-new device the user sees a 3-card intro **twice in a row**: first the pre-auth `OnboardingCards` (device-wide), then immediately after sign-in the per-user `OnboardingModal`. Different content (one is "what is this app" + one is "severity 1-5 explained") but the user doesn't know that. The diff doc and JSDoc both call this out intentionally. Not a bug, but worth a Quinn-style ticket to spec whether the per-user `OnboardingModal` should suppress itself when the device-wide one just fired. **No action required this cycle.**

### F3 — feat/settings-hub-2026-05-24

- **[HIGH] Sign-out is unreachable on RN Web** — `src/screens/SettingsScreen.tsx:99-117` — the only path from the Settings tab to `signOut()` is gated behind an `Alert.alert(...)` confirm. On RN Web `Alert.alert` is a documented **no-op** (we hit this in R8 + R11 last cycle). Web users who land on Settings cannot sign out from this screen at all. The existing direct sign-out button on ProfileScreen still works, so users have an escape, but the Settings UX silently breaks on web. **Fix: branch on `Platform.OS === 'web'` and use `window.confirm()` (or skip confirm entirely on web).** Pattern is already needed in ProfileScreen — extract a small helper.
- **[MED] `AboutScreen` duplicates the existing `AboutModal` content but with different copy and missing the feedback link** — `src/screens/AboutScreen.tsx` vs `src/components/AboutModal.tsx` (main) — both render a slide-up modal called "About AccessMap" with version, credits, privacy summary. The two differ:
  - AboutModal (main) imports `openFeedbackComposer` and has a feedback CTA inside.
  - AboutScreen (new) has no feedback link (the Settings screen has its own row, which is the right pattern), but says "the Feedback row in Settings goes straight to the maintainer" — fine.
  - **The problem**: both modals will exist post-merge. ProfileScreen still mounts AboutModal at `src/screens/ProfileScreen.tsx:1033`. So tapping "About" from Profile uses the old copy; tapping "About AccessMap" from Settings uses the new copy. Users will see two different About screens depending on entry point. Not a hard bug — both function — but Sky should pick one and the dedupe is described in the F3 doc as "a later pass can dedupe." Recommend filing as a follow-up before either modal evolves further.
- **[MED] FeedbackModal / MyFeedbackModal / HelpModal / ChangelogModal / NotificationPrefsModal are now mounted *twice* in the tree** — once inside ProfileScreen, once inside SettingsScreen — each pair has independent visible-state. When the user is on Map or Tasks neither pair is open so it's harmless, but on Profile + Settings *simultaneously* the trees are doubled. Each modal does its own AsyncStorage read on mount (NotificationPrefsModal, MyFeedbackModal), so on tab-mount there are now 2 loads instead of 1. **Recommend** lifting these modals to the RootNavigator (sibling to FeedbackModal already there) so any tab can open them and only one instance exists. Not blocking this cycle.
- **[LOW] Settings tab is the 4th — and not selectable as "default tab" preference** — `src/lib/preferences.ts:18` still has `DEFAULT_TABS: DefaultTab[] = ['Map', 'Tasks', 'Profile']` (no Settings). The compiled type `DefaultTab = keyof RootTabParamList` now widens to include `'Settings'`, but the array literal is a subtype so TS won't complain. ProfileScreen renders its tab picker from `DEFAULT_TABS`, so the Settings tab simply doesn't appear there. Probably intentional ("don't let users land on Settings on launch"). Worth a comment in `preferences.ts` explaining the intentional exclusion so the next change doesn't accidentally add it.
- **[LOW] `AboutScreen` filename ends in `Screen.tsx` but is implemented as a `Modal`** — `src/screens/AboutScreen.tsx:35` — the JSDoc acknowledges this ("filename is *Screen* per the F3 spec, but at runtime it presents as a sheet"). Convention drift; either rename to `AboutSheet.tsx`/`AboutPanel.tsx` or accept the inconsistency. Cosmetic.

### F4 — feat/filter-presets-manager-2026-05-24

- **[MED] Delete confirm Alert is a no-op on RN Web** — `src/components/FilterPresetsModal.tsx:191-218` — the delete flow uses `Alert.alert` with destructive button. On web this never fires, so the delete button does nothing. The modal has no entry point this cycle (deferred to F5), so this is dormant. **Recommend** the same `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)` shim added when the modal gets wired up. Track as a follow-up under F5.
- **[MED] `+ New` button click handler has confusing dead logic** — `src/components/FilterPresetsModal.tsx:343-348` — `onPress={() => { if (!adding || saving) { setAdding(true); setNewName(''); } }}`. The Pressable's `disabled` already blocks when `adding=true`, so the inner condition never matters. The intent was probably `if (!adding && !saving)`. Currently harmless — `disabled` saves it — but a future change that drops `disabled` would expose a subtle bug. **Recommend** simplifying to `onPress={() => { setAdding(true); setNewName(''); }}`.
- **[LOW] `savePresets` re-throws while `removePreset`/`renamePreset` callers depend on stale closure for rollback** — `src/lib/filterPresets.ts:259` + `src/components/FilterPresetsModal.tsx:177-184, 203-211` — each handler's rollback uses the `presets` variable from the closure. Because `useCallback` re-creates when `presets` changes, the closure correctly captures the *pre-update* list — so rollback is correct. But there's no `mountedRef.current` check on the rollback path: if the user closes the modal between optimistic update and disk error, `setPresets(presets)` runs on an unmounted component (React 18 silently no-ops, so no console warning) but the Alert still fires while the modal is closed. Same pattern as `handleCreate`'s `if (mountedRef.current)` guards — those *are* present. **Recommend** adding the same guards to rename/delete rollback for consistency.
- **[LOW] `parsePresetsBlob` enforces cap by **truncating oldest-first** on load, which contradicts the spec/comment** — `src/lib/filterPresets.ts:130-137` + tests at `src/lib/__tests__/filterPresets.test.ts:225-235` — the load-time cap walks the array and stops at index `FILTER_PRESETS_MAX`, so an over-cap stored array gets its **newest** entries dropped (anything past the first 20). The test even asserts this and explains "load is a defensive cap, not a recency filter — addPreset handles newest-wins at write time." `addPreset`, by contrast, trims **oldest** when over-cap. So the system is inconsistent: write-time trims oldest, read-time trims newest. In practice the on-disk array is *always* ≤ 20 because every write goes through addPreset, so the read-time cap only triggers on hand-edited / corrupted storage. Still worth normalizing both to "drop oldest" so the invariant matches the user model. Or, document why divergent.
- **[LOW] `accessibilityViewIsModal` set on the card View, not the Modal root** — `src/components/FilterPresetsModal.tsx:336` — the prop is iOS-only and works on the inner View, but most patterns put it on the root container of a transparent Modal. Functional, just stylistic.

## Cross-cycle patterns

1. **`Alert.alert` on RN Web** is repeatedly missed across cycles. R8/R11 surfaced it; Cycle A introduces TWO more instances (F3 sign-out, F4 delete confirm). Worth promoting a tiny `confirm()` helper in `src/lib/` (`confirmDestructive(title, message, onConfirm)`) that branches on Platform and centralizes the web-vs-native split. Then ban raw `Alert.alert` in destructive paths via a lint rule.
2. **Duplicated modal mounts** — F3 mounts five modals that ProfileScreen also mounts. The pattern of mounting modals inside each screen creates O(tabs) instances. Lifting shared modals to RootNavigator's level (where FeedbackModal already lives) would fix this once and forever.
3. **"Onboarding" is now a layered concept** — device-wide pre-auth (F2) + per-user post-auth (existing) — but neither layer knows about the other. New users will see two intros back-to-back. The diff comments call this out as intentional ("a later pass"). Worth specifying the cross-layer behavior before either evolves.

## Recommend-merge verdict per branch

| Branch | Verdict | Reason |
|---|---|---|
| F2 onboarding | OK | All findings are LOW / cosmetic. Race-free, key-namespaced, defensive on AsyncStorage errors. Tests cover the contract. |
| F3 settings-hub | HOLD ON ONE FIX | HIGH: web sign-out is silently unreachable. Five-line fix (Platform.OS branch). Other findings (duplicate AboutModal, double-mounted modals) are MEDIUM cleanup, not blocking. |
| F4 filter-presets | OK | Modal has no entry point this cycle so the web-Alert MED is dormant. Pure-lib `addPreset/rename/remove` is correct and well-tested. The `+ New` dead-logic is harmless. Land it; track the rollover items as F5 prerequisites. |

## Suggested polish tickets

**Ticket Q-001 — Fix web sign-out from Settings hub (BLOCKS F3)**
Add a tiny helper at `src/lib/confirm.ts`:
```ts
import { Alert, Platform } from 'react-native';
export function confirmDestructive(opts: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${opts.title}\n\n${opts.message}`)) opts.onConfirm();
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: 'Cancel', style: 'cancel' },
    { text: opts.confirmLabel, style: 'destructive', onPress: opts.onConfirm },
  ]);
}
```
Then replace `handleSignOutPress` in `src/screens/SettingsScreen.tsx` to call it. Same call site can also be added to `FilterPresetsModal.handleDelete` so F4 is web-safe when F5 wires it up.

**Ticket Q-002 — Dedupe About modals (post-F3)**
Decide whether the new `AboutScreen` (no feedback CTA, slide-up) supersedes the old `AboutModal` (has feedback CTA). Pick one, delete the other, route both entry points (Profile + Settings) to the survivor.

**Ticket Q-003 — Lift shared modals to RootNavigator (post-F3)**
Move NotificationPrefsModal, HelpModal, ChangelogModal, FeedbackModal, MyFeedbackModal, AboutModal from per-screen mounts up to RootNavigator (siblings of the existing FeedbackModal there). Expose an `openModal(key)` via context. Removes double-mount and double-AsyncStorage-read.

**Ticket Q-004 — Normalize FilterPresets cap direction (post-F4)**
Make `parsePresetsBlob` drop OLDEST-first when over cap (slice from `parsed.length - MAX`) so it matches `addPreset`'s behavior. Update the test that asserts the opposite. Or document both behaviors with a clearer comment.
