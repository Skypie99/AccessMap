# FDA-036 / FDA-033 / FDA-034 — Alert.alert web no-op trace + OnboardingCards + locationErrorMessage

Worktree: /Users/skypie/AccessMap-deep-audit-20260902 (CURRENT_MAIN = origin/main 70b52a30)
Build 33 source: commit f5594171 (SUBMITTED_BUILD_33, not in main)
Method: read-only `grep` over the main working tree and `git grep`/`git show` against f5594171; react-native-web
Alert + Linking shims read from node_modules. Test files (`__tests__/`, `*.test.*`) excluded. Coverage check: no `Alert.alert(`/`Alert.prompt(` outside `src/` (App.tsx, app/) in either tree; `Alert.prompt` appears only in comments.
Web build is a real deployed surface: `vercel.json` builds with `npx expo export --platform web` (outputDirectory `dist`).

## react-native-web Alert export — confirmed no-op

`/Users/skypie/AccessMap-deep-audit-20260902/node_modules/react-native-web/dist/exports/Alert/index.js` (react-native-web 0.21.2):

```js
class Alert {
  static alert() {}
}
export default Alert;
```

Identical in `src/exports/Alert/index.js`. `Alert.alert(...)` on web renders nothing, invokes no button
`onPress`, never resolves anything. Any promise built on a button callback never settles.

House fences already in both trees (identical bytes — `git diff 70b52a30 f5594171 -- src/lib/confirm.ts` is empty):
- `src/lib/confirm.ts:32-40` `notify(title, message)` → `window.alert` on web, `Alert.alert` on native.
- `src/lib/confirm.ts:42-77` `confirm(...)` → `window.confirm` on web (returns false if unavailable), 2-button `Alert.alert` on native.

Legend for the tables below — Guard column:
- **Platform** = inside `if (Platform.OS === 'web') {...return}` / `else` branch, or after a web early-return.
- **helper** = the call IS the native branch of `notify()`/`confirm()`/`showPushExplanation()`/`showBlockedContentAlert()`.
- **data-flow** = no Platform check, but the triggering state cannot occur on web.
- **disabled-gate** = no Platform check, but the UI control is disabled whenever the alert's condition holds.
- **NONE** = fires unconditionally on web (silent).

Reach column = who can reach the surface on the web build (guest / signed-in / admin) — "native-only" when the guard makes the alert itself native-only.

## Alert.alert call-site table (main)

29 grep hits in non-test files; 28 are real calls (src/lib/errors.ts:6 is a doc comment).

