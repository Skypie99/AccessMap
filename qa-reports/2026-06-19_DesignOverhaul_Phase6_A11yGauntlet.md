# AccessMap Overhaul — Phase 6: Accessibility Completion + Gauntlet

**Date:** 2026-06-19
**Branch:** `overhaul/phase6-a11y-gauntlet` (off merged `main` `4b56f40`)
**Scope:** ACCESSIBILITY / a11y tokens / WCAG. Zero data/auth/fence changes.
**Merge:** Sky-only. Code wave = 3 commits. The gauntlet *verification* is Sky's device pass.

---

## Shipped (3 commits) — the code-level a11y completion

| Commit | Change | WCAG | Gate |
|---|---|---|---|
| `f31b4c1` | **Reduced-motion modal sweep — all 18 modals.** Every modal that still hard-coded `animationType="slide"/"fade"` now gates behind `useReducedMotion()` (snaps to rest under Reduce Motion). **Zero ungated `animationType` literals remain in the app.** (15 done via a 5-agent parallel sweep, 3 multi-modal files by hand.) | 2.3.3 | typecheck + lint + 1721 tests |
| `92c8942` | **textSubtle tertiary tone → AA at any size.** Darkened the token (#999→#707070 light, #777→#8a8a8a dark) so all ~30 small-text uses (dates, counts, hints) clear AA at once, while staying the faintest tier. **Every text token in the app now meets AA.** | 1.4.3 | typecheck + theme suite 22/22 |
| `5957b81` | **Web keyboard focus ring.** Brand `:focus-visible` outline in the web shell — keyboard/AT users get a visible focus indicator on the demo (never shows on mouse). | 2.4.7 | static CSS |

## 🔒 Fence proof
Touched: 18 modal files (animationType only), `theme.ts`/`ThemeContext.tsx` (one token each), `DESIGN.md` + a test, `public/index.html`. Zero data/auth/EXIF/RLS/RPC changes.

## Already in place (verified earlier — no work needed)
- `allowFontScaling=false` appears **zero** times → **Dynamic Type scales freely** everywhere (1.4.4).
- Severity/status are **never color-alone** (number + word + icon).
- Status changes + the report success are **announced to screen readers** (4.1.3) via `AccessibilityInfo.announceForAccessibility` + polite live regions (Phases 3–4).
- The `Button`/`Card` primitives draw focus rings; `Input` errors are polite live regions.

## Remaining a11y — the GAUNTLET (this is the device pass; needs your TestFlight build)
These are best done *with* VoiceOver/TalkBack in hand rather than coded blind:
- **Modal focus-move** (2.4.3) — move SR focus to each modal's title on open (`setAccessibilityFocus`). It's a per-modal ref+wire across ~18 modals; recommend doing it as a focused follow-up once the device pass shows which modals most need it (containment via `accessibilityViewIsModal` is already present on the key ones).
- **Tasks tab badge count** — confirm it's announced.
- **The full gauntlet:** every screen × every state (empty/loading/error/offline) × phone sizes × **both themes** × **max Dynamic Type** (a top cause of overflow) — verified on device.

## ⭐ ONE-BUILD DEVICE CHECKLIST (you pay per build — verify the whole 6-phase overhaul in this pass)
**Dark mode** (Settings → Display → Dark):
- [ ] Cards **lift** off their wash (Tasks, Profile, modals) — Phase 2; tune the `shadowTint` glow if it's too strong/subtle.
- [ ] No white flash on the web cold open before the dark map — Phase 1.
- [ ] Tertiary text (dates/counts/hints) is **legible**, not too dark — Phase 6 textSubtle.
**Report-a-flag** (Phase 3):
- [ ] The "Location is removed from your photos automatically" line shows under Photo — **sign off the copy**.
- [ ] After submitting with a photo, VoiceOver announces "Report filed. Location data was removed…".
**Verify/resolve reward** (Phases 4–5):
- [ ] Triage buttons **scale + haptic** on press; the "+N points" pill **slides in** and shows the right number (10/3/15/7).
**Reduce Motion** (Settings → Accessibility → Motion → on) (Phase 6):
- [ ] Open several modals → they **snap** (no slide/fade); the reward pill + loading dots don't animate.
**VoiceOver / TalkBack** (Phase 6 gauntlet):
- [ ] Tab every screen; labels/roles/states read correctly; modals trap focus; severity reads "Severity N, <word>".
**Max Dynamic Type** (Settings → Accessibility → larger text, max):
- [ ] No clipped/overlapping text on dense screens (Tasks cards, Report form, Profile).
**ResourcesScreen:** drop in the real URLs (`TODO(Sky)`).

## Review / merge / rollback
- **Review:** `git diff main..overhaul/phase6-a11y-gauntlet`.
- **Merge:** Sky-only / Rory under your grant. Full `npm test` first.
- **Rollback:** per-commit revert; a11y tokens + modal props only — fully reversible.
