# AccessMap — Fix-Run Prompt (fix EVERYTHING from the Master QA Sweep)

> Paste this whole file as the task for a fresh Claude Code / Cowork session rooted in `/Users/skypie/AccessMap`. It fixes every autonomous-fixable finding from the two QA passes, carves out the Sky-only items, and ships nothing to production. Source of truth: `qa-reports/2026-06-23_AccessMap_Master_QA_Sweep.md`.

---

## ROLE & GOAL
You are doing a **fix-run** on AccessMap (Expo SDK 54 / RN 0.81 / React 19.1 / TypeScript strict / Supabase). The full read-only QA sweep is done; the findings are in `qa-reports/2026-06-23_AccessMap_Master_QA_Sweep.md`. Your job: **implement every AUTONOMOUS-FIXABLE finding** below — all SERIOUS, MODERATE, perf quick-wins, MINOR/cleanup, and the optional enhancements — as small, verified, beginner-friendly diffs. AccessMap is Sky's flagship job-hunt artifact; quality and small understandable diffs matter more than speed.

## HARD GUARDRAILS (non-negotiable)
- **Branch from `main`** (currently `45bca1a`): `git switch -c fix/qa-sweep-2026-06-24`. **NEVER commit to `main`. NEVER merge or push to production — Sky merges.**
- **The data/auth/privacy FENCE is read-only.** Do **not** edit anything under `supabase/` (migrations, functions, schema, RLS, triggers), do **not** apply any DB change, do **not** run any live-data test, do **not** touch auth/session logic except the one client-side `auth.tsx` context-value memo explicitly listed. No external sends.
- **No new secrets, no credentials in code.** Do not touch `docs/APP_STORE_REVIEWER_NOTES.md` content beyond what's in the Sky-only list (you don't rotate the password — that's Sky's).
- **Conventions (`CLAUDE.md`):** use design tokens (never raw hex/numbers), use `<AppText>` not `<Text>`, build dark-mode styles via `makeStyles(color)`/`useColor()`, `confirm()` from `src/lib/confirm.ts` for destructive dialogs, no unrequested features, small diffs.
- **Verify before declaring done:** `npm run typecheck` (must pass), `npm test` (~1,575 tests must stay green), `npm run lint` (0 errors). Where a change is web-visible, sanity-check the web build.
- Commit per phase with clear messages. At the end, write a summary to `qa-reports/2026-06-24_AccessMap_FixRun_Result.md` and **stop for Sky to review/merge.**

---

## PHASE 1 — SERIOUS (do first)

1. **Light-mode hamburger drawer is unreadable.** `src/components/HamburgerDrawer.tsx:293` panel is hardcoded `rgba(8,10,20,0.96)` (always near-black) while text pulls theme tokens (`:328` brand, `:382` item labels, `:155` close X, `:274` chevrons) → in light mode dark text on near-black ≈1.3:1. **Fix:** commit to an always-dark drawer — hardcode light text (`#f5f5f5` / `rgba(255,255,255,0.7)`) to match the already-hardcoded white-alpha dividers/footer (`:344,:356,:360`). (Smaller, safer than re-theming the panel.) Verify both light & dark.

2. **Point values: one source of truth + fix the wrong FAQ.** `src/components/HelpModal.tsx:36` publishes **5/10/2/5**; the live trigger awards **reporter +10 verify / +15 resolve, actor +3 verify / +7 resolve** (per `CLAUDE.md` "Recent QA pass"). `TasksScreen.tsx:565/:572` hardcode the (correct) values too. **Fix:** create `src/lib/points.ts` exporting the four values as named consts (+ a helper for the flash strings), and make `HelpModal` and `TasksScreen` read from it. Correct the FAQ copy to 10/15/3/7 and note rejection awards none. *(Use 10/15/3/7 per CLAUDE.md; Sky confirms against the live trigger — see Sky-only N1. Do NOT edit the migration that embeds the old body.)*

