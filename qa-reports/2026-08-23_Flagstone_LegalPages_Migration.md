# Flagstone legal/support pages → skypistudio.com/flagstone/ — migration mapping

**Date:** 2026-08-23
**Branches:** `chore/scrub-personal-email-2026-08-23` (AccessMap), `feat/flagstone-legal-pages-2026-08-23` (Portfolio)
**Status:** built and locally verified, **not merged, not pushed** — Sky's call per standing merge policy.

## What this is

Two independent pieces of work, planned together:

1. **A personal-email scrub** — replaced `skylerhalisky@gmail.com` with
   `support@skypistudio.com` (Namecheap-forwards to the same inbox, confirmed
   live by Sky) everywhere it was user- or reviewer-facing.
2. **A new, additional publish location** for the four Flagstone legal/support
   pages at `skypistudio.com/flagstone/...`, served from the **Portfolio**
   repo (the only repo that actually owns that domain). **The original pages
   at `skypie99.github.io/AccessMap/...` are untouched in URL and keep
   serving** — see "Why the old URL isn't going anywhere yet" below.

## URL mapping

| Page | Old (still live) | New (this task adds) |
|---|---|---|
| Landing | `skypie99.github.io/AccessMap/` | `skypistudio.com/flagstone/` |
| Support | `skypie99.github.io/AccessMap/support.html` | `skypistudio.com/flagstone/support/` |
| Privacy | `skypie99.github.io/AccessMap/privacy/` | `skypistudio.com/flagstone/privacy/` |
| Accessibility | `skypie99.github.io/AccessMap/accessibility.html` | `skypistudio.com/flagstone/accessibility/` |
| Terms | `skypie99.github.io/AccessMap/terms.html` | `skypistudio.com/flagstone/terms/` |

**Note the original task asked for these to be *created in the AccessMap
GitHub repo*.** That wouldn't have worked — `skypistudio.com` is served by a
completely different repo (`~/Portfolio`, GitHub Pages via Next.js static
export); a `/flagstone/` folder inside AccessMap's own `docs/` would only ever
be reachable at `skypie99.github.io/AccessMap/flagstone/`, never at
`skypistudio.com`. The new pages live in `~/Portfolio/public/flagstone/`
instead, as framework-free static HTML (matching how these pages already
work — own CSS/JS, no React) rather than restyled into the portfolio's own
Next.js design system.

## Why the old URL isn't going anywhere yet

`app.json`'s `privacyPolicyUrl` and `src/lib/links.ts`'s `PRIVACY_POLICY_URL`
both hardcode `https://skypie99.github.io/AccessMap/privacy/` verbatim
(guard-tested to match each other), with a code comment citing Apple
5.1.1(i) — this is the exact URL App Store Connect has on file. Moving it
without updating App Store Connect in lockstep would put the app out of
compliance. **This task did not touch either constant, the guard test, or
App Store Connect.** The new `skypistudio.com/flagstone/` pages are an
*additional*, independent copy for now.

### Cutover checklist (a later, separate, Sky-gated step — not done here)

1. Let the new pages sit live for a while and confirm they're stable.
2. Update `app.json:5` (`privacyPolicyUrl`) and `src/lib/links.ts`
   (`PRIVACY_POLICY_URL`) to the new URL, together (the guard test
   `appConfig.guard.test.ts` enforces they match each other, not a specific
   value, so this is safe to do in one commit).
3. Add a hand-written meta-refresh stub at each of the four old paths in
   `docs/`, pointing at the matching new URL — the same technique already
   proven for `/work/accessmap/` → `/work/flagstone/` in the earlier
   Portfolio site rename. **Do this, don't delete/replace the old pages'
   content outright** — a dead or redirect-only page at a URL Apple is
   actively checking is riskier than a page that's merely superseded.
4. Update the Privacy Policy URL and Support URL fields in App Store Connect
   → App Information to the new addresses.
5. Only after (2)–(4) land together does the old URL stop being the
   canonical one Apple checks.

## Email occurrences — what changed and what didn't

Personal Gmail → `support@skypistudio.com`, done in this task:

