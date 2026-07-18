/**
 * BP11 (R2 / T3) one-press-vocabulary guards.
 *
 * Locks the press dialect so a future edit can't silently regress it:
 *  - The shared PressableScale primitive answers with a FILL-SWAP dim (a
 *    backgroundColor swap, never a group opacity — which would collapse
 *    label-vs-fill contrast below AA). The dim is static, so it SURVIVES
 *    Reduce Motion (RM gates only the scale spring).
 *  - ctaFillPressed is the mode-independent pressed companion to ctaFill, in
 *    both palettes (deepening a brand fill to brandText would break white text
 *    in dark mode, where brandText is a lighter blue).
 *  - The filter language, FlagDetail, and the modal closes speak the fill-swap;
 *    the enumerated same-file group-opacity dims were converted, not spread.
 *  - The bottom tab bar is haptic-only: its labels sit at the AA floor, so a
 *    pressed bg tint would drop them below 4.5:1 (arbiter-proven).
 *
 * Pressed-fill LEGIBILITY across the estate is measured by the arbiter sibling
 * design-reviews/r2-audit/tools/r2-press-vocab-stacks.json (contrast-check.mjs,
 * exit 0). End-to-end feel is a Sky device check (R2-D13). These are the fast
 * in-CI source contracts.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const readSrc = (rel: string) => readFileSync(join(__dirname, '..', '..', rel), 'utf8');
const pressableScale = readSrc('components/ui/PressableScale.tsx');
const themeLight = readSrc('theme.ts');
const themeDark = readSrc('theme/ThemeContext.tsx');
const mapScreen = readSrc('screens/MapScreen.tsx');
const tasksScreen = readSrc('screens/TasksScreen.tsx');
const flagDetail = readSrc('components/FlagDetailModal.tsx');
const tabBarButton = readSrc('navigation/TabBarButton.tsx');

describe('BP11 / T3 — PressableScale carries the press dialect (source contract)', () => {
  it('answers with a backgroundColor FILL-SWAP dim, never a group opacity', () => {
    expect(pressableScale).toMatch(
      /dimOnPress && \(pressed \|\| hovered\) \? \{ backgroundColor: tint \} : null/,
    );
    expect(pressableScale).toMatch(/const tint = pressedTint \?\? color\.borderPressed/);
    // The primitive never introduces a group opacity as press feedback.
    expect(pressableScale).not.toMatch(/opacity:/);
  });

  it('exposes the dimOnPress + pressedTint opt-outs for active/brand controls', () => {
    expect(pressableScale).toMatch(/dimOnPress\?: boolean/);
    expect(pressableScale).toMatch(/pressedTint\?: string/);
  });

  it('the dim survives Reduce Motion — only the scale spring is RM-gated', () => {
    // The spring is behind the RM guard...
    expect(pressableScale).toMatch(/if \(!reducedMotion\) \{[\s\S]*?Animated\.spring/);
    // ...but the fill-swap line carries no reducedMotion guard (static dim).
    const dimLine = pressableScale
      .split('\n')
      .find((l) => l.includes('backgroundColor: tint'));
    expect(dimLine).toBeDefined();
    expect(dimLine).not.toMatch(/reducedMotion/);
  });
});

describe('BP11 / T3 — ctaFillPressed token (source contract)', () => {
  it('is the mode-independent pressed companion to ctaFill in both palettes', () => {
    expect(themeLight).toMatch(/ctaFillPressed: '#0F53BE'/);
    expect(themeDark).toMatch(/ctaFillPressed: '#0F53BE'/);
  });
});

describe('BP11 / T3 — the estate speaks fill-swaps, not group opacity', () => {
  it('MapScreen filter/preset/empty pressed styles are token fill-swaps', () => {
    expect(mapScreen).toMatch(/filterPillPressed: \{ backgroundColor: color\.borderPressed \}/);
    expect(mapScreen).toMatch(/presetBtnPressed: \{ backgroundColor: color\.ctaFillPressed \}/);
    expect(mapScreen).toMatch(/presetBtnSecondaryPressed: \{ backgroundColor: color\.borderPressed \}/);
    expect(mapScreen).toMatch(/savedSaveBtnPressed: \{ backgroundColor: color\.ctaFillPressed \}/);
    expect(mapScreen).toMatch(/emptyCardBtnPressed: \{ backgroundColor: color\.ctaFillPressed \}/);
    // the converted dims no longer carry a group opacity
    expect(mapScreen).not.toMatch(/presetBtnPressed:[^}]*opacity/);
    expect(mapScreen).not.toMatch(/emptyCardBtnPressed:[^}]*opacity/);
    expect(mapScreen).not.toMatch(/placeChipPressed:[^}]*opacity/);
  });

  it('TasksScreen chips dim via borderPressed; Details opts out (its ink is at the floor)', () => {
    expect(tasksScreen).toMatch(/chipPressed: \{ backgroundColor: color\.borderPressed \}/);
    // Verify deepens to ctaFillPressed; Details opts out of the fill dim.
    expect(tasksScreen).toMatch(/pressedTint: color\.ctaFillPressed/);
    expect(tasksScreen).toMatch(/dimOnPress: false/);
  });

  it('FlagDetailModal converted its 4 same-file opacity dims to fill-swaps', () => {
    expect(flagDetail).toMatch(/afterTipBtnPressed: \{ backgroundColor: color\.borderPressed \}/);
    expect(flagDetail).toMatch(/coordsCopyBtnPressed: \{ backgroundColor: color\.borderPressed \}/);
    expect(flagDetail).toMatch(/watchBtnPressed: \{\s*backgroundColor: color\.borderPressed/);
    expect(flagDetail).toMatch(/commentSendBtnPressed: \{\s*backgroundColor: color\.ctaFillPressed/);
    // none of the four keep an opacity
    expect(flagDetail).not.toMatch(/afterTipBtnPressed:[^}]*opacity/);
    expect(flagDetail).not.toMatch(/coordsCopyBtnPressed:[^}]*opacity/);
  });
});

describe('BP11 / T3 — tab bar: haptic-only + forwards a11y (source contract)', () => {
  it('fires the haptic, forwards every injected prop, adds no visual dim', () => {
    expect(tabBarButton).toMatch(/hapticSelection\(\)/);
    // Built on RN Navigation's own PlatformPressable and spreads {...rest} so
    // v7's aria-selected / aria-label / href reach the node (v7 sends the
    // current-tab signal as aria-selected, NOT accessibilityState — dropping it
    // would un-announce the active tab to screen readers).
    expect(tabBarButton).toMatch(/PlatformPressable/);
    expect(tabBarButton).toMatch(/\{\.\.\.rest\}/);
    // Haptic-only: no background fill dim, and PlatformPressable's own opacity
    // dip is disabled (pressOpacity 1) — the near-floor labels can't take a dim.
    expect(tabBarButton).not.toMatch(/backgroundColor/);
    expect(tabBarButton).toMatch(/pressOpacity=\{1\}/);
  });
});
