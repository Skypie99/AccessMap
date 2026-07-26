# F1 — TOUCH & ACKNOWLEDGMENT (weight this lens highest, with F6)

Census EVERY interactive element per screen (Home, Map + its sheets, Tasks, Profile signed-out,
Settings, drawer, onboarding, Report sheet, Nearby, Legend, detail modal, Feedback family): does
the press acknowledge —
- **visually** (PressableScale spring, pressed-style opacity/highlight, the Tasks card sheen)?
- **haptically** (which of the THREE vocabulary words — `hapticSelection`/`hapticImpact`/
  `hapticNotify`, src/lib/haptics.ts — fires, and is the vocabulary used SEMANTICALLY: selection
  for picks, impact for commits, notify for outcomes)? Haptics are native-only — code-read every
  call site (`grep -rn "haptic" src`), tag NEEDS-SKY-DEVICE for feel.
- **audibly** (SR state change via a11yToggle flat-aria; announce via the LiveStatusRegion /
  announce.ts shim)?

Map the distribution: which controls ride `PressableScale` (4 adopter files — name them), which
have hand-rolled pressed styles, which are DEAD TO THE HAND (no feedback at all). A dead press on
a core-flow control is HIGH minimum. Judge web hover + focus-visible parity (press/ group:
hover + tab-focus shots; the a11y.focusRing tokens exist — do they actually appear?). Feedback
must survive RM honestly: instant acknowledgment, never absent (the rm-pressed capture proves or
breaks this — the sheen is UNMOUNTED under RM; what remains?). The 44pt floor stays a floor —
spot-check new controls (S6 zoom buttons 48pt, S16 Clear-all ~48 effective, S5 retry 44) but do
not fill your quota with target-size nits; Round 1 already policed sizes.

Key nerves (orientation §2): PressableScale.tsx · Button.tsx (0 call sites — census only, Fork 9)
· haptics.ts · raw Pressable patterns. Your asset groups: `press/` (paired rest/pressed/hover/
focus + rm-pressed), `base/` (control inventory per screen). Also code-read `android_ripple` /
`style={({pressed})=>…}` patterns app-wide.

The one-hand half: per size class (375/390/430 base shots), is every primary action in thumb
reach? The bottom-zone discipline (zoom buttons bottom, FAB column) vs top-zone controls
(MAP/Explore chip, HeaderActions circles — S8's new chrome IS new touch surface; census it).
