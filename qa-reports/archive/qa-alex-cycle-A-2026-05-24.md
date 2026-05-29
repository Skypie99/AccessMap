# Alex — WCAG 2.2 AA review of Cycle A (F2/F3/F4) — 2026-05-24

## Summary

14 findings across 3 branches (4 HIGH, 7 MEDIUM, 3 LOW). None of the three branches catastrophically blocks disabled users — labels/roles/contrast/touch-target floors are mostly right — but **F2 (Onboarding)** has the most user-visible defects (no `accessibilityViewIsModal`, no reduced-motion respect, decorative dots-row only half-hidden on Android, and a card label that swallows the heading semantic). F3 and F4 are merge-ready with minor polish. The destructive sign-out / delete Alerts are real no-ops on web (Alert.alert on RN Web prints a console warning and returns immediately) — flag for the web target, not a native blocker.

## Findings by branch

### F2 — Onboarding (`feat/onboarding-flow-2026-05-24`)

- **[HIGH] Missing `accessibilityViewIsModal` on the onboarding overlay.** `OnboardingCards.tsx` renders a `<Modal>` with `presentationStyle="fullScreen"` but the inner `<View style={styles.screen}>` has no `accessibilityViewIsModal` prop. On iOS, VoiceOver can escape to whatever underlying view exists below the modal (here the loading view from `FirstLaunchGate`, but a future change could expose the sign-in screen). Add `accessibilityViewIsModal` to the root `<View style={styles.screen}>`. (WCAG 2.4.3 Focus Order.)

- **[HIGH] No `useReducedMotion` / `AccessibilityInfo.isReduceMotionEnabled()` respect.** `goTo()` always calls `scrollRef.current?.scrollTo({ x: clamped * width, animated: true })`. Users with `Reduce Motion` enabled in OS settings get the same horizontal animation. Per WCAG 2.3.3 (Animation from Interactions, AAA — but Apple/Google a11y guidance treats it as table stakes), `animated` should be `false` when reduced motion is on. Read once via `AccessibilityInfo.isReduceMotionEnabled()` on mount and gate the `animated` flag.

- **[HIGH] Card `accessibilityLabel` swallows the `accessibilityRole="header"`.** The card `<View accessible accessibilityLabel="Card N of 3. {title}. {body}">` makes the entire card a single SR node. Because the wrapper is `accessible`, the inner `<Text accessibilityRole="header">{card.title}</Text>` is no longer separately focusable — the `header` role is lost. VoiceOver "headings" rotor won't list these screens. Either (a) drop `accessible` from the card and let the inner Text nodes be separately reachable (the header rotor will then work), or (b) keep `accessible` and add `accessibilityRole="header"` to the wrapper (slightly weaker — the whole card becomes the heading).

- **[MED] "Card N of 3" is in the label but is never re-announced when active card changes.** Swiping or pressing Next/Back changes `index` and dot color, but the carousel itself is just a `ScrollView` — there's no `AccessibilityInfo.announceForAccessibility('Card 2 of 3')`. SR users who swipe lose orientation, and pressing Next moves focus back to the same button so the new card isn't read. Add a `useEffect([index])` that calls `AccessibilityInfo.announceForAccessibility(\`Card ${index + 1} of ${CARDS.length}: ${CARDS[index].title}\`)` — keep the existing labels too.

- **[MED] Decorative dots-row prop order is right on iOS but inconsistent across the file.** `dotsRow` correctly uses both `importantForAccessibility="no-hide-descendants"` AND `accessibilityElementsHidden` — good. But the per-card emoji `<Text>` does the same (good). The card wrapper `accessible accessibilityLabel="..."` — because it's `accessible=true`, the nested emoji's `accessibilityElementsHidden` is moot (the wrapper already takes over the label). Not broken, but worth a one-line comment so the next reader doesn't wonder why both layers carry the hide pattern.