| # | file:line (main) | User action that triggers it | Guard | Web reach | Conveys | Destructive / privacy / data-loss? | Consequence if silent on web |
|---|---|---|---|---|---|---|---|
| 1 | src/screens/SignInScreen.tsx:134 | Sign-up succeeds → "Check your email" + OK closes modal | Platform (web → `notify()` + `onClose()` at :131-132) | native-only | confirmation | no | none (web path handled) |
| 2 | src/screens/ReportFlagModal.tsx:539 | Tap "Add photo" in report sheet → camera/library action sheet | Platform (web early-return → `pickPhoto('library')` :535-538) | native-only | choice sheet | no | none |
| 3 | src/screens/ReportFlagModal.tsx:592 | Guest submits 6th report in 24h → "Daily limit reached" w/ Sign In button | Platform (web → `notify()` :586-590) | native-only | validation | no | none (documented F46) |
| 4 | src/screens/AdminScreen.tsx:156 | Admin › Remove flag › confirm() OK → `deleteFlag()` throws | **NONE** (`confirm()` before it IS web-safe; only the failure alert is bare) | admin, signed-in (Admin tab registered on every platform: RootNavigator.tsx:458, drawer item HamburgerDrawer.tsx:369; no `Platform` import in AdminScreen) | error | destructive action (permanent delete) — but alert is on the FAILURE path; delete did not happen | Admin confirms, spinner stops, row stays; no message. Admin cannot tell "RLS refused" from "network" from "nothing happened"; may retry blindly. No data loss. |
| 5 | src/screens/AdminScreen.tsx:177 | Admin › Dismiss (reject) › confirm() OK → `updateFlagStatus(...,'rejected', flag.status)` throws (incl. F53 CAS conflict) | **NONE** | admin | error | moderation status change; failure path | Silent; the CAS-conflict explanation is swallowed, status stays as loaded. No data loss. |
| 6 | src/screens/SettingsScreen.tsx:460 | Guest taps Settings › "Export my data" (row is rendered for guests; only `disabled={exporting}` at :905) | **NONE** | **guest** (Settings reachable signed-out) | validation ("Sign in required") | privacy-relevant flow (PIPEDA right-of-access entry point) — no data involved | Dead button on web for guests: tap does nothing, no busy state, no message. |
| 7 | src/screens/SettingsScreen.tsx:548 | Signed-in export → native Share sheet completed → "Data exported" | Platform (inside `else` of `if (Platform.OS === 'web')` at :518) | native-only | success | no | none (web uses `window.alert(successMsg)` :521-530) |
| 8 | src/screens/SettingsScreen.tsx:555 | Signed-in export → any throw in the try (Supabase fetch of flags/feedback, or `navigator.clipboard.writeText` rejecting: permission denied / document not focused / insecure context) | **NONE** (single `catch` wraps both platform branches) | signed-in | error ("Could not export data / Try again") | **privacy-relevant** — this is the subject-access export channel | Web user taps Export, spinner stops, clipboard is empty, no message. A PIPEDA access request fails silently. No data loss. |
| 9 | src/screens/MapScreen.tsx:882 | Long-press saved filter chip → Make/Remove default / Delete menu | Platform (web → `webSetMenuChoice(…, confirm)` :874-880) | native-only | choice sheet (destructive option) | delete saved set | none (M4 fix) |
| 10 | src/screens/MapScreen.tsx:1299 | Locate-me FAB → position fetch throws | Platform (web → `setLiveStatus` w/ Retry :1293-1297) | native-only | error | location (privacy-adjacent) | none (B10 fix). NOTE body is `errorMessage(e)` on main — see FDA-034. |
| 11 | src/screens/MapScreen.tsx:1721 | Signed-in long-press map → "Report a barrier here?" confirm | Platform (web early-return drops pin directly :1714-1718) | native-only | confirmation | no | none |
| 12 | src/components/FeedbackModal.tsx:176 | Send feedback → `sendFeedback` returns `unavailable` | data-flow (`sendFeedback` only returns `unavailable` when `Platform.OS !== 'web'`, src/lib/feedback.ts:105-108) | native-only | error w/ fallback address | no | none (unreachable on web) |
| 13 | src/components/FeedbackModal.tsx:182 | Send feedback → `Linking.openURL(mailto:)` rejects | **NONE** | guest + signed-in (header Feedback button RootNavigator.tsx:300) | error ("Couldn't open email") | no; typed body is retained in state (`setBody('')` only on `opened`) | Rare on web: RNW `Linking.openURL` only rejects if `new URL()`/`window.open` throws (Linking/index.js:80-86); a popup-blocker returns null without throwing. If it does reject: spinner stops, modal stays open, no message. |
| 14 | src/components/FilterPresetsModal.tsx:181 | Signed-in › Save new preset → `savePresets` (AsyncStorage→localStorage) throws | **NONE** | signed-in (opened from MapScreen.tsx:3321) | error | no (preset simply not persisted; add form stays open) | Silent: "Save" appears to do nothing. |
| 15 | src/components/FilterPresetsModal.tsx:202 | Rename preset → save throws → optimistic state rolled back | **NONE** | signed-in | error | no (rollback restores prior name) | Silent: name snaps back with no explanation. |
| 16 | src/components/FilterPresetsModal.tsx:228 | Delete preset → `confirm()` (web-safe) → save throws → rollback | **NONE** | signed-in | error | destructive intent, but failure path; rollback means no loss | Silent: preset reappears with no explanation. |
| 17 | src/components/FlagDetailModal.tsx:576 | Add photo (owner edit) → source sheet | Platform (web early-return uses hidden `<input type=file>` :543-573) | native-only | choice sheet | no | none |
| 18 | src/components/FlagDetailModal.tsx:582 | "Take photo" → camera permission denied | Platform (nested in #17's native-only button) | native-only | error | camera permission | none |
| 19 | src/components/FlagDetailModal.tsx:605 | "Choose from library" → library permission denied | Platform (nested in #17) | native-only | error | photo-library permission | none |
| 20 | src/components/FlagDetailModal.tsx:932 | Share flag → native `Share.share` throws (non-cancel) | Platform (web branch returns at :891-925 using `window.alert`) | native-only | error | no | none |
| 21 | src/components/FlagDetailModal.tsx:1005 | Copy coordinates → native `Share.share` throws | Platform (web branch :963-997 uses `webShare` + `window.alert`) | native-only | error | no | none |
| 22 | src/components/FlagDetailModal.tsx:1080 | Reopen request › Send with empty text | disabled-gate (Send button `disabled={reopenBusy \|\| !reopenText.trim()}` :2027) | signed-in, but unreachable | validation | no | none in practice (belt-and-braces) |
| 23 | src/lib/confirm.ts:39 | any `notify()` caller | helper (web → `window.alert` :33-38) | n/a | — | — | none |
| 24 | src/lib/confirm.ts:60 | any `confirm()` caller | helper (web → `window.confirm` :48-57) | n/a | — | — | none |
| 25 | src/lib/blockedContent.ts:66 | Report/comment rejected by moderation filter → "View guidelines" button | helper (web → `notify()` :62-65) | native-only | error + route | no | none; documented limitation: web gets the message without the guidelines button (:34-40) |
| 26 | src/lib/feedback.ts:125 | Help › "Email Flagstone" (HelpModal.tsx:224 → `openFeedbackComposer`) → `openURL` rejects | **NONE** | guest + signed-in | error w/ fallback support address | no | Rare (same RNW rejection condition as #13). If it fires: user never sees the fallback email address. |
| 27 | src/lib/pushNotifications.ts:49 | Settings › Push toggle ON → PIPEDA explanation | helper (web → `window.confirm` :33-45) | native-only | consent prompt | push consent (privacy) | none (F47 fix) |
| 28 | src/lib/pushNotifications.ts:233 | Settings › Push toggle ON → user confirms explanation → `requestExpoPushToken()` returns null | **NONE** | signed-in (row enabled for any signed-in user: `pushLocked = authLoading \|\| !user` SettingsScreen.tsx:342; no web gate) | error ("Notifications unavailable") | privacy-adjacent (push consent flow) | On web `requestExpoPushToken` reliably returns null (expo-notifications cannot mint an Expo push token on web without VAPID/service-worker; any throw → `catch { return null }` :107-110). So: user answers "OK" to the window.confirm, then the toggle stays OFF with NO message — `handlePushToggle` only `notify()`s from its own catch (:418), and `enablePushNotifications` returns false without throwing. Confirm-then-nothing. |
| — | src/lib/errors.ts:6 | (doc comment, not a call) | — | — | — | — | — |

Totals (main): 28 real call sites — 16 guarded by Platform/helper, 1 native-only by data-flow (#12), 1 unreachable by disabled-gate (#22), **10 unguarded AND web-reachable** (#4, #5, #6, #8, #13, #14, #15, #16, #26, #28).

## Alert.alert call-site table (Build 33)

33 grep hits in non-test files; 32 are real calls (src/lib/errors.ts:6 is the same doc comment). `src/lib/confirm.ts`, `src/lib/blockedContent.ts`, `src/lib/feedback.ts`, `src/lib/pushNotifications.ts` are byte-identical to main (empty diffs). Build 33 adds the MOD1 reports-triage queue and a Restore action to AdminScreen (+564 lines), which contributes 4 new bare alerts.

| # | file:line (Build 33) | main equivalent | Trigger | Guard | Web reach | Conveys | Destructive / privacy? | Consequence if silent on web |
|---|---|---|---|---|---|---|---|---|
| 1 | src/components/FeedbackModal.tsx:200 | main #12 (:176) | unavailable mail app | data-flow (native-only) | native-only | error | no | none |
| 2 | src/components/FeedbackModal.tsx:206 | main #13 (:182) | `openURL` rejects | **NONE** | guest + signed-in | error | no | rare; silent, modal stays open (B33 also adds a web-safe `confirm()` discard prompt at :148-153 — unaffected) |
| 3 | src/components/FilterPresetsModal.tsx:186 | main #14 (:181) | save preset fails | **NONE** | signed-in | error | no | silent |
| 4 | src/components/FilterPresetsModal.tsx:207 | main #15 (:202) | rename fails → rollback | **NONE** | signed-in | error | no (rollback) | silent |
| 5 | src/components/FilterPresetsModal.tsx:233 | main #16 (:228) | delete fails → rollback | **NONE** | signed-in | error | failure path, rollback | silent |
| 6 | src/components/FlagDetailModal.tsx:612 | main #17 | add-photo sheet | Platform (web early-return :579-610) | native-only | sheet | no | none |
| 7 | src/components/FlagDetailModal.tsx:618 | main #18 | camera perm | Platform (nested) | native-only | error | camera perm | none |
| 8 | src/components/FlagDetailModal.tsx:641 | main #19 | library perm | Platform (nested) | native-only | error | library perm | none |
| 9 | src/components/FlagDetailModal.tsx:990 | main #20 | native share throws | Platform (web branch :949-983) | native-only | error | no | none |
| 10 | src/components/FlagDetailModal.tsx:1063 | main #21 | native coords share throws | Platform (web branch :1021-1055) | native-only | error | no | none |
| 11 | src/components/FlagDetailModal.tsx:1138 | main #22 | reopen w/ empty text | disabled-gate (:2197) | unreachable | validation | no | none |
| 12 | src/lib/blockedContent.ts:66 | main #25 | moderation rejection | helper (web → notify) | native-only | error+route | no | none |
| 13 | src/lib/confirm.ts:39 | main #23 | notify() | helper | n/a | — | — | none |
| 14 | src/lib/confirm.ts:60 | main #24 | confirm() | helper | n/a | — | — | none |
| 15 | src/lib/feedback.ts:125 | main #26 | Help › Email Flagstone, openURL rejects | **NONE** | guest + signed-in | error | no | rare; silent |
| 16 | src/lib/pushNotifications.ts:49 | main #27 | push explanation | helper | native-only | consent | push consent | none |
| 17 | src/lib/pushNotifications.ts:233 | main #28 | push token null after consent | **NONE** | signed-in | error | privacy-adjacent | confirm-then-nothing on web (same as main) |
| 18 | src/screens/AdminScreen.tsx:191 | **new (MOD1)** | Admin reports queue › any `runReportAction` (reject/remove-flag/remove-comment/no-action/target-unavailable/finish-review, AdminScreen.tsx:225-290) → content action SUCCEEDED but `closeReport()` retries exhausted → "Not marked reviewed yet" | **NONE** | admin | partial-failure warning | **destructive action already applied** (flag/comment removed) | Silent on web. Mitigated: `pendingResolutions` swaps the row's action set so the same destructive button is not re-offered (:176-190); but the admin is never told the action already landed. **Not live in production**: `mod1*` migrations are NOT applied (lead facts), so `listOpenReports` fails → inline `reportsLoadError` (:112, :766) and the queue never populates. |
| 19 | src/screens/AdminScreen.tsx:204 | **new (MOD1)** | same helper → `FlagStatusConflictError` → "This flag changed" then `loadReports()` | **NONE** | admin | info | no | Silent, but `loadReports()` still runs, so the queue visibly refreshes without the explanation. Not live in production (see #18). |
| 20 | src/screens/AdminScreen.tsx:207 | **new (MOD1)** | same helper → any other throw | **NONE** | admin | error | no | Silent. Not live in production (see #18). |
| 21 | src/screens/AdminScreen.tsx:388 | main #4 (:156) | Remove flag fails | **NONE** | admin | error | failure path | silent |
| 22 | src/screens/AdminScreen.tsx:409 | main #5 (:177) | Dismiss fails | **NONE** | admin | error | failure path | silent |
| 23 | src/screens/AdminScreen.tsx:436 | **new (MOD1 Restore)** | Admin › Restore (rejected row → open) › confirm() OK → `updateFlagStatus(...,'open', flag.status)` throws | **NONE** | admin | error | moderation status change; failure path | Silent; status stays rejected. (Restore only needs the existing `updateFlagStatus` path — no missing migration — so this one IS live for admins on web.) |
| 24 | src/screens/MapScreen.tsx:901 | main #9 | saved-set menu | Platform (web → webSetMenuChoice :893-899) | native-only | sheet | delete set | none |
| 25 | src/screens/MapScreen.tsx:1321 | main #10 | locate fails | Platform (web → live region :1311-1316) | native-only | error | location | none. Body is `locationErrorMessage(e)` — see FDA-034. |
| 26 | src/screens/MapScreen.tsx:1747 | main #11 | long-press report confirm | Platform (web early-return :1740-1744) | native-only | confirmation | no | none |
| 27 | src/screens/ReportFlagModal.tsx:615 | main #2 | add-photo sheet | Platform (:611-614) | native-only | sheet | no | none |
| 28 | src/screens/ReportFlagModal.tsx:668 | main #3 | anon daily limit | Platform (web → notify :662-666) | native-only | validation | no | none |
| 29 | src/screens/SettingsScreen.tsx:461 | main #6 (:460) | guest taps Export | **NONE** | guest | validation | privacy-flow entry | dead button on web |
| 30 | src/screens/SettingsScreen.tsx:549 | main #7 | native export success | Platform (else-branch of :519) | native-only | success | no | none |
| 31 | src/screens/SettingsScreen.tsx:556 | main #8 (:555) | export throws | **NONE** | signed-in | error | privacy-relevant (PIPEDA export) | silent failure of access request |
| 32 | src/screens/SignInScreen.tsx:224 | main #1 | sign-up success | Platform (web → notify :219-222) | native-only | confirmation | no | none |
| — | src/lib/errors.ts:6 | comment | — | — | — | — | — | — |

Totals (Build 33): 32 real call sites — 18 guarded, 1 data-flow native-only, 1 disabled-gate unreachable, **12 unguarded AND web-reachable** (the same 10 as main + AdminScreen :436 Restore + the MOD1 trio :191/:204/:207 counted as one live-only-after-migration cluster → 14 raw sites, 12 reachable in production today because :191/:204/:207 require the unapplied `mod1*` migrations).

## Unguarded + web-reachable subset (the actual defect list)

Ordered by user impact. "Both" = present at the given lines in main and Build 33.

| Rank | Site (main / B33) | Who | What the user experiences on web | Data loss? | Fix shape |
|---|---|---|---|---|---|
| 1 | SettingsScreen.tsx:555 / :556 | signed-in | Export my data fails (Supabase error or clipboard write rejected) → spinner stops, nothing copied, no message. PIPEDA subject-access channel fails silently. | no | `notify('Could not export data', 'Try again.')` |
| 2 | pushNotifications.ts:233 / :233 | signed-in | Push toggle: user confirms the PIPEDA `window.confirm`, then toggle stays off with no explanation (token is always null on web). | no | `notify(...)` — or hide/lock the push row on web (`pushLocked \|\| Platform.OS === 'web'`) since web push is not implemented at all. |
| 3 | SettingsScreen.tsx:460 / :461 | **guest** | "Export my data" row visible to guests; tap does nothing at all. | no | `notify('Sign in required', …)` (the sibling reopen path already does exactly this: FlagDetailModal.tsx:1074) |
| 4 | AdminScreen.tsx:156,177 / :388,:409,:436 | admin | Remove / Dismiss / (B33) Restore fails after a web-safe confirm → row unchanged, no message; F53 CAS-conflict explanation swallowed. | no | `notify('Error', errorMessage(e))` |
| 5 | FilterPresetsModal.tsx:181,202,228 / :186,:207,:233 | signed-in | Save silently does nothing; rename/delete silently roll back. | no (rollback) | `notify(...)` ×3 |
| 6 | AdminScreen.tsx — / :191,:204,:207 (B33 only) | admin | MOD1 reports queue partial-failure / conflict / error messages never shown. Action set is swapped so the destructive button is not re-offered, but the admin is not told the action already landed. | no | `notify(...)` ×3 — **not live**: requires unapplied `mod1*` migrations. |
| 7 | FeedbackModal.tsx:182 / :206 and feedback.ts:125 / :125 | guest + signed-in | Only if RNW `Linking.openURL(mailto:)` throws (malformed URL / `window.open` throwing) — practically never; popup-blocked `window.open` returns null without throwing. | no (body retained) | `notify(...)` ×2 |

Not defects (verified guarded): all MapScreen, ReportFlagModal, SignInScreen sites; FlagDetailModal photo/share/copy sites; confirm.ts, blockedContent.ts, pushNotifications.ts:49. Not reachable: FeedbackModal `unavailable` branch (data-flow), FlagDetailModal "Description required" (button disabled).

Every destructive or consent-bearing dialog in both trees already routes through `confirm()`/`notify()`/a Platform fork — the remaining bare calls are exclusively failure-path or validation messages. No bare `Alert.alert` with buttons that a web user must answer remains (the class that hangs promises / blocks flows, F46/F47/M4/B10) — those were all fixed before Build 33.

## FDA-033 Build 33 comparison

`src/components/OnboardingCards.tsx` is **byte-identical** in both trees:

```
git rev-parse 70b52a30:src/components/OnboardingCards.tsx f5594171:src/components/OnboardingCards.tsx
81e422988ed74d98799dbc2d04a905179116c3cf
81e422988ed74d98799dbc2d04a905179116c3cf
```
`git diff 70b52a30 f5594171 -- src/components/OnboardingCards.tsx` → empty. Lines 355-420 md5 `ec220f5f…` in both.

The fail-closed lookup is therefore **identical on Build 33 — not changed, not fixed**. Quoted (same line numbers in both trees):

```tsx
277:  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
278:  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
...
360:  const currentGranted =
361:    permission === 'location'
362:      ? locationGranted
363:      : permission === 'notifications'
364:        ? notifGranted
365:        : null;
...
369:  const permissionChecking =
370:    permission != null && Platform.OS !== 'web' && currentGranted === null;
...
376:  const showDecline =
377:    permission != null && currentGranted !== true && Platform.OS !== 'web';
...
382:  useEffect(() => {
383:    if (!permission || Platform.OS === 'web') return;
384:    let cancelled = false;
385:    const check =
386:      permission === 'location'
387:        ? Location.getForegroundPermissionsAsync().then(({ status }) => status === 'granted')
388:        : getNotificationPermission();
389:    check
390:      .then((granted) => {
391:        if (cancelled) return;
392:        if (permission === 'location') setLocationGranted(granted);
393:        else setNotifGranted(granted);
394:      })
395:      .catch(() => {});
396:    return () => {
397:      cancelled = true;
398:    };
399:  }, [permission]);
```

Behaviour on native if `getForegroundPermissionsAsync()` rejects (or `getNotificationPermission()` resolves `null` — pushNotifications.ts:120-131 returns `null` when expo-notifications is absent/throws): the granted state stays `null`, so `permissionChecking` stays `true` **indefinitely** and the primary CTA is disabled + dimmed (`disabled={permissionChecking}` :706, `opacity: 0.5` :711, `a11yToggle({ disabled })` :730). The `.catch(() => {})` never clears the checking state.

Escape hatches that keep this from being a hard trap (also identical in both trees):
- `showDecline` is true whenever `currentGranted !== true` on native, and the "Not now" button (:645-661, `onPress={handleDecline}`) is **not** disabled by `permissionChecking` → user can skip the slide.
- "Back" (:669-683) is enabled on non-first cards; `onRequestClose={handleSkip}` (:464) and the Skip control route to `onDone`.
- Mounted once per device from `App.tsx:208` (first launch only).

So FDA-033 stands as-is on Build 33: a stuck-disabled primary button with a visible "Not now" alternative when the no-prompt permission probe rejects. Same code, same behaviour, iOS-reachable.

## FDA-034 Build 33 confirmation

**Build 33 — locationErrorMessage() exists AND is wired into the MapScreen locate path:**
- `f5594171:src/lib/location.ts:72-78`:
  ```ts
  export const LOCATION_FAILURE_MESSAGE =
    "Couldn't get your location. Check that Location Services is on and try again. You can keep using the map without it.";
  export function locationErrorMessage(e: unknown): string {
    const raw = errorMessage(e, LOCATION_FAILURE_MESSAGE);
    return raw === LOCATION_TIMEOUT_MESSAGE ? raw : LOCATION_FAILURE_MESSAGE;
  }
  ```
- Import: `f5594171:src/screens/MapScreen.tsx:22` — `import { arrivalPermissionDenied, getCurrentPositionWithTimeout, initialLocationAction, locationErrorMessage } from '@/lib/location';`
- Call site: `f5594171:src/screens/MapScreen.tsx:1318-1321`, inside `requestLocation`'s `catch (e)` → native `else` branch (web goes to the live region at :1311-1316):
  ```ts
  // Prompt B B-UX-003: locationErrorMessage keeps raw native
  // diagnostics (e.g. kCLErrorDomain text) out of this alert while
  // still passing the specific, actionable timeout message through.
  Alert.alert("Couldn't find your location", locationErrorMessage(e));
  ```
- Also used at `f5594171:src/lib/location.ts:277` (`useUserLocation` hook, `setError(locationErrorMessage(e))`).
- Pinned by tests: `f5594171:src/lib/__tests__/location.test.ts:95-120` and `f5594171:src/screens/__tests__/MapScreenLocateFailure.test.ts:59-63` (asserts the exact `Alert.alert("Couldn't find your location", locationErrorMessage(e))` string is present in MapScreen).

**main — NOT wired (function does not exist):**
- `/Users/skypie/AccessMap-deep-audit-20260902/src/lib/location.ts` exports: `UserLocationState`, `getCurrentPositionWithTimeout`, `initialLocationAction`, `arrivalPermissionDenied`, `PeekLocationState`, `peekLocationState`, `UseUserLocationOptions`, `useUserLocation` — no `locationErrorMessage`, no `LOCATION_FAILURE_MESSAGE`.
- `src/screens/MapScreen.tsx:20` imports only `arrivalPermissionDenied, getCurrentPositionWithTimeout, initialLocationAction`; `:28` imports `errorMessage` from `@/lib/errors`.
- `src/screens/MapScreen.tsx:1299`: `Alert.alert("Couldn't find your location", errorMessage(e));` — raw native message (e.g. `kCLErrorDomain error N`) passes straight through `errorMessage()`'s generic fallback.
- `src/lib/location.ts:237`: `setError(errorMessage(e, 'Could not get location.'));`

Conclusion: FDA-034 is **fixed on Build 33** and **open on main** (main never received the Prompt B B-UX-003 change; the `git diff 70b52a30 f5594171 -- src/lib/location.ts` shows it as a Build-33-only addition).

## Recommended disposition

**FDA-036 (bare `Alert.alert` = silent no-op on web) — LOW, product defect (web build only), not a Build 33 blocker.**
- react-native-web 0.21.2 `Alert.alert` is confirmed `static alert() {}`.
- Main: 28 call sites, 10 unguarded + web-reachable. Build 33: 32 call sites, 12 unguarded + web-reachable in production (14 raw; 3 are behind unapplied `mod1*` migrations). Build 33 does not regress any existing site; it adds 4 bare admin-only sites.
- Why LOW and not MEDIUM: every remaining bare call is a failure-path or validation message. All destructive confirmations, consent prompts and button-bearing dialogs already route through `confirm()`/`notify()`/Platform forks. No site causes data loss (FilterPresets rolls back; Admin/Settings fail closed). iOS — the Build 33 submission target — renders every one of them correctly, so this finding has zero effect on the App Store build.
- Why not NOTE: three of the sites are real, reachable friction on the deployed web build — the PIPEDA export failure path (SettingsScreen:555/:556), the guest "Export my data" dead button (:460/:461), and the push-toggle confirm-then-nothing (pushNotifications.ts:233) — and two of those touch a privacy-flow. Fix is mechanical: replace `Alert.alert(` with `notify(` at the 10 (main) / 14 (B33) sites — `notify` is already imported in SettingsScreen and FlagDetailModal; AdminScreen/FilterPresetsModal/FeedbackModal/feedback.ts/pushNotifications.ts need the import. Consider additionally locking the push row on web.

**FDA-033 (OnboardingCards fail-closed permission probe) — LOW, debt, applies to Build 33 unchanged.**
- File is byte-identical (blob 81e42298) in main and Build 33; the `.catch(() => {})` at :395 leaves `currentGranted === null` → `permissionChecking` true → primary CTA disabled indefinitely on a rejected probe.
- Not MEDIUM because "Not now" (:645-661), Back, and Skip remain enabled, so the user is never trapped; the probe rejecting is a rare OS/entitlement state; first-launch only. Fix: `.catch(() => { if (!cancelled) setXGranted(false); })` so the slide degrades to the normal "Allow…" prompt button.

**FDA-034 (raw native location error text in the locate alert) — NOTE for Build 33 (fixed), LOW debt on main (open).**
- Build 33 imports and calls `locationErrorMessage(e)` at MapScreen.tsx:1321 (native branch of the locate catch), with unit + string-pin tests. Nothing to do for the submitted build.
- Main still calls `errorMessage(e)` at MapScreen.tsx:1299 and has no `locationErrorMessage` at all — the Build 33 change was never merged back. Not a product defect on the submitted build; it is a main-vs-submitted divergence to track (Prompt B B-UX-003 must be forward-ported, or main will ship the raw `kCLErrorDomain` text in the next iOS build cut from main).
