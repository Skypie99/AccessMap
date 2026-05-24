# AccessMap — durable learnings

Short, dated, additive notes — patterns, gotchas, and recipes that paid off
during a build. New entries go at the top. Never delete or rewrite past
entries; the file is the project's accumulated wisdom.

---

## 2026-05-23 — Merge-on-done > stacking branches

After landing four stacked fastloop branches in one painful merge, the
new operating rule is: integrate each branch into `main` AS SOON AS it's
finished and green, never let multiple feature branches stack up.

Auto-land checklist (every condition must hold):
1. `git merge --no-ff <feature>` produces no conflict.
2. `npx tsc --noEmit` is green.
3. `npx jest` is green (no `--testPathIgnorePatterns` flag needed since
   v4 added `/.claude/` to jest.config.js).
4. The branch touches no protected path (Supabase migrations,
   credentials, `app.json` scheme, etc.).

If ANY check fails, STOP, leave the branch un-merged, and surface to
Sky with a clear note. The eve-of-2026-05-23 loop hit all-green on three
back-to-back features (changelog, Tasks polish, address search) using
this pattern — three clean merges, zero conflicts, ~15 minutes between
each landing.

Why this beats stacking:
- Each branch sees an up-to-date `main` as its base. No "merge v1 then
  v2 then v3" cascade where v2 conflicts because v1 moved its target.
- Each landing is a small atomic review surface for Sky.
- Rolling back is `git revert <single-merge-commit>`, not a rebase.

## 2026-05-23 — Nominatim geocoder needs a User-Agent (or fails silently)

