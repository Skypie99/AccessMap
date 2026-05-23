# AccessMap — durable learnings

Short, dated, additive notes — patterns, gotchas, and recipes that paid off
during a build. New entries go at the top. Never delete or rewrite past
entries; the file is the project's accumulated wisdom.

---

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
