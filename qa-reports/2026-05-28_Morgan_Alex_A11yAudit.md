# ACCESSIBILITY COMPREHENSIVE AUDIT — AccessMap

**Delegated to:** Alex (Accessibility & Inclusive Design)  
**Authority:** Morgan autonomous deployment (safe + scoped)  
**Timeline:** 60 min  
**Scope:** Phase 1 a11y gate — WCAG 2.1 AA compliance + regression check

---

## THE WORK

AccessMap is built accessible from the start (users have disabilities). Pre-launch a11y audit confirms no regressions and validates core features meet WCAG 2.1 AA.

---

## EXECUTION SCOPE

1. **Core screens WCAG 2.1 AA check:**
   - **SignInScreen:** label contrast, button targets (48px min), form field labels (persistent, visible)
   - **MapScreen:** map interactive, marker focus visible, callout accessible (keyboard + screen reader), filter panel keyboard nav
   - **ReportFlagModal:** form semantics (fieldset/legend for category, severity), photo capture button accessible, submit button clear + keyboard triggered
   - **TasksScreen:** list semantics (role="list"), card focus indicators (4px min), status badge semantics, flash banner (announce on action)
   - **ProfileScreen:** point count announced, stat labels linked to numbers

2. **Dark mode a11y:**
   - Verify contrast ratios in dark theme (white text on dark bg, etc.)
   - Any color-only information (red = severity)? Add text/icon alternatives.

3. **Photo/media a11y:**
   - Lightbox modal: keyboard close (Esc), focus trap, alt text on images
   - Thumbnails: screen reader announced ("Photo from <flagname>")

4. **Realtime/animations:**
   - Respect prefers-reduced-motion (disable flag animations for users)
   - Announce flag updates to screen readers? (optional, but nice)

5. **Cross-device a11y:**
   - Test on iOS VoiceOver (main app target)
   - Test on Android TalkBack (secondary)
   - Web (react-leaflet) — screen reader announces markers

6. **Regression check:**
   - Any new branches introduce a11y issues? (spot-check heatmap, clustering, notifications, etc.)

7. **Report:** qa-report to `~/AccessMap/qa-reports/2026-05-28_Alex_A11yAudit.md`
   - Checklist: PASS / FAIL / PARTIAL for each category + screen
   - Any **WCAG 2.1 AA violations**? (blockers for launch)
   - Regressions detected?
   - Recommendations (before launch / post-launch)
   - Confidence level: READY / NEEDS-POLISH / HOLD

---

## SCOPE NOTES

Your users have disabilities. This app exists because of that. Make sure we're honoring that trust.

---

## NEXT STEP

Audit all screens + dark mode + media + animations. Report by Friday EOD.

---

**Morgan standing by. A11y gate for launch. ✓**
