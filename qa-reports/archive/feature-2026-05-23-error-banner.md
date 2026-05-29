# Feature Push — AccessMap — 2026-05-23

## Summary

Built the **persistent flag-load error banner** on the Map (FEATURES.md →
*Now*, mirroring proposal P-NEW-2 from `qa-reports/qa-2026-05-23.md`).
Replaces the one-shot `Alert.alert` in `MapScreen.refreshFlags()` with a
red, tap-to-retry banner that persists until the next successful load,
so users can tell *"0 flags here"* from *"the fetch failed."*

**Typecheck:** green before · green after each commit · green at hand-off.
**Status:** complete, single reviewable diff (one file changed for the
feature + a new `LEARNINGS.md`).

A note on the planned feature: I had originally specced and started
building the **Categories & Severity Legend** (the first *Now* item).
After creating my branch I discovered another agent had **already
shipped that feature** on `feat/legend-sheet-2026-05-23` during the same
window — with all the constants in `lib/flags.ts`, the `LegendModal`
screen, and the `?` button wired into MapScreen. I deleted my duplicate
branch and pivoted to the *next* unambiguous backlog item rather than
build the same thing twice.

---

## Feature spec (as built)

**What:** When `listFlags()` rejects, MapScreen now shows a persistent
red banner — *"Couldn't load flags: <reason>. Tap to retry."* — instead
of a transient `Alert`. Tapping it re-runs `refreshFlags()`; while
retrying it shows a spinner and *"Retrying…"*. The banner clears on
the next successful load.

**Where it lives:** `src/screens/MapScreen.tsx` only. No new files for
the feature itself. (One new project doc — `LEARNINGS.md` — captures
the accessibility recipes used here.)

**User flow:**
1. App opens the Map → `refreshFlags()` runs.
2. If it fails (offline, server error, etc.) the red banner appears
   between the filter panel and the "Finding your location…" banner.
3. Screen readers narrate the failure (iOS via
   `AccessibilityInfo.announceForAccessibility`, Android via
   `accessibilityLiveRegion="polite"`).
4. User taps the banner → spinner + "Retrying…" → either it disappears
   (success) or updates with the new error.
5. Banner also reacts to the existing "⟳" refresh button if the user
   uses that — both paths call the same `refreshFlags()`.

**Components & data:** No new components. Reuses `Pressable` + `View` +
`Text` + `ActivityIndicator` from React Native, matching the existing
`styles.banner` shape but tinted red and with stronger shadow so it
stands out. One new piece of state: `loadError: string | null`. Zero
data/schema changes.

**Accessibility (built in, not bolted on):**
- `accessibilityRole="button"`, `accessibilityLabel` is the full error
  text, `accessibilityHint="Tries to load flags again"`,
  `accessibilityState={{ busy: loadingFlags }}` while retrying.
- `accessibilityLiveRegion="polite"` (Android) + an explicit
  `AccessibilityInfo.announceForAccessibility(message)` call (iOS) — so
  a failure is never silent.
- Red color is **paired with text and a ⚠ glyph** — meaning is never
  carried by color alone (AccessMap rule).
- `minHeight: 44` on the banner Pressable + generous vertical padding
  → ≥44pt touch target.
- `numberOfLines={2}` on the message so a long server error doesn't
  push the FAB off-screen at large dynamic type.
- No animation on appearance → reduced-motion respect is automatic
  (matches the existing banners).

**Assumptions documented:**
- The existing `Alert.alert('Could not load flags', …)` is **removed**;
  the persistent banner is now the only failure UX. P-NEW-2 explicitly
  said "banner alone is fine." If you'd rather keep the Alert in
  addition, easy 1-line revert in `refreshFlags`.
- Banner is placed **after** the filter panel and **before** the
  locating/permission banners. This keeps it visually attached to the
  Map content rather than colliding with the row of icon buttons.

---

## How to try it

Two clean ways to trigger the banner:

**Way A — block the network**
1. `cd ~/AccessMap && git checkout feat/flag-load-error-banner-2026-05-23`.
2. `npm run web` (browser is fastest to demo). Sign in.
3. Open DevTools → Network → "Offline".
4. Tap the "⟳" icon in the top-right of the Map.
5. **You should see** the red banner *"Couldn't load flags: …. Tap to
   retry."* appear under the icon row.
6. With network still offline, tap the banner. It briefly shows a
   spinner + "Retrying…" then re-shows the error.
7. Set Network back to "Online", tap the banner one more time → it
   should disappear and the map should populate with flags.

**Way B — break the Supabase URL temporarily**
1. Edit `.env` and change `EXPO_PUBLIC_SUPABASE_URL` to e.g.
   `https://example.invalid` (or just a bad subdomain).
2. `npm start` and re-open the app. Initial fetch fails → banner appears.
3. Restore the real URL → restart → banner is gone.

**Screen-reader sanity check (optional):**
1. iOS sim → VoiceOver on (`Cmd+F5`). Trigger an error.
2. VoiceOver should narrate the full "Couldn't load flags: … Tap to
   retry." message as the banner appears.
3. Swipe to the banner → it should read as a *button*, mention *busy*
   while a retry is in flight, and read the *hint* on first focus.

---

## What was built (branch `feat/flag-load-error-banner-2026-05-23`)

Two commits, off `main`:

| Commit  | What                                              |
|---------|----------------------------------------------------|
| d6a0262 | MapScreen: the banner itself + state + a11y wiring|
| 8d900f5 | docs: new `LEARNINGS.md` with two a11y recipes    |

Files: `src/screens/MapScreen.tsx` (+65/-4), `LEARNINGS.md` (new, 32 lines).

