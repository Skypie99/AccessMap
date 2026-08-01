# AccessMap — Pre-Ship UI Polish Report — 2026-08-01

**Branch:** `ui-polish/accessmap-preship-2026-08-01` (12 commits, 52 files, +899/−309)
**Base:** `sec/phase-b-hardening-2026-07-31` @ `354584c` — so this branch contains **all** the recent bug-fix work: main `9964f8f` (the merged a11y-QA train, photo-privacy fix, ship-ready cars, r2 stack) **plus** the still-unmerged 11-commit security hardening. One fast-forward merge by you ships everything together. `main` untouched.
**Working docs:** `design-reviews/ui-polish/2026-08-01/` (UI_PLAN.md — the audit; UI_SYSTEM.md — the recipes).

---

## DECISIONS FOR SKY

1. **Scope call: "portfolio" → AccessMap.** The prompt's goal line said "portfolio," but every operational detail (this branch name, the AccessMap QA floor, Expo/RN, the map, EAS/TestFlight, this report's name) is AccessMap. I treated "portfolio" as template residue. If you meant the Portfolio site, say so and this pass re-runs there — nothing here touched Portfolio.
2. **Two new visible strings on the Map** (the only new user-facing copy): the true-zero empty card — *"No barriers reported here yet"* / *"Be the first — tap Report to drop a pin on an accessibility barrier you know about."* Previously an unfiltered empty area showed just "Showing 0 flags" over blank tiles. Reword or strike at will; the card is one self-contained block in `MapScreen.tsx`.
3. **AdminScreen error handling changed shape** (BP-9): list-load failure now shows the sibling-standard inline red banner + **Retry** (one new string, reusing the estate's existing word) instead of a dismiss-and-gone `Alert` (which is also a silent no-op on web). Moderation-action Alerts unchanged. Revert is one commit if you prefer the old behavior.
4. **Four sub-point value normalizations** (intentional, visually near-invisible, disclosed): StatusBadge internal gap 5→4 · drawer sign-in row and SignIn CTA `paddingVertical` 15→16 (both masked by minHeight) · SignIn divider tracking 0.5→0.4. Also SignIn's CTA gradient now rides `gradient.brand` (was a third bespoke ramp) and its 0.55 glow → the tokenized 0.30 `shadow.glowBrand` — the front door now matches every other CTA.
5. **Deliberately NOT done, needs your eye:** Profile hero eyebrow tracking is 2.4 (2× the new `eyebrow` token) — its comment calls it deliberate, so it stays until you rule; the pinned-light map patchwork in dark mode (legend/locating banner/place chips — documented AA-by-construction; re-theming needs live-tile arbiter runs); heat-disclaimer glass redesign (same reason); focused-pin positive emphasis + cluster-size parity + quick-cycle visible labels (device-verification territory); PhotoGallery/PhotoLightbox lightbox consolidation (two parallel viewers — refactor, wrong risk pre-ship); `@expo/vector-icons` is an unused dependency (removal = dep change, yours); ui/Button + ui/Card adopt-or-remove (your standing item — Card also has 0 usages).
6. **On-device verification is yours, as ever:** everything here is proven by typecheck/jest/guards/arbiter + Chromium web preview (light+dark screenshots taken, zero console errors). VoiceOver/TalkBack feel, Dynamic Type at AX sizes, native blur, the native callout CTA pill, and 60fps scroll need your device pass — the existing `DEVICE-SCRIPT.md` covers it; add: map callout (severity bar + filled CTA), one modal open/close for the pressed-state feel, one pull-to-refresh (brand tint), the drawer/header haptic tick.

---

## BEFORE → AFTER, screen by screen

**Every list modal (My Reports, Watched, Activity, Saved Places, Filter Presets, Hidden Comments, My Feedback)**
Before: bootstrap = a bare platform-grey spinner (two with no text at all); pull-to-refresh spinner grey; ✕/Refresh circles, retries, and form buttons gave zero press feedback; empty states were a mix of title-only text, `label`-weight titles, and one emoji; bottom padding hardcoded.
After: content-shaped Skeleton rows/cards pulse in (reduced-motion-aware, SR story preserved via labeled polite regions); every RefreshControl tints brand on iOS **and** Android; every control answers the finger with its family's pressed token (neutral wash → `borderPressed`, brand fill → `ctaFillPressed`, error fill → `errorPressed`, ghost → opacity); empty states share one grammar — 32pt Lucide icon + heading + body; sheets clear the home indicator via real insets.

**Sign in**
Before: the only full-screen surface with zero safe-area handling; its own bespoke brand gradient; the heaviest shadow in the app (0.55); off-grid padding.
After: insets respected top and bottom; the CTA rides `gradient.brand` + `shadow.glowBrand` like every other primary action; tracking/padding tokenized. The dark hero look is unchanged — its arbitrated inks were already right.

**Profile**
Before: status-breakdown pills rendered **light-mode colors in dark mode** (the light-only `STATUS_COLORS` map — a real bug); auth-gate spinner grey; Sign out / Delete Account / Save name gave no press feedback; uppercase labels tracked at three different values.
After: pills read the themed `statusPalette` (light mode byte-identical; dark now correct); brand-ink spinner; pressed states on all primary actions; one `tracking.section` for section labels, `tracking.loose` on the pill caps; the Switch recipe (brand track, themed false-track) app-wide — dark tracks no longer float light-grey.

**Tasks**
Before: RefreshControl grey; load-more spinner grey; search-clear ✕ static; section tracking hand-picked.
After: brand refresh tint, `inkSelect` load-more spinner (the arbitrated ink), pressed states, token tracking. The glass benchmark itself was already the standard — untouched otherwise.

**Map (the heart)**
Before: the payoff moment didn't match across platforms — native callouts had a severity accent bar but a bare text-link CTA; web had a filled button but no bar; a genuinely-empty unfiltered area showed nothing but "Showing 0 flags"; the two save-dialogs' buttons were static.
After: **both platforms show the severity bar + a filled 44pt `ctaFill` CTA at the button radius** (verified live in the web preview); the true-zero card invites the first report in the same material as its filtered sibling; dialog buttons join the press vocabulary. The privacy gate, pin snapshot law, blur budget, pinned-light zones: untouched by construction.

**Onboarding / first run**
Before: hand-rolled 0.55/0.45 glows, a token-duplicating gold literal, hardcoded CTA-row padding.
After: tokenized glow, `goldAccent`, inset-aware CTA row. (Verified rendering in preview — it's the first thing a tester sees.)

**Admin** — inline error banner + Retry (see decision 3), brand spinners already correct.
**Drawer + headers** — the tab bar always ticked on press; now the drawer items and the header menu/Feedback cluster give the same `hapticSelection`. Drawer ✕ joins the pressed vocabulary.
**Help / About / Terms / Privacy / Resources / How-to-help / Changelog / Legend / Status history / Report-content / Feedback** — pressed ✕s, inset-aware bottoms, tracking tokens, FAQ-search and history empty states get their icons. **Zero copy changes on the fenced surfaces.**
**Photo lightboxes (both)** — page counter and caption bar derive from real insets instead of 48/34pt guesses.

## The system after this pass (Dani's ledger)

New tokens (all *naming existing practice*, never inventing): `bulkGlassShadow()` (was 16 hand-copies) · `font.lineHeight` completed (sm/md/xl/xxl ×1.4; h2/h1/display ×1.25) · `font.tracking.eyebrow` 1.2 + `font.tracking.section` 0.8 (the two uppercase practices; `loose` 0.4 stays for pill caps) · `icon.inline` 18 / `icon.stroke` 2.2 (the de-facto Lucide standard, 108 sites) · barrel now exports all primitives. `statusPalette()` exported from StatusBadge as the one themed status-color source; `STATUS_COLORS` annotated light-only legacy. DESIGN.md carries the decision-log entry; UI_SYSTEM.md carries the recipes every commit followed.

## Dark-mode parity notes

One real bug fixed (Profile/MyReports status colors). The MyReports active-chip dark treatment follows the severity-ink rule: dark `fg` tokens are light fills, so the active label flips to ink — measured 7.1–10.8:1 across all four statuses (was ~2.2:1 white-on-pastel before the fix). Switch false-tracks now themed. Everything else introduced uses mode-independent tokens (`ctaFill`/`ctaFillPressed`/`errorPressed`) or pairs proven in both palettes; the 122/122 palette key parity is compile-enforced and unchanged.

## QA floor — preserved, and how I know

- **Gates at branch tip:** `npm run typecheck` **0 errors** · `npm run lint` **0 errors / 80 warnings — exact baseline** · `npx jest --ci -w 3` **200 suites / 2923 passed / 0 failed (84 todo) — identical to baseline**.
- The 7 a11y source-scanning guards (focus-on-open, accessible-parent-trap, keyboard-avoidance, brand-ink AA, announce-coverage, label-in-name, toggle-state-web, decorative-hiding), the honesty fences (copy/terms/privacy/blockedTerms/hiddenComments), and all 15 arbiter contrast proof sets ride inside that suite — green means the floor held, mechanically.
- No a11y prop was changed or dropped anywhere in the diff (adversarially verified hunk-by-hunk); additions only (loading-container labels, one Retry control label).
- Reduced motion: the only animation this pass touched is the Skeleton pulse, which is RM-gated in the primitive. No new Animated code, no layout-prop animation, no new BlurViews, virtualization untouched, `GlassSurface.tsx` at 0 changed lines, seam files (`src/lib/copy.ts`, `docs/privacy/**`) untouched.
- Dynamic Type: all text flows through AppText variants; no new `numberOfLines`, no pinned text-container heights.
- Perf: pressed-state style functions and inset reads are render-path constants; skeletons replace spinners one-for-one inside existing conditionals; no new mount-time timers; map marker snapshot law untouched.
- Privacy: no new collection/logging/transmission of anything; the location-gate call sites are byte-identical.
- Visual re-verify (Chromium proxy, honestly tagged): light + dark walked on Home/Map/onboarding, zero console errors, callout parity confirmed on screen. **Safari/WebKit and native feel remain your device pass.**

## What the second sweep caught (and fixed)

Two fresh-eyes agents reviewed the complete diff plus the whole estate: 17 missed press-vocabulary sites (incl. the drawer's own ✕ and the shared LiveStatusRegion Retry), 4 placeholder-token swaps the plan had claimed but a batch edit never executed, 7 more tracking drifts, 3 iconless empty states, 2 hardcoded safe-area guesses in the lightboxes/onboarding, a load-more spinner, the `errorPressed` convergence for all 7 error-filled Retry buttons (the token's documented purpose), and a Sheet style-order nit that would have broken a documented override for future callers. Two of my own recipe rules were correctly refused by measurement (contrast) and replaced with the codebase's own family precedents. All applied; a third clean pass found the categories empty.

## Ready to build — how to review

```bash
git -C ~/AccessMap log --oneline 354584c..ui-polish/accessmap-preship-2026-08-01
```
```bash
git -C ~/AccessMap diff main..ui-polish/accessmap-preship-2026-08-01 --stat
```
The diff vs `main` includes the security train (by design — this branch ships together with it). To see the polish alone: `git diff 354584c..ui-polish/accessmap-preship-2026-08-01`.

**Migrations: none.** No data-layer, auth, RLS, or config change of any kind.

**Merge (yours):**
```bash
git -C ~/AccessMap merge --ff-only ui-polish/accessmap-preship-2026-08-01
```
(Fast-forwards over the security train + polish in one move; `git branch` anchors remain for rollback — pre-train main is `9964f8f`, pre-polish is `354584c`.)

**Fresh EAS build checklist (all Sky):**
1. `npx eas-cli build --platform ios --profile testflight` (and the Android profile when ready) — reminder: the local-sim fmt/Xcode-26 fix is NOT on this branch (it's on `fix/fmt-xcode26-local-sim-2026-07-25`, your merge-or-hold call); EAS builds are unaffected.
2. Real-device pass, both platforms, per `design-reviews/a11y-qa/2026-07-31/DEVICE-SCRIPT.md`, plus this pass's additions: map callout both modes · one list modal's skeleton→content load · pull-to-refresh tint · pressed feel on ✕/Save/Retry · drawer + header haptic tick · lightbox counter/caption clear of the home indicator · SignIn top/bottom insets on a notched phone.
3. VoiceOver + TalkBack walk (the script's rows; nothing in this pass rewired semantics — verify the skeleton loading announces, which replaced visible captions with labeled live regions).
4. Dynamic Type at AX5 incl. the deferred D-B6 row (Help/About ✕) — still open from the a11y train.
5. The standing pre-submission items outside this pass: B-6 reviewer creds, SR-021 first-binary proof, S-1 credential rotation, privacy-policy hosting state.

**STOP state:** second sweep clean · gates green at tip · branch linear and reviewable · nothing merged · no external side effects taken.