Nominatim's free tier requires a meaningful `User-Agent` header per
their usage policy
(https://operations.osmfoundation.org/policies/nominatim/). Skipping it
can get the app's IP rate-limited or banned without any obvious error
on the client side — the API silently returns errors or empty arrays.

The pattern in `src/lib/geocode.ts`:

```ts
const USER_AGENT = 'AccessMap/1.0 (skylerhalisky@gmail.com)';
fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal });
```

Other policy rules baked into the helper:
- Debounce calls in the UI (350ms in `AddressSearchModal`) to stay
  under the 1-req/sec cap with room to spare.
- Cap results at 5 in the URL (`&limit=5`).
- Return `[]` on every failure path so the UI degrades to "no matches"
  rather than surfacing an alarming error.

## 2026-05-23 — SectionList > FlatList when statuses are visually distinct

`TasksScreen` used to flatten Open + Verified flags into one
`FlatList`. Visually the distinction got lost — a verified flag was a
white card right after an open flag's white card. Swap to
`SectionList`:

```tsx
const sections = useMemo(() => {
  const open = flags.filter((f) => f.status === 'open');
  const verified = flags.filter((f) => f.status === 'verified');
  const out = [];
  if (open.length > 0) out.push({ title: 'Open', data: open });
  if (verified.length > 0) out.push({ title: 'Verified', data: verified });
  return out;
}, [flags]);

<SectionList
  sections={sections}
  renderSectionHeader={({ section }) => <Header ... />}
  ...
/>
```

Three things to remember:
- Skip empty sections in the `useMemo` (don't render orphaned headers).
- Set `stickySectionHeadersEnabled={false}` unless you specifically want
  sticky behavior — the default is platform-dependent and surprising.
- The section count pill (brand-soft + brandOnSoft) reuses the
  theme tokens that already pass AA contrast.

## 2026-05-23 — Two-key persistence > rewriting a v1 blob

When a feature wants a single new pointer / field next to an
already-versioned AsyncStorage payload (e.g. the `_v1` named-sets array),
store it under its own namespaced key (`@accessmap/<thing>_v1`) instead
of bumping the existing blob's schema. Benefits:

- Existing parser tests still pass unchanged — the v1 shape isn't
  touched, so old corruption + cap + duplicate cases keep their meaning.
- Toggling the pointer doesn't have to rewrite the entire sets array on
  AsyncStorage (cheaper write + smaller failure surface).
- Cleanup is a two-line cascade in the load-bearing mutation (the
  bigger blob's delete writes a `removeItem` for the pointer key) — no
  cross-blob "current row pointer" sentinel.

Used for the default-saved-filter pointer
(`@accessmap/default_filter_set_v1` alongside
`@accessmap/filter_sets_v1`). The same pattern fits any future "currently
selected X" pointer that lives over an existing collection.

## 2026-05-23 — Decorative glyphs need an `accessibilityLabel` partner

A leading "★" character in a saved-filter chip is visually clear but a
screen reader will read it as "black star" (or worse). The chip's
`accessibilityLabel` now carries the meaning explicitly — "Apply 'X'
filter (default on launch)" — and the glyph stays purely visual. Rule
of thumb for the codebase: if a glyph denotes state, the
`accessibilityLabel` on the surrounding pressable must spell that state
out in words. Don't rely on the screen reader announcing the glyph.

## 2026-05-23 — Announce-on-transition, not announce-on-every-render

For derived UI state that appears as a result of upstream filtering
(vs. a setState call you control), the iOS
`AccessibilityInfo.announceForAccessibility` pattern needs an
edge-detector — otherwise it re-speaks on every render while the
condition stays true.

Recipe (used for the Map empty-state card in `MapScreen`):

```ts
const showX = derivedCondition;
const prevRef = useRef(false);
useEffect(() => {
  if (showX && !prevRef.current) {
    AccessibilityInfo.announceForAccessibility('…');
  }
  prevRef.current = showX;
}, [showX]);
```

The ref+useEffect pair makes the announce fire exactly once per
false→true transition. Combine with `accessibilityLiveRegion="polite"`
on the rendered View so Android picks it up via the live region while
iOS gets the one-shot announce.

## 2026-05-23 — Jest must ignore `.claude/worktrees/` or it crashes

When the orchestrator (or any process) has live worktrees under
`.claude/worktrees/`, plain `npx jest` traverses them and tries to
re-run every test file inside. The worktree node_modules have a stale
Platform.ios native-module path that throws "Invariant Violation:
requireNativeModule", so 20+ suites fail with confusing native-module
errors while the real tests pass cleanly.

Two fixes:

- **Quick:** `npx jest --testPathIgnorePatterns='/.claude/'` for
  one-off runs.
- **Durable (TODO):** add `'/.claude/'` to `testPathIgnorePatterns` in
  `jest.config.js`. Until that lands, `npm test` may be noisy in
  worktree-active sessions.

## 2026-05-23 — Cross-platform Share with three-tier web fallback

For "share a thing" from a modal/screen, the cleanest cross-platform
pattern (used in `FlagDetailModal.handleShare`):

```ts
if (Platform.OS === 'web') {
  if (navigator?.share) await navigator.share({title, text, url});
  else if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    Alert.alert('Link copied', '…');
  } else Alert.alert('Share', text);  // last-resort: show the text
} else {
  await Share.share({ message, title, url });  // RN built-in
}
```

The three-tier web fallback covers Firefox desktop (no `navigator.share`)
and very old browsers (no `navigator.clipboard`). User-cancel on the
share sheet throws — match `/cancel|dismiss/i` in the catch and return
silently, otherwise the user sees a "Couldn't share" alert every time
they back out.

## 2026-05-23 — Dual-write pattern for additive server features

When adding a server-backed enhancement to an existing user-facing flow
(here: the mailto: feedback path got a Supabase-table companion), don't
gate the existing flow on the new one. Fire both in parallel and let the
old path remain the authoritative delivery:

```ts
// kick off the new path — best-effort, fire-and-forget for UI
const insertPromise = submitFeedback({…});

// run the existing path with the user-visible result
const result = await sendFeedback({…});

// log the new path's outcome but don't surface failure to the user
insertPromise.then((r) => {
  if (r.status === 'skipped') {
    console.warn('[feedback] server insert skipped:', r.reason);
  }
});
```

Why it matters:
- Until Sky applies the new table's migration, the insert returns
  `{status:'skipped'}`. User sees nothing — mailto still works.
- After the migration runs, server-side tracking lights up with zero
  client change.
- A transient network blip on the new path can't break the flow.

`submitFeedback` and `listFeedbackByUser` both wrap supabase calls in
try/catch and return discriminated unions (`'skipped'` / `[]`) rather
than throwing. The UI never has to handle "table doesn't exist" — it
treats every failure as "no data yet."

## 2026-05-23 — Jest mock factory variables must start with `mock`

When mocking a module with `jest.mock('foo', () => ({ bar: someVar }))`,
the `someVar` MUST be named starting with `mock` (case-insensitive)
— `mockBar`, `MockBar`. A name like `barMock` fails with:

```
ReferenceError: The module factory of `jest.mock()` is not allowed to
reference any out-of-scope variables. Invalid variable access: barMock
```

This is because jest hoists `jest.mock()` calls to the top of the file
(before imports), so any referenced variables would be `undefined` at
mock-eval time. The `mock` prefix is whitelisted as a precaution that
the variable will be lazily required.

Same applies to test helper functions, not just jest.fn() returns. If
you see this error, just rename `fooMock` → `mockFoo`.

## 2026-05-23 — Propose-only migrations under `supabase/migrations/`

For DB changes per Constitution Art. 5.3, the pattern is: agent writes
the migration FILE, never applies it to the live DB. The file must:

1. Be idempotent — `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`
   before re-creating, DO block for `CREATE TYPE` since that has no
   IF NOT EXISTS form.
2. Have a "HOW TO APPLY" header block (Sky pastes into Supabase
   dashboard SQL editor), a cost estimate, post-apply verification
   steps, and an inline rollback.
3. Be paired with client-side code that gracefully degrades when the
   migration hasn't run (the dual-write pattern above is one form).

The client types in `src/types/database.ts` get updated in the SAME
commit so TypeScript queries compile against the future schema. The
postgrest layer is the only thing that knows the table doesn't exist
yet, and it surfaces it as an error the client code already handles.

## 2026-05-23 — Brand the default React Navigation header in `screenOptions`

Pasting the brand color into `Tab.Navigator.screenOptions` (not on each
`Tab.Screen`) turns the entire app's header from a cheap white strip
into a single branded surface in one place:

```ts
<Tab.Navigator
  screenOptions={{
    headerStyle: { backgroundColor: color.brand, borderBottomWidth: 0,
                   ...shadow.e2 },
    headerTitleStyle: { color: color.textOnBrand, fontWeight: 'bold' },
    headerTintColor: color.textOnBrand,
    headerRight: renderHeaderRight,
  }}
>
```

`headerRight` accepts a function-as-prop and can capture parent state via
closure — exactly how the global Feedback button opens a root-level modal
(see next entry).

## 2026-05-23 — Root-level modal hoisted out of the navigator

When a modal needs to be opened from *any* screen's header (Feedback,
in our case), hoist its state to `RootNavigator` and render the modal as
a sibling of `Tab.Navigator` inside the shared provider tree
(`FlagsProvider` in our case):

```tsx
export default function RootNavigator() {
  const [open, setOpen] = useState(false);
  const headerRight = () => <Pressable onPress={() => setOpen(true)} />;
  return (
    <NavigationContainer>
      <FlagsProvider>
        <Tab.Navigator screenOptions={{ headerRight }}>…</Tab.Navigator>
        <FooModal visible={open} onClose={() => setOpen(false)} />
      </FlagsProvider>
    </NavigationContainer>
  );
}
```

The `headerRight` closure sees `setOpen` even though it renders inside a
deeper Tab.Screen. The modal floats above all tab content because RN
`<Modal>` is a top-layer presentation.

## 2026-05-23 — Cross-platform `mailto:` with a three-tier fallback

For a zero-backend feedback flow, `mailto:` works on iOS / Android /
modern web — but only if the OS has a mail client configured. The safe
shape (see `src/lib/feedback.ts` → `sendFeedback`):

1. Build the mailto URL with `encodeURIComponent` on body + subject, cap
   the body at ~1800 chars (Outlook / older clients silently truncate
   longer URLs).
2. On native: `Linking.canOpenURL` first; if false, return
   `{status: 'unavailable'}` so the caller can show the address.
3. On web: skip `canOpenURL` (Safari sometimes returns false even when
   the browser would handle it). Just `openURL` and catch.
4. Caller surfaces `unavailable` with an inline copy of the address.

Result: the user always either lands in their mail composer with
prefilled content, OR sees the address spelled out so they can copy it.
No silent failures, no "did anything happen?" moments.

## 2026-05-23 — Realtime merge logic belongs in a pure helper

`FlagsProvider`'s Supabase realtime effect stays a thin adapter: it
converts the channel payload to a typed shape and calls
`mergeFlagRealtimePayload(prev, evt, statusesRef.current)`. The helper
is exported from `src/lib/flagsRealtime.ts` and unit-tested in
`__tests__/flagsRealtime.test.ts` — no channel mocking, no React Testing
Library, no `act()` wrappers. Each new event type or filter edge case
becomes a one-line `it(...)` against a pure function.

Two payload subtleties this codified:
- DELETE events arrive with `new = {}`; identify the row by `old.id`.
- UPDATE events that move a row's status *out of* the active filter
  must remove it client-side (the server doesn't know what's in the
  local list). Same in reverse: an UPDATE that moves a row *into* the
  filter from outside has to be inserted, not just patched.

The pattern (channel → typed payload → pure merge → setState) is the
recommended shape for any future realtime table subscription in
`flagsStore.tsx` / new providers.

## 2026-05-23 — Cross-platform "announce" for newly-appearing UI

For a banner/notice that appears in response to async state, pair two
accessibility cues so both iOS and Android narrate it without extra work:

- `accessibilityLiveRegion="polite"` on the rendered View/Pressable
  (Android — narrates content changes inside this region).
- `AccessibilityInfo.announceForAccessibility(message)` in the same setState
  block that flips the state (iOS — pushes a one-shot announcement).

Used together in `MapScreen.refreshFlags()` for the flag-load error banner.

## 2026-05-23 — Status banners: color + icon + text (never color alone)

Recipe for accessible status/error banners that fits the existing style:

- Background carries the severity color (red for error, neutral white for info).
- Plus a glyph (⚠ for error, ⓘ would work for info) — gives a non-color cue.
- Plus explicit text that names the state — "Couldn't load flags." not "Error".
- `minHeight: 44` so the tap target meets the 44pt minimum.
- `numberOfLines={2}` on the message text so long messages don't blow up the
  overlay layout.

See `styles.errorBanner` in `MapScreen.tsx` for the canonical example.

## 2026-05-23 — Per-user AsyncStorage with versioned namespace keys

For client-side per-user state (watch lists, preferences) that doesn't need
to live on the server, key AsyncStorage per user with a versioned prefix:

```
const KEY = `@accessmap/watched_flags_v1:${userId}`;
```

Two-key style: separate keys per user_id so sign-out + sign-in as a different
account on the same device exposes neither user's data to the other.
Versioned prefix (_v1) means a future schema change can bump to _v2 and
fall back to empty (the v1 key just looks like a cache miss for v2 readers).
Defensive parse: always validate the JSON before using it — reject non-array
values, filter out non-string entries, return [] on any parse failure.

See `src/lib/watchedFlags.ts` for the full pattern including MAX cap + FIFO
overflow drop.

## 2026-05-23 — Nested Modal sibling pattern for list → detail flows

When a list modal taps through to a detail modal (e.g. MyReportsModal →
FlagDetailModal), do NOT nest the detail modal inside the list modal.
Nested transparent Modals are platform-flaky on Android — they can appear
behind the outer modal or fail to animate correctly.

Instead, lift both modals as siblings inside the parent screen:

```tsx
// ProfileScreen return:
<>
  <ScrollView>...</ScrollView>
  <MyReportsModal visible={reportsOpen} onSelectFlag={handleReportsSelectFlag} />
  <MyWatchedModal visible={watchedOpen} onSelectFlag={handleWatchedSelectFlag} />
  <FlagDetailModal visible={selectedFlag !== null} flag={selectedFlag} ... />
</>
```

Track which modal is the "source" of a FlagDetailModal open with a
`flagDetailSource: 'reports' | 'watched' | null` state so the detail modal
close handler can reopen the right list.

## 2026-05-23 — cycleCategory: CATEGORY_CYCLE must be module-level for useCallback

When cycling through a fixed sequence of values in a useCallback, define the
sequence array at module level (outside the component function) so the callback
dep array can legitimately be empty []. An array defined inside the function
body is re-created on every render — if you include it in deps the callback
recreates too; if you omit it from deps, ESLint warns and the behavior is
subtly wrong on mutable closures.

See CATEGORY_CYCLE in `src/screens/MapScreen.tsx`.

## 2026-05-23 — TypeScript: spreading a Set with size === 1 still gives T | undefined

Even after a `prev.size === 1` guard, `[...prev][0]` has type `T | undefined`
in TypeScript strict mode because array indexing always allows undefined.
Two safe patterns:

```ts
// Option A: explicit cast with assertion comment
const item = ([...prev] as T[])[0] ?? null;

// Option B: Array.from + destructure with fallback
const [item = null] = [...prev];
```

## 2026-05-23 — useMemo for client-side sort/filter over the same state slice

When a list needs multiple sort/filter modes (sort by newest/oldest/severity,
filter by category) and the data is already loaded in state, compute the
derived list with useMemo rather than a second setState. This avoids a
re-render cycle (setX → re-render → reads sortedX) and keeps the code
path flat: one render computes the final array, FlatList receives it
directly. The source state stays clean and untouched.

Pattern used in MyReportsModal (sort by newest/oldest/severity),
NearbyFlagsModal (filter by category), and TasksScreen (mine/all toggle).

## 2026-05-23 — Absolute-positioned accent bars inside Pressable rows

A colored left-edge accent bar on a list row is a clean "status" signal
without needing extra layout children. Recipe:

```tsx
// In renderItem:
{isResolved && (
  <View style={styles.accentBar}
    accessibilityElementsHidden importantForAccessibility="no" />
)}

// Style:
accentBar: {
  position: 'absolute', left: 0, top: 0, bottom: 0,
  width: 3, backgroundColor: '#27ae60',
  borderTopLeftRadius: 2, borderBottomLeftRadius: 2,
},
```

The bar is hidden from the accessibility tree (the a11yLabel already conveys
the status). No `overflow: 'hidden'` needed on the parent row — the bar
sits at position 0 and stays within the row bounds naturally.

## 2026-05-23 — accessibilityLiveRegion="polite" for inline selection feedback

When a UI control updates a text hint in the same view (e.g. a severity
picker that shows the description of the selected level), add
`accessibilityLiveRegion="polite"` to the hint Text. This causes VoiceOver /
TalkBack to announce the new value after the user taps the control, without
interrupting any ongoing speech. Used in ReportFlagModal's severity hint.

## 2026-05-23 — Category filter chips: show only categories present in data

In NearbyFlagsModal, category filter chips are computed from the actual flag
data rather than the full CATEGORY_ORDER. This avoids showing chips for
categories with zero results, which is confusing. Pattern:

```ts
const presentCategories = useMemo<FlagCategory[]>(() => {
  const seen = new Set(flags.map((f) => f.category));
  return CATEGORY_ORDER.filter((c) => seen.has(c));
}, [flags]);
```

Chips only appear when `presentCategories.length > 1` — no point filtering
a list that already has only one category.