3. **GPS read can hang forever — add a timeout.** `src/lib/location.ts:134` and `src/screens/MapScreen.tsx:963` call `Location.getCurrentPositionAsync(...)` with no timeout; the web path already passes `{ timeout: 10_000 }` (`location.ts:105`). **Fix:** wrap the native live read in `Promise.race([getCurrentPositionAsync(...), <15s reject>])` and route a timeout into the existing error branch (`setError`/`Alert`). Apply to **both** sites.

4. **Address search can hang — add a fetch timeout.** `src/lib/geocode.ts:89` & `:115` pass an AbortSignal but no timeout. **Fix:** combine the caller signal with `AbortSignal.timeout(8000)` (or a manual `setTimeout(()=>controller.abort(),8000)`); the existing `AbortError → []`/`null` handling (`:125`) already covers the rest.

5. **Modal screen-reader focus-move (WCAG 2.4.3).** `setAccessibilityFocus` appears **0×** app-wide — no modal places VoiceOver/TalkBack focus on its title on open. **Fix:** add a title `ref` + `AccessibilityInfo.setAccessibilityFocus(findNodeHandle(titleRef.current))` on open, centralized in `src/components/ui/Sheet.tsx`, and apply the same to the hand-rolled modals (start with the high-traffic ones: `FlagDetailModal`, `NotificationPreferencesScreen`, `LegendModal`, `ReportFlagModal`). One small shared hook is ideal. *(Behavior certifies on device — Sky N5 — but the code gap is real.)*

---

## PHASE 2 — MODERATE

6. **Report FAB dead on web.** `src/screens/MapScreen.tsx:1888-1919` `disabled={!location}` can leave the primary Report affordance permanently dimmed on web. **Fix:** on web, let the FAB **open the report modal and resolve location inside it** (the modal already shows "Waiting for location…" and blocks submit on `!location`), instead of gating the FAB on a resolved `location`.
7. **ProfileScreen error invisible on web + no retry.** `src/screens/ProfileScreen.tsx:349` uses `Alert.alert` (no-op on web). **Fix:** inline error state + "Try again" calling `load()`, mirroring `LeaderboardScreen`'s pattern.
8. **AddressSearch has no error state.** `src/components/AddressSearchModal.tsx:85-94`: a thrown/stalled search shows a perpetual spinner or a misleading "No matches". **Fix:** wrap the `await searchAddress(...)` in try/catch; on non-abort error set a distinct error state with Retry (separate from the empty card).
9. **Optimistic reconcile swallows refresh failure.** `src/screens/TasksScreen.tsx:446/:580/:599` `refresh().catch(()=>{})`. **Fix:** surface a soft "couldn't refresh — pull to update" hint instead of an empty catch.
10. **Confirm dialog on Reject.** Single-tap Reject has no confirm while bulk/admin/delete do. **Fix:** add `confirm()` to Reject on the Tasks card (`TasksScreen.tsx:1428`) and `FlagDetailModal.tsx:1369`.
11. **PhotoGallery breaks on rotation.** `src/components/PhotoGallery.tsx:18` reads `Dimensions.get('window')` once at module load. **Fix:** use `useWindowDimensions()` inside the component for the paging width/`contentOffset`/page math.
12. **Deep-link callout race.** `src/screens/MapScreen.tsx:1077` fires `showCallout` on a fixed 700 ms timer not gated on the marker existing. **Fix:** retry `showCallout` a couple of times ~150 ms apart (or open on a map-ready/layout callback); ensure the focused flag isn't clustered at the arrival zoom on web.
13. **Drawer → hidden-route dead-tap.** `src/navigation/RootNavigator.tsx:371-381`: if `navigationRef.isReady()` is false the navigate is silently dropped. **Fix:** defer/retry (microtask/`requestAnimationFrame`) instead of dropping, or keep the drawer open until the navigate confirms.

---

## PHASE 3 — PERFORMANCE (quick wins + the big lever)

