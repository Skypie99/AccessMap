# Flagstone Prompt C Accessibility Micro-Audit 1

## Audited Source
- Repo: `~/AccessMap`
- Branch checked for source: `claude/ui-polish-fix4b-sheet-scroll-hardening-20260829`
- Audited SHA: `2762a5447600e8de55be912ccb26e95456484945`
- Audit focus areas:
  - `DESIGN.md`
  - `src/theme.ts`, `src/theme/`
  - `src/components/ui/{AppText,Button,Input,GlassSurface,Sheet,SheetPull}`
  - `src/navigation/RootNavigator.tsx`
  - `src/screens/MapScreen.tsx`
  - `src/screens/ReportFlagModal.tsx`

## Findings

- ID: `C1-A11Y-001`
  - SEVERITY: `P3`
  - CLASS: `ACTIVE REPAIR — REVALIDATE LATER`
  - FILE: `src/components/ui/Sheet.tsx`, `src/components/ui/SheetPull.tsx`
  - COMPONENT: `Sheet`, `SheetPull`
  - SOURCE EVIDENCE: `Sheet` dispatches close via `onRequestClose` / `onDismiss`, while `SheetPull` also owns a pan-to-dismiss gesture path; this is the known sheet-scroll/hardening repair surface.
  - USER IMPACT: Intermittent close-path conflict can create unstable dismissal/focus behavior for map and report surfaces.
  - SMALLEST SAFE FIX: Recheck once active repair lands and keep a single dismissal path per sheet state.
  - LIVE IOS VERIFICATION NEEDED: `YES`

- ID: `C1-A11Y-002`
  - SEVERITY: `P3`
  - CLASS: `SOURCE RISK — LIVE PROOF REQUIRED`
  - FILE: `src/navigation/RootNavigator.tsx`, `src/screens/MapScreen.tsx`, `src/screens/ReportFlagModal.tsx`
  - COMPONENT: `Report modal presentation lifecycle`
  - SOURCE EVIDENCE: modal and sheet flows are closed via state transitions (`onRequestClose` and `onDismiss`) without a recorded explicit accessibility focus target for post-dismiss restoration.
  - USER IMPACT: Screen-reader users can lose clear focus context after closing report/sheet flows.
  - SMALLEST SAFE FIX: Store the trigger ref and restore focus after successful close/dismiss.
  - LIVE IOS VERIFICATION NEEDED: `YES`

- ID: `C1-A11Y-003`
  - SEVERITY: `P2`
  - CLASS: `SOURCE RISK — LIVE PROOF REQUIRED`
  - FILE: `src/components/ui/AppText.tsx`
  - COMPONENT: `AppText`
  - SOURCE EVIDENCE: multiple variants use a capped `maxFontSizeMultiplier`; combined with fixed lineHeight and container-limited text in shared UI and report modal fields, this can still cause clipping at max settings.
  - USER IMPACT: Long labels or status text can truncate in Dynamic Type, making actions and content hard to read at larger sizes.
  - SMALLEST SAFE FIX: Runtime-check wrapped text containers at high dynamic-type settings and raise/relax clamping where real clipping is observed.
  - LIVE IOS VERIFICATION NEEDED: `YES`

- ID: `C1-A11Y-004`
  - SEVERITY: `P2`
  - CLASS: `ALREADY GOOD`
  - FILE: `src/components/ui/Button.tsx`
  - COMPONENT: `Button`
  - SOURCE EVIDENCE: minimum target sizing is derived from accessibility token (`a11y.minTargetSize`), and reduced-motion path is gated for press animation.
  - USER IMPACT: Better tapability and reduced-motion safety for core controls.
  - SMALLEST SAFE FIX: `NONE` (preserve)
  - LIVE IOS VERIFICATION NEEDED: `NO`

- ID: `C1-A11Y-005`
  - SEVERITY: `P2`
  - CLASS: `ALREADY GOOD`
  - FILE: `src/screens/ReportFlagModal.tsx`, `src/components/ui/Sheet.tsx`
  - COMPONENT: `ReportFlagModal` shell + sheet
  - SOURCE EVIDENCE: modal-level close semantics and accessibility metadata are present (`onRequestClose`, `onDismiss`, reduced-motion-aware animation, explicit labels/hints on key fields).
  - USER IMPACT: The modal shell is in a healthier a11y baseline than many legacy overlays.
  - SMALLEST SAFE FIX: `NONE` (preserve)
  - LIVE IOS VERIFICATION NEEDED: `NO`

## Must Verify Live
- `C1-A11Y-001` (Sheet/SheetPull dismissal contract)
- `C1-A11Y-002` (post-dismiss focus restoration on report surfaces)
- `C1-A11Y-003` (long-label clipping under high Dynamic Type)

## Already Good — Preserve
- `C1-A11Y-004` (Button tap-target + reduced-motion safety)
- `C1-A11Y-005` (Report flag shell/modal semantics)
- App text role semantics (`header` role mapping) and tokenized accessibility sizing are a good baseline for shared text controls.
- `Input` and `Button` are both built on accessibility-oriented min target sizing and explicit error/assistive messaging patterns.

## Do Not Waste Time On
- Known SheetPull/scroll-to-dismiss bug family is already under active repair and should be validated in that repair pass, not re-diagnosed here.

## Handoff To Final Accessibility Synthesis

MICRO AUDIT:
C1 — SHARED UI / NAV / MAP / REPORT

MUST IMPLEMENT:
- `C1-A11Y-002`

MUST VERIFY LIVE:
- `C1-A11Y-001`
- `C1-A11Y-002`
- `C1-A11Y-003`

PRESERVE:
- `C1-A11Y-004`
- `C1-A11Y-005`

STALENESS:
Revalidate every finding against the future Prompt C base before implementation.
