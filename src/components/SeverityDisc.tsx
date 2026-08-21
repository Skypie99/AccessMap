/**
 * SeverityDisc — the severity grammar's atom.
 *
 * A filled circle showing the severity digit in the *designed ink fork*:
 * severities 1–4 carry dark ink, only sev-5 red keeps white (see `severity`
 * in theme.ts — the 2026-07-02 Material Lab AA audit). That asymmetry is ONE
 * system on purpose; it is baked in here so no caller can "fix" it to uniform.
 *
 * Why a primitive: four surfaces used to hand-roll this same disc with their
 * own `sevDot` / `sevDotText` StyleSheet copies (LegendModal, NearbyFlagsModal,
 * ActivityFeedModal, RecentlyViewedRow) — identical by discipline, which is how
 * they quietly drifted (28 vs 32, digit 12 vs 13 vs 14). Now they inherit one
 * atom instead of re-deciding size, digit, and ink.
 *
 * Decorative by default: the digit is hidden from screen readers because the
 * surface that hosts a disc always speaks the severity in its own label (via
 * `severityA11y`). Every current caller is decorative; `decorative={false}` is
 * the escape hatch for a future disc that is ever the sole severity signal (the
 * caller then owns the label).
 *
 * NEVER put this on a map pin — the pin already encodes severity across four
 * channels at capacity (PROTECT); a disc/digit would be a fifth. List, card,
 * legend, and onboarding glyphs only.
 */
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { decorativeProps } from '@/lib/accessibility';
import { severityColor } from '@/lib/flags';
import { font, radius, severity } from '@/theme';
import type { FlagSeverity } from '@/types/database';

type SeverityDiscProps = {
  severity: FlagSeverity;
  /** Diameter. Adoptions use 24 / 28 / 32; the disc is always fully round
   *  (`radius.circle`), so any size clips to a circle. */
  size?: number;
  /** Digit font size. Defaults to the caption floor; pass explicitly to match
   *  an existing site byte-for-byte (Legend 14 · Nearby 13 · the rest 12). */
  digitSize?: number;
  /** Per-site Dynamic Type cap. RecentlyViewedRow pins 1.3 so the glyph box
   *  stays inside a 24pt dot at large type. Defaults to DISC_MAX_FONT_SCALE. */
  maxFontSizeMultiplier?: number;
  /** Hide from the a11y tree (default true — the host row speaks the severity). */
  decorative?: boolean;
};

/**
 * @see SEVERITY_LABELS / SEVERITY_DESCRIPTIONS (flags.ts) for the word + stake
 * that ALWAYS accompany this digit in the full grammar. The disc is the number
 * channel only; a surface never shows a disc without also speaking the word.
 */
/**
 * T3 — a disc is a FIXED BOX: the digit is sized by the circle around it, not by
 * the container it sits in. This used to be left undefined, which fell through
 * to AppText's `label` cap (1.6) and happened to fit. Since T3 an enclosing
 * `content` TypeBlock would override that table and leave the digit UNCAPPED,
 * bursting a 24 or 32pt circle at accessibility sizes. Stating the cap here
 * keeps today's render byte-identical AND makes the disc immune to whatever
 * block encloses it, which is exactly what "fixed boxes cap by box" means.
 * 1.6 is the box-derived number: 13pt in a 32pt disc reaches 20.8pt, 12pt in a
 * 24pt disc reaches 19.2pt — both still inside their circle.
 */
export const DISC_MAX_FONT_SCALE = 1.6;

export function SeverityDisc({
  severity: sev,
  size = 24,
  digitSize = font.size.xs,
  maxFontSizeMultiplier = DISC_MAX_FONT_SCALE,
  decorative = true,
}: SeverityDiscProps) {
  return (
    <View
      style={[styles.disc, { width: size, height: size, backgroundColor: severityColor(sev) }]}
      {...(decorative ? decorativeProps : null)}
    >
      <AppText
        variant="label"
        style={[styles.digit, { fontSize: digitSize, color: severity[sev].textOnColor }]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      >
        {sev}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  disc: {
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    fontWeight: font.weight.bold,
  },
});