- **[LOW] `skipText` uses `color.textMuted` (#666, 5.7:1 on white) — passes AA. ✓** Comment in file is correct.

- **[LOW] `backBtn` disabled state — `opacity: 0.4` on `color.textMuted` drops effective contrast below AA.** The disabled Back button stays at `color.textMuted` (#666) but the wrapper has `opacity: 0.4`, which compounds to roughly 2.3:1 effective contrast — below AA for any text. Mitigation: SR users get the correct `accessibilityState.disabled` announcement (which the file does correctly), so this is a sighted-user low-vision concern, not an SR concern. Either (a) keep the disabled visual but accept the WCAG miss (UI control, not text — 3:1 AA Non-Text), or (b) raise the disabled opacity to ~0.55. I'd take option (b) for a 30-second polish.

- **[LOW] Get Started button doesn't announce the "tutorial complete" transition.** When the modal dismisses, the underlying surface (`Gate` → `SignInScreen` or `SignedInArea`) gains focus with no announcement. Consider `AccessibilityInfo.announceForAccessibility('Tutorial complete. Opening AccessMap.')` before `onDone()`. Polish, not a defect.

### F3 — Settings hub + About (`feat/settings-hub-2026-05-24`)

- **[HIGH] About modal — root `<View style={styles.card}>` missing `accessibilityViewIsModal`.** Same class of bug as F2: a transparent `<Modal>` with no `accessibilityViewIsModal` on the foreground card. VoiceOver can drag past the modal into the Settings list below. Add `accessibilityViewIsModal` to `styles.card`.

- **[MED] About hero badge emoji `🗺️` only sets `accessibilityElementsHidden` — Android won't hide it.** `<Text style={styles.heroBadgeIcon} accessibilityElementsHidden>` is iOS-only. Per RN docs, Android requires `importantForAccessibility="no-hide-descendants"` in addition. TalkBack will announce "map emoji v1.2.3" instead of just "v1.2.3". Fix: add `importantForAccessibility="no-hide-descendants"` to match the pattern correctly used in OnboardingCards and SettingsScreen.

- **[MED] Settings tab — `tabBarIcon` emoji has no `accessibilityLabel` and inherits from tab title "Settings".** RN bottom-tabs reads the tab title for the icon by default, so SR users hear "Settings, tab, 4 of 4" — that's fine. BUT TalkBack on Android may announce the literal `⚙️` emoji as "gear" before the tab name depending on the TTS engine. To be safe, wrap the icon `<Text>` with `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` so only the tab label is announced. Same pattern applies to all 4 tab icons (Map, Tasks, Profile, Settings) — pre-existing, not regressed by this branch, but newly visible because Settings adds a 4th.

- **[MED] Sign-out destructive state is communicated by COLOR ONLY for SR users.** The Sign Out row uses `color.error` text and the same generic `accessibilityHint="Asks for confirmation before signing you out"`. SR users get no signal that this is destructive. WCAG 1.4.1 (Use of Color) is technically met because the Alert that fires after press is also destructive ("Sign out?" prompt), but adding `accessibilityHint="Destructive. Asks for confirmation before signing you out."` would make the warning available to SR users at the moment of focus, not after the press.

- **[LOW] Row chevron `›` correctly hidden on both iOS + Android.** Both `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` set. ✓

- **[LOW] About modal close `✕` is announced as button "Close about" — text-emoji unhidden but it's the button's own visible label.** No issue: the parent Pressable has `accessibilityLabel="Close about"` which overrides the child Text. ✓

- **[LOW] Body text `bodyText: color.textMuted (#666)` — 5.7:1 on white surface, AA pass. ✓** Comment in file is accurate. `tagline` uses `color.text` (#333) which is 12.6:1 — fine. `sectionHeader` uses `textMuted` at `font.size.xs` (12pt) — `xs` is **below** AA's 18pt large-text threshold so the regular 4.5:1 floor applies; 5.7:1 still passes. ✓

- **[LOW] Settings row min-height is 64pt (well above 44pt). ✓** `rowChevron` color uses `color.textSubtle` (#999, 2.85:1) but is decorative and hidden from SR, so the 3:1 Non-Text UI minimum is moot here. ✓

### F4 — Filter presets (`feat/filter-presets-manager-2026-05-24`)

- **[HIGH] `accessibilityViewIsModal` is present on the card — ✓** — this branch correctly does what F2 and F3's About modal both miss. Use this file as the reference pattern when fixing F2/F3.

- **[MED] Each preset row uses `accessibilityRole="button"` BUT the inner Rename/Delete pressables are ALSO buttons inside it.** Nested interactive elements are a known SR friction: VoiceOver will read the outer row label ("Preset Downtown commute, 2 categories...") and then announce Rename and Delete as nested children that the user can swipe into. iOS handles this acceptably but TalkBack on Android sometimes flattens or skips. Fix: change the outer `<View>` from `accessibilityRole="button"` to `accessibilityRole={undefined}` (or omit role) — the row isn't actually pressable, only Rename/Delete are. Keep the `accessibilityLabel` as descriptive context.

- **[MED] "Wiring next release" italic hint is read to SR users as plain text.** Per the brief's question: it currently reads as "Wiring next release" with no clarification it's a status badge, not an action. Recommend wrapping with `accessibilityLabel="Status: wiring lands next release"` so the role is clear, OR hide it from SR entirely (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`) since the placeholder context is also in the empty-state copy and the add-form hint. My pick: hide it — it's redundant noise the third time it's announced down the list.

- **[MED] Delete button text color `#c0392b` on `#fdecea` background — contrast measured 5.3:1, AA pass for normal text.** ✓ But the `deleteBtn` background `#fdecea` on the modal card background `#fff` is a ~1.05:1 difference — the button is essentially invisible as a *button shape* without the text, which is a WCAG 1.4.11 Non-Text Contrast (3:1) miss for the UI control boundary. Add a 1px border `#f5c6c0` (already used elsewhere in the design tokens as `errorBg`-adjacent) or rely on the existing red text to carry the affordance — acceptable for a labeled button, but worth a note.

- **[LOW] Empty-state body `#5b6470` on `#fff` — 6.8:1, AA pass. ✓**

- **[LOW] `addFormHint` italic at `#5b6470` 12pt — 6.8:1, AA pass. ✓**

- **[LOW] `noticeText` `#714b00` on `#fff7e6` — 8.3:1, AA pass. ✓**

- **[LOW] `rowApplyHint` color `#888` is 3.5:1 on white — BELOW AA 4.5:1 for normal body text (11pt).** This is the same anti-pattern flagged in last cycle (textSubtle / #999 territory). Either bump to `#5b6470` (matches the rowSummary above it) or, paired with the HIGH/MED recommendation above to hide this from SR, drop the visual weight intentionally so sighted users see it as a soft badge. If keeping visible, use `#5b6470`.

- **[LOW] "Delete preset" confirm Alert uses "Cancel" + "Delete" — clear, not generic "OK". ✓**

- **[LOW] TextInput has `accessibilityLabel` + `maxLength={MAX_NAME_LENGTH}` (60). ✓** Both rename and add forms.

- **[LOW] "+ New" button is 44×44 minimum, has `accessibilityLabel`, and `accessibilityState.disabled` is set when limit reached or already adding. ✓**

## Cross-cycle patterns

1. **`accessibilityViewIsModal` is missed twice and used correctly once.** F4 is the right pattern (`<View style={styles.card} accessibilityViewIsModal>`). F2 and F3 (About) both need the same prop on their card/screen root. Suggest a one-line rule: "every `<Modal>` in this codebase wraps a `<View accessibilityViewIsModal>`". Could be enforced with a custom ESLint rule later.

2. **Decorative emoji hiding pattern is correct in 2 of 3 places.** F2's card emoji and dots-row + F3's chevron all use both `accessibilityElementsHidden` AND `importantForAccessibility="no-hide-descendants"`. F3's `heroBadgeIcon` on AboutScreen drops the Android prop — fix it. Tab-bar icons across RootNavigator (all 4 tabs, pre-existing) also drop the prop — out of scope for this cycle but worth a future ticket.

3. **`color.textSubtle` (#999) still appears as an anti-pattern.** F4 introduces `rowApplyHint: { color: '#888' }` which is the same below-AA value previously flagged. The fact that it slipped in despite the design-tokens file having an explicit comment ("only for non-essential text or 18pt+") suggests a process gap, not a knowledge gap. Suggest Dani add a lint-time guard or rename the token to `textSubtleLargeOnly` so the constraint is in the name.

4. **`Alert.alert` is a NO-OP on web — destructive flows silently succeed without confirmation.** Both F3's sign-out and F4's delete-preset use `Alert.alert(...)`. On `react-native-web` (the project's web target), Alert.alert prints a console warning and immediately resolves with no UI shown — meaning a web user clicking "Sign out" or "Delete" gets either (a) no action at all, or (b) the action fires without confirmation, depending on RN-Web version. **For F3 specifically this is dangerous**: sign-out would silently no-op on web. **For F4** the delete would no-op (good, conservative) but the user would think it was queued. Recommend a small `confirm()` shim for web — `Platform.OS === 'web' ? window.confirm(...) : Alert.alert(...)`. Steve/Peter should also confirm web is a supported target before raising this to HIGH.

5. **i18n note (future, not a fix now):** All user-visible strings are inline. Settings rows, About page copy, and Onboarding cards (~30 strings between them) would benefit from being wrapped in an `i18n.t()` call when localization is in scope. AccessMap's users include screen-reader users in many languages, so this is a real accessibility lever, not just polish.

## Merge verdict

| Branch | Verdict | Critical issues |
|---|---|---|
| F2 — Onboarding | ⚠️ Merge with follow-up fix branch | Missing `accessibilityViewIsModal`; no reduced-motion respect; card label collapses header role |
| F3 — Settings hub + About | ⚠️ Merge with follow-up fix branch | About modal missing `accessibilityViewIsModal`; heroBadgeIcon Android-leaks the emoji |
| F4 — Filter presets | ✅ Merge | None HIGH; nested-button pattern is a MED polish item |

None of these are HARD blockers — every HIGH is a SR-experience defect, not a "feature is unusable" defect. F4 is the cleanest of the three and can ship as-is. F2 and F3 would benefit from a follow-up `fix/a11y-cycle-A-modals-2026-05-24` branch that adds the 3 missing `accessibilityViewIsModal` props + the reduced-motion hook + the `importantForAccessibility` prop on the hero badge — that's ~6 lines of code total.

## Polish tickets (priority order)

1. **`fix/a11y-cycle-A-modals`** — add `accessibilityViewIsModal` to F2 OnboardingCards `styles.screen` and F3 AboutScreen `styles.card`. (~2 lines)
2. **`fix/a11y-onboarding-reduced-motion`** — read `AccessibilityInfo.isReduceMotionEnabled()` on mount in OnboardingCards; gate `animated` flag on `scrollTo`. (~6 lines)
3. **`fix/a11y-onboarding-header-role`** — drop `accessible` from the card wrapper so the inner `<Text accessibilityRole="header">` is separately reachable. Add `useEffect([index])` to announce card change. (~10 lines)
4. **`fix/a11y-about-android-emoji`** — add `importantForAccessibility="no-hide-descendants"` to heroBadgeIcon. (~1 line)
5. **`fix/a11y-settings-destructive-hint`** — add "Destructive." prefix to the Sign Out row's accessibilityHint. (~1 line)
6. **`fix/a11y-presets-nested-buttons`** — drop `accessibilityRole="button"` from the outer preset row; keep label. (~1 line)
7. **`fix/a11y-presets-applyhint-contrast`** — bump `rowApplyHint` color from `#888` to `#5b6470` OR hide from SR. (~2 lines)
8. **`fix/web-alert-confirm-shim`** (CROSS-CUTTING) — Platform-aware confirm() shim for destructive Alert.alert flows. Affects F3 sign-out + F4 delete + likely existing flows. Owner: Steve/Peter to scope.
9. **`fix/a11y-tabbar-icons-hidden`** (PRE-EXISTING) — add `importantForAccessibility="no-hide-descendants"` to all 4 tabIcon emoji Text nodes in RootNavigator. Out of scope for this cycle but newly visible because F3 adds the 4th tab.