| File | What |
|---|---|
| `docs/support.html` | 3 mailto links (bug report, delete-account FAQ, contact card) |
| `docs/terms.html` | 1 mailto link (Contact section) |
| `docs/accessibility.html` | 1 mailto link (feedback contact card) |
| `docs/privacy/index.html` | 3 mailto links (data export, children/minors, Contact section) |
| `src/lib/feedback.ts` | `FEEDBACK_EMAIL` constant — drives the in-app "Send Feedback" flow and the report-submit-failure fallback message (`ReportContentModal.tsx`) |
| `src/lib/geocode.ts` | Nominatim `USER_AGENT` contact string (policy requirement, functionally inert which address is used) |
| `src/lib/copy.ts` + both ratified docs | In-app Terms/Privacy screens, shown live in the shipped app — see below |
| `src/lib/__tests__/feedback.test.ts`, `src/components/__tests__/ReportContentModal.test.tsx` | Test assertions updated to match (the latter now imports `FEEDBACK_EMAIL` instead of a hardcoded literal, so it can't drift again) |

**In-app legal text (`src/lib/copy.ts`)** — this one's different from the
rest: it's guard-tested byte-for-byte against two Sky-ratified source
documents (`design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` and
`15_PRIVACY_POLICY_v1.md`) via `terms.guard.test.ts` / `privacy.guard.test.ts`.
The prior Flagstone rename deliberately skipped this exact file for that
reason — renaming ratified legal text is a ratification act. Sky explicitly
confirmed this file should be included this time, so both ratified `.md`
docs were updated in the same change as `copy.ts`, keeping them in sync;
both guard tests pass with the new address.

**Explicitly not touched, with reasons:**
- `eas.json` / `RELEASING.md` `appleId` — Sky's actual Apple ID login for
  EAS submit, not a display contact. Changing it breaks submit auth.
- `CLAUDE.md`'s `**Owner:**` line, `LEARNINGS.md`'s historical note, and
  other internal docs/qa-reports — internal documentation, not a user- or
  reviewer-facing surface. A full internal-docs sweep is a different, larger
  job than what was asked here.

## Verification performed

- `npm run typecheck && npx jest --ci -w 3` on the AccessMap branch — full
  suite green, including both legal-text guard tests, after fixing one
  stale hardcoded-literal test (`ReportContentModal.test.tsx`) that the
  first run correctly caught.
- All four new Portfolio pages checked in-browser (both directions of
  internal nav, all five toggles in the enhanced accessibility panel,
  every `mailto:` link) after being served locally.
- Old AccessMap `docs/` pages confirmed unchanged in URL — only their
  content (the email address) changed, so Apple's pinned privacy URL still
  resolves exactly as before.

## Accessibility panel — what changed

Requirement was to make the *existing* `#a11y-mount` panel (text size /
dark / high-contrast / reading / motion — already built, in
`assets/a11y.js` + `assets/site.css`) more prominent, not to build a new
one. Changed in the copied `assets/site.css`, keeping the file's existing
var-only colour architecture intact (no hardcoded hex):
- Border: `2px solid var(--border)` → `4px solid var(--heading)` — `--heading`
  is the strongest-contrast ink token in every theme, so this reads as a dark
  frame in light mode and a bright one in dark mode, rather than fighting
  the very dark-mode/high-contrast toggles the panel controls.
- `.a11y-body` padding: `1.25rem` → `1.75rem`.
- Summary label: `1rem`/700 weight → `1.125rem`/800 weight.
- Position was already correct (right below the header, above `<main>`,
  every page) — no change needed.
- Left the panel collapsed-by-default rather than forcing it open — flagged
  as a UX call in the plan rather than decided unilaterally; the styling
  changes above make the closed state itself hard to miss.
- Did **not** add a font-family toggle (one of the task's "consider adding"
  suggestions) — the CSS's own comment documents that no webfont is loaded
  deliberately, since an external font request would be a tracking vector on
  a site whose whole pitch is "no trackers." Adding one would contradict an
  existing, documented decision.
