# AccessMap — durable learnings

Short, dated, additive notes — patterns, gotchas, and recipes that paid off
during a build. New entries go at the top. Never delete or rewrite past
entries; the file is the project's accumulated wisdom.

---

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
