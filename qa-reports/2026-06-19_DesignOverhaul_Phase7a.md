# AccessMap — Phase 7a Report: Editorial Home + 3-Tab Navigation

**Date:** 2026-06-19
**Branch:** `overhaul/phase7-editorial-home` (off `main` @ `b39b7ef`) — **Sky-only merge** (AccessMap is not Art. 17).
**Plan:** `~/.claude/plans/accessmap-presentation-distributed-dawn.md`
**Status:** Built + self-verified (web/Chromium). **Awaiting Sky's on-device look-review before any 7b rollout** (the hard process gate).

---

## What shipped (this branch)

Commits: `387de2b` (HomeScreen saved as-built) → `7068221` (wire + fix) → `48f684e` (frosted glass tab bar).

**Native frosted-glass tab bar (added on Sky's go):** `RootNavigator` renders a `TabBarGlass` background (expo-blur `BlurView tint="dark"` + a dark contrast floor near the opaque `tabBarBg` for conservative AA + a `useReduceTransparency()` opaque fallback). The bar is `position:absolute` + transparent on native so the map/content shows through; **web path unchanged** (keeps `backgroundColor` + `backdropFilter` — BlurView is native-only). Every scrollable tab screen reserves room via `useBottomTabBarHeight()` so nothing hides behind the now-floating bar (MapScreen FAB tray/legend, Tasks/Profile/Settings/Admin scroll containers, Home's Report pill + padding — platform-aware, web keeps the safe-area inset since its bar stays in normal flow).

**Navigation restructure (presentation only):**
- The **Home tab** now renders the editorial `HomeScreen` (`headerShown:false` — the editorial header *is* the header). The full interactive map became the hidden **`FullMap`** route (`tabBarButton:()=>null`), reached via "Open full map", focus-flag rows (Tasks/Profile), and the `accessmap://flag/{id}` deep link (`linking.ts` repointed `Map`→`FullMap`).
- **3-tab bar**: Home · Tasks · Profile. **Settings + Admin moved into the hamburger drawer** (`HamburgerDrawer` gained gated entries + `onNavigate`; Admin shows only when `useIsAdmin()`). A new `drawerContext` mounts the drawer **once** (mirrors `sharedModalsContext`) so the menu button lives in the editorial Home header *and* the Tasks/Profile headers without duplicate mounts.
- `preferences`: default tabs → `Home/Tasks/Profile` + a one-time `'Map'→'Home'` read migration so existing users keep a valid landing tab.

**HomeScreen — fixed 4 real defects in the as-built screen:**
1. **SF-center bug** → distances were measured from a hardcoded San Francisco point (fake for any non-SF user). Now: fence-safe already-granted location (no prompt on mount), an opt-in **"Use my location"** button (user-initiated prompt), or an honest **"Recent"** list (no distances) when there's no center.
2. **Row-tap was silently broken** (passed `focusFlag` as a string) and the **Report pill used a dead param**. Tightened `useNavigation` typing surfaced both at compile time; rows now pass the `{id,lat,lng}` object → `FullMap`; Report opens the report sheet via a new `FullMap.openReport` effect in MapScreen.
3. **"Search a place"** is now a real, accessible control wired to the existing `AddressSearchModal` (recenters + re-sorts the list).
4. Added **loading (skeleton) / error (retry) / offline** states (were missing — it showed "no barriers" mid-load).
- Token cleanup: `shadow.glowBrand` (was raw hex), `radius.full`, `PressableScale` press feel.

---

## Gates (all green)

| Gate | Result |
|---|---|
| `npm run typecheck` | **0 errors** |
| `npm test` | **1722 passed, 0 failed** (107 suites; incl. updated linking + preferences tests, + a new `'Map'→'Home'` migration test) |
| `npm run lint` | **0 errors**, 90 warnings (**−1** vs. baseline — removed an unused import; no new warnings) |
| Fence (`git diff --stat`) | **No data/auth/EXIF/RLS/RPC/points-trigger/location-engine files touched.** MapScreen change = route generics + the `openReport` effect only. |

## Self-verified in the web preview (Chromium)

- Editorial Home renders (light **and** dark) — eyebrow "LATEST", "4 barriers", menu + feedback buttons, honest **"RECENT"** mode with **no fabricated distances** (row labels read e.g. "Significant · open").
- **3-tab bar** confirmed (Home · Tasks·badge · Profile); Settings/Admin off the bar.
- Hamburger drawer opens with **Settings** (Admin correctly hidden for a non-admin guest); navigating to the hidden **Settings** route from the drawer works (`title:"Settings"`).
- **Search** opens the address modal; **"Use my location"** + **Report** + map peek all present. **No console errors.**

---

## NEEDS-SKY-DEVICE (folds into the queued EXIF re-verify TestFlight build)

1. **Location-fence certification (most important):** on a fresh install with permission un-granted, Home shows the honest "Recent" mode and **prompts nothing**; the OS prompt fires **only** on the explicit "Use my location" tap.
2. **VoiceOver:** editorial header (☰/message announce as buttons), search announces as a button, "Use my location" + hint, row labels correct in both distance and Recent modes (no false "away"), Report opens the report flow.
3. **Dynamic Type** at max — the 34pt "N barriers" + rows don't clip.
4. **Reduce Motion** — `PressableScale` press + Map `animateTo` after a row tap suppressed; drawer snaps.
5. Hidden-tab UX — returning from Settings/Admin by tapping a visible tab feels fine (no active-tab highlight while on a hidden route).
6. **Frosted glass tab bar (native-only — the headline check):** does the blur read well, and do the active (`#60a5fa`) + inactive (white-55%) tints stay **AA-legible** over the live Dark-Matter map *and* over light list content scrolling underneath? Reduce Transparency drops it to the opaque bar. Confirm no content hides behind the now-floating bar on any screen (Tasks/Profile/Settings/Admin/Map FAB tray + Home Report pill).

> Chromium preview **cannot** certify Safari/iOS rendering, the native `expo-blur` tab bar, real haptics, or VoiceOver.

---

## DECISIONS FOR SKY

1. **The native frosted-glass tab bar is now in** (`48f684e`, on your go). It can't be seen in the Chromium web preview — `expo-blur` is native-only (web keeps its `backdropFilter`) — so its real effect + the **AA of the tab tints over live map content** is the headline device check (item 6 below). I used a conservative high-opacity dark floor so legibility stays close to the verified opaque bar; the transparency can be tuned up on device.
2. **Look-review gate:** per your process, 7b (rolling the editorial look to Profile/Leaderboard/cards/onboarding) does **not** start until you've seen 7a on device and okayed the direction.
3. **Pre-existing, not from this work:** the Tasks list logs web-only React-DOM nesting warnings (`FlagCard` renders nested `<button>`/`<h1>` via react-native-web). Harmless on native, untouched by Phase 7a — flagging only so it's not mistaken for a regression.

## Carried pending (yours — non-blocking)
- Privacy-copy sign-off (Hero-2, Phase 3). · ResourcesScreen `TODO(Sky)` URLs.
