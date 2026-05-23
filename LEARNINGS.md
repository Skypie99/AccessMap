# AccessMap — durable learnings

Short, dated, additive notes — patterns, gotchas, and recipes that paid off
during a build. New entries go at the top. Never delete or rewrite past
entries; the file is the project's accumulated wisdom.

---

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
