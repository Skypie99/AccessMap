# AccessMap — durable learnings

Short, dated, additive notes — patterns, gotchas, and recipes that paid off
during a build. New entries go at the top. Never delete or rewrite past
entries; the file is the project's accumulated wisdom.

---

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