**Key pieces (plain language):**

- **`loadError` state.** A simple `string | null`. When `null`, no
  banner. When a string, the banner shows that string.
- **The banner JSX.** A `Pressable` styled red, with a ⚠ glyph that
  swaps to a spinner while `loadingFlags` is true. It's just one block;
  positioned right after the filter panel.
- **`refreshFlags()` updated.** Sets `loadError` to a friendly message
  on catch, clears it on success, and on iOS calls
  `AccessibilityInfo.announceForAccessibility(...)` so VoiceOver speaks
  the failure as soon as it happens.
- **`LEARNINGS.md`.** New project doc. Two short, dated recipes: the
  cross-platform announce pattern, and the color+icon+text status-banner
  recipe. Append-only — future runs can add more entries.

No new patterns were *invented* — the banner reuses the existing
`styles.banner` shape with adjusted colors/padding, the state +
Pressable + StyleSheet idioms already used everywhere, and the
React-Native `AccessibilityInfo` API.

---

## Proposals (NOT applied — need your review)

### 1. Merge `feat/flag-load-error-banner-2026-05-23` into main

```bash
git checkout main
git merge feat/flag-load-error-banner-2026-05-23
```

Once merged, edit `FEATURES.md` to move the *"Persistent flag-load
error banner on the Map"* bullet from **Now** down to
**Shipped (unmerged — awaiting review)** → and then remove it once it's
on main. (You typically do this yourself when reviewing.)

### 2. Reconcile the duplicate legend branches

The Categories & Severity Legend feature now exists on **two** branches
with identical commits:

- `feat/legend-sheet-2026-05-23` (the original)
- I deleted my duplicate `feat/categories-legend-2026-05-23` before
  shipping anything new.

**Suggested:** Merge `feat/legend-sheet-2026-05-23` into main when ready
— it's complete, type-clean, and accessibility-built. The
`LegendModal.tsx` it adds is rich (icon + label + description per
category, color + label + meaning per severity) and matches the
ReportFlagModal pattern. No action needed from me on this one — it's
not on my branch.

### 3. A small later phase for the error banner (optional)

If you want the banner to *also* react to `requestLocation()` failures
(currently still an `Alert`), the same treatment generalizes nicely.
Worth doing in its own diff so the change stays reviewable. I did **not**
do this in the current PR to keep scope to the one backlog item.

---

## Suggested next features (1–2)

1. **Status filter on the Map.** Already in the *Now* list. The
   existing filter panel has category + min-severity rows; add a third
   "Status" row with chips for open / verified / resolved / rejected.
   Defaults to *open + verified* to match `listFlags`'s default. Wires
   into the existing `filteredFlags` memo. One-screen, low-risk, born
   accessible (reuse the same `filterPill` pattern).

2. **Accessible list view of nearby flags.** Currently in *Next*. A
   FlatList-backed alternative to the map for screen-reader users —
   high value, and would justify a new `accessibilityPreferences`
   path in lib later. As a Phase-1 slice: just a FAB on the Map that
   pushes a stack screen showing `flags` (already in state) sorted by
   distance + severity, with each row tappable to focus that flag on
   the map (we already have the `focusFlag` param plumbed). The
   "auto-open if a screen reader is on" piece can come later.

---

## Verification

- **Typecheck**: green at start, green after each commit, green at end.
  Command: `npm run typecheck` (`tsc --noEmit`).
- **Reachable via**: Map tab → tap the existing "⟳" icon → if a network
  failure occurs, the banner appears. No new entry point needed; the
  banner is automatic.
- **Matches house style**: yes — Pressable + Text + StyleSheet idioms,
  red tint paired with existing shadow/elevation values from the FAB.
- **Accessibility implemented**: yes — see Phase-1 list above; every
  bullet is in the diff.
- **Load-bearing gotchas**: none broken — no schema, no map-library
  reach-through, no auth changes, no new dependency, types still use
  `type` not `interface`.
- **Commits**: 2 · **files touched**: 2 · **+97 / -4**.

---

## How to review

```bash
# diff
git diff main..feat/flag-load-error-banner-2026-05-23

# merge
git checkout main && git merge feat/flag-load-error-banner-2026-05-23

# discard
git branch -D feat/flag-load-error-banner-2026-05-23
```

Branch is **not** merged. No remote push attempted.

---

## Learnings & suggested skill updates

Two durable recipes were captured to `LEARNINGS.md` on the branch:

1. **Cross-platform announce-on-appear** — pair
   `accessibilityLiveRegion="polite"` (Android) with
   `AccessibilityInfo.announceForAccessibility()` (iOS) so a
   dynamically-appearing banner is narrated on both platforms without
   per-platform branching.

2. **Status-banner color + icon + text** — never use color alone. The
   `styles.errorBanner` block is the canonical example for future
   error/info banners in the app.

**Suggested skill-file follow-up (for your hand to fold in
deliberately):** the AccessMap reference file (`references/
accessmap-features.md`, in the feature-development skill) could add a
"Status-banner recipe" bullet to its accessibility baseline so future
runs reuse this pattern rather than re-deriving it. Not auto-applied.

**One process note worth recording**: today's run hit the case where a
parallel agent had already shipped the top backlog item before I
started building it. The correct response was to **delete my duplicate
branch and pivot to the next unambiguous item** rather than re-do the
work or invent a speculative one. Might be worth a sentence in the
skill (under "Handling ambiguity"): *"If a parallel run has already
built your selected feature, pivot to the next unambiguous backlog
item rather than duplicate."* — but again, no auto-edit.
