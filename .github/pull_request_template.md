## What changed

<!-- One paragraph: what problem does this PR solve and how? -->

## Test coverage

- [ ] New logic has unit tests (`src/lib/__tests__/`)
- [ ] `npm run typecheck` passes locally
- [ ] `npm run test:ci` passes locally (coverage ≥80%)
- [ ] Existing tests unaffected (no regressions in `npm test`)

## Accessibility (a11y)

- [ ] New UI elements have `accessibilityLabel` / `accessibilityRole`
- [ ] Color contrast ≥4.5:1 for text (≥3:1 for large text / icons)
- [ ] Interactive targets ≥44×44 pt
- [ ] Screen-reader flow tested on iOS simulator (VoiceOver)
- [ ] Lighthouse a11y score ≥90 (CI enforces this for web build)

_Not applicable (no UI change):_ <!-- check if this PR touches no screens/components -->

## Security review

- [ ] No secrets, API keys, or credentials in this diff
- [ ] No new RLS bypass or `security definer` function without Steve sign-off
- [ ] User input is validated / parameterized (no SQL injection vectors)
- [ ] Photo upload path follows `<uid>/<timestamp>.<ext>` scheme

_Not applicable (no auth / data / storage change):_ <!-- check if applies -->

## Jordan privacy gate

> Required for: location data, disability/flag data, user identity, auth flows, photo uploads, or new analytics.

- [ ] Change reviewed by Jordan (link Jordan's comment or qa-report below)
- [ ] No new PII fields added to Supabase without RLS policy
- [ ] No location data logged, cached, or returned beyond what's needed

_Not applicable (no privacy-sensitive change):_ <!-- check if applies -->

## Performance

- [ ] No new synchronous blocking on the JS thread
- [ ] Images use `<Image>` with explicit dimensions (no layout shift)
- [ ] No new N+1 Supabase queries in list views
- [ ] Bundle size budget: web build ≤ 2 MB gzipped (CI checks this)

## Deployment notes

<!-- Steps after merge: SQL migrations, env vars, feature flags. If none, write "None." -->

## Screenshots / recordings

<!-- For UI changes, paste before/after screenshots or a short screen recording. -->