14. **Code-split the bundle (biggest TTI lever).** `src/navigation/RootNavigator.tsx` statically imports every screen + all modals into one 4.15 MB chunk. **Fix:** `React.lazy()` + `Suspense` (with a small fallback) around the gated, interaction-only surfaces — `AdminScreen`, `SettingsScreen`, `ReportFlagModal`, and the heaviest modals (`FlagDetailModal`, `LeaderboardModal`, etc.). Enable Metro web async chunking in `metro.config.js` (currently the bare default). Keep `MapScreen`/`HomeScreen`/`TasksScreen` eager. Verify web still builds and lazy chunks load.
15. **Memoize `makeStyles` (rebuilt every render).** Change `const styles = makeStyles(color)` → `const styles = useMemo(() => makeStyles(color), [color])` in `MapScreen.tsx:196`, `TasksScreen.tsx:88`, `ProfileScreen.tsx:150`, and **`FlagCard` (TasksScreen.tsx:1263)**.
16. **Fix the defeated `FlagCard` memo.** `src/screens/TasksScreen.tsx:638-671`: hoist the inline `onPress` out of `renderFlagItem` into a stable `useCallback` (passing `flag` through) so selection/triage state changes don't recreate the handler and re-render every visible card.
17. **Prune dead font weights.** Only 8 of 48 shipped `.ttf` are used (browser fetches exactly 8 — confirmed). **Fix:** import the 8 weights via per-weight subpaths (e.g. `@expo-google-fonts/public-sans/400Regular/PublicSans_400Regular.ttf`) in `src/lib/fonts.ts`, and/or add a post-`expo export` prune script removing unreferenced `dist/assets/**/*.ttf`. Goal: deploy drops from ~8.4 MB toward ~5 MB; first paint unchanged.
18. **Fix the broken Lighthouse CI path (one line).** `.lighthouserc.js:4` serves `web-build`; expo outputs `dist`. Change `serve web-build` → `serve dist`. This re-activates the `accessibility ['error', 0.9]` gate.
19. **Memoize the auth context value.** `src/lib/auth.tsx:81` returns a fresh object every `setSession` (re-renders all consumers, incl. hourly token refresh). **Fix:** `const value = useMemo(() => ({ session, user: session?.user ?? null, loading }), [session, loading])`.
20. **HamburgerDrawer timer leak.** `src/components/HamburgerDrawer.tsx:109` `setTimeout(()=>setSubScreen(...),220)` has no cleanup and calls setState. **Fix:** store in a ref and `clearTimeout` on unmount (or guard with a `mountedRef`).
21. **Service worker stale-shell window.** In `public/sw.js` (and the built `dist/sw.js` regenerates from it): use **`NetworkFirst` for navigation requests** (`request.mode === 'navigate'` / the `'/'` document) while keeping `StaleWhileRevalidate` for hashed JS/CSS, and bump `CACHE_VERSION` so the activate-cleanup fires. *(Edit `public/sw.js` only; `dist/` is build output.)*
22. **(Investigate) Lucide tree-shaking.** Bundle shows ~5,783 SVG path attrs vs 44 icons imported. Run `npx expo export --platform web` with sourcemaps + `npx source-map-explorer` to confirm whether lucide over-ships; if so, import per-icon subpaths. If it tree-shakes fine, note it and move on.

---

## PHASE 4 — MINOR / CLEANUP

23. Touch targets → 44: `src/screens/TasksScreen.tsx:~1550` (`minHeight:40`→44) and `LegendModal` close-row/close button.
24. `src/components/HamburgerDrawer.tsx` — done in #1; also add `maxFontSizeMultiplier` (~1.3) to `MapScreen.tsx:2222/:2268` map-chrome status pill + action-bar labels (Dynamic Type overflow).
25. Remove dead code: unused `Text` import in `MapScreen.tsx:11` and `ReportFlagModal.tsx:11`; unreachable `: 'Flag reopened'` branch in `FlagDetailModal.tsx:409`.
26. Unify offline-banner copy across `HomeScreen.tsx:275`, `MapScreen.tsx:1311`, and the Nearby notice (one shared string).
27. `src/components/OnboardingCards.tsx:298` — keep swipe under Reduce Motion (`scrollEnabled` stays true; only drop the scroll animation), matching `OnboardingModal`.
28. `src/components/SavedPlacesModal.tsx:283` — early-return on empty name in `handleAddSubmit` (don't rely on the thrown-error path; `Alert.alert` is a web no-op). Mirror `FilterPresetsModal.handleCreate`.
29. `src/hooks/useNotificationPreferences.ts:145` — at minimum add a `console.warn` on the swallowed pref-write failure (ideally a soft toast). *(Borderline tier — keep it a warn; don't over-engineer.)*
30. Convert fixed-height sheets to `maxHeight` so short lists shrink-wrap: `MyReportsModal.tsx:452`, `ActivityFeedModal`, `AchievementsModal`.
31. `src/components/StatusHistoryModal.tsx:218-305` — replace raw numeric/hex literals with `radius`/`spacing`/`font.size` tokens.
32. `src/components/FilterPresetsModal.tsx:292` — verify all live call-sites pass `onApply`; if manager-only mode is unreachable, delete the "Wiring next release" dev branch.
33. `src/components/AchievementsModal.tsx:140` — replace the hardcoded `#fff3d1` earned-wash with a token that has adequate dark-mode contrast against the light-gold icon.
34. `src/components/LeaderboardModal.tsx:257` — drop the `as unknown as number` cast; use a plain `'85%'` like the other modals.
35. Add trailing `.catch(()=>{})` to the permission-status `.then()` chains: `MapScreen.tsx:992`, `OnboardingCards.tsx:225` (theoretical unhandled rejection).

---

## PHASE 5 — ENHANCEMENTS (optional; do if time allows, separate commits)

36. **Pinch-zoom on evidence photos** — add pinch-to-zoom to `PhotoLightboxModal` (and the PhotoGallery lightbox) using the already-installed `react-native-gesture-handler`. Highest-value a11y enhancement for low-vision users inspecting curb/ramp/obstruction detail.
37. **Consolidate modals onto `Sheet`** — migrate the hand-rolled list modals (MyReports/MyWatched/MyFeedback/Activity/SavedPlaces/Achievements) to the `Sheet`/`SheetHeader` primitive for a uniform drag-handle, close button, and title rhythm. Incremental; one modal per commit.
38. **Unified "you're offline" banner** — a shared component that detects offline and shows one consistent message, replacing the generic per-screen error copy.
39. **Tasks bulk bar: show "N open · M verified"** so the asymmetric Verify/Resolve enabled-states read as intentional to sighted users.
40. **(Content) ResourcesScreen real links** — the cards are link-ready (`url?`); leave as info cards unless Sky supplies URLs (this one is Sky's content call — flag it, don't invent links).

---

## DO **NOT** ATTEMPT — surface these for Sky in the result file (data layer / device / judgment)
- **N1 — confirm the live points-trigger values** (10/15/3/7) against the actual Supabase trigger before trusting #2.
- **N2 — confirm the `context_tags` migration is applied live** (else the Report form shows "coming soon"). Dashboard check.
- **N3 — rotate the `reviewer@accessmap.com` test password in Supabase** (instantly neutralizes the value committed at `docs/APP_STORE_REVIEWER_NOTES.md:8` + git history) and decide whether to scrub history (force-push — Sky's call).
- **N4 — confirm applied-vs-proposed migrations**; decide whether to apply the DB-level `status_transition_guard` (defense-in-depth; the shipped app is already protected by the client compare-and-set).
- **N5 — TestFlight VoiceOver/TalkBack pass** (every screen × state × theme at max Dynamic Type) to certify the a11y fixes, light-mode drawer, glass-chrome contrast, and GPS-stall behavior on a real device.
- **N7 — low-end-Android frame profiling** to quantify the perf wins.

---

## VERIFY & REPORT (end of run)
1. `npm run typecheck` → 0 errors. 2. `npm test` → all green (note any updated snapshots/tests). 3. `npm run lint` → 0 errors. 4. For web-visible changes, build/serve and sanity-check (drawer in light mode, Profile error/retry, lazy chunks load, no console errors).
5. Write `qa-reports/2026-06-24_AccessMap_FixRun_Result.md`: what changed (grouped by phase, with file:line), test/lint/typecheck status, anything deferred + why, and the **Sky-only list (N1–N7)** restated.
6. **Stop. Do not merge or push to production.** Leave the `fix/qa-sweep-2026-06-24` branch for Sky to review and merge.
