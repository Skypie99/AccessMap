// Severity vocabulary: order, tint, and the words that name each level.
// Kept apart from flags.ts so screens that only show a severity (the
// first-launch welcome) don't pull the Supabase client into the web entry
// chunk; flags.ts re-exports everything here.
import { color as themeColor, severity as severityRamp } from '@/theme';
import type { FlagSeverity } from '@/types/database';

export const SEVERITY_ORDER: FlagSeverity[] = [1, 2, 3, 4, 5];

// Marker / severity-bar hex tints. Used everywhere a severity needs to show
// up visually: the map pin, the Tasks card dot, the LegendModal swatch, etc.
// Kept here (not in a screen file) so it's the single source of truth — every
// surface tints from the same palette. Pair with SEVERITY_COLOR_NAMES below
// so screen readers can name the color out loud.
//
// The `default` branch is defensive: if a future row carries an unexpected
// severity (dirty data, schema widening), return a neutral gray instead of
// `undefined` so the marker/severity bar still renders something.
export function severityColor(s: FlagSeverity): string {
  // Single source of truth: the design-system severity ramp in theme.ts
  // (Claude Design yellow→red). Reading the token here keeps the map pins,
  // Tasks dots, and LegendModal swatches in lockstep with SeverityDisc.
  return severityRamp[s]?.color ?? themeColor.textSubtle;
}

// Short human label and color name for each severity. The color name is read
// aloud so meaning isn't carried by color alone. The labels DERIVE from the
// design-system severity ramp (theme.ts) so the report form, legend, map
// callouts, and FlagCard always name a severity identically — one source.
export const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  1: severityRamp[1].label,
  2: severityRamp[2].label,
  3: severityRamp[3].label,
  4: severityRamp[4].label,
  5: severityRamp[5].label,
};

export const SEVERITY_COLOR_NAMES: Record<FlagSeverity, string> = {
  1: 'yellow',
  2: 'amber',
  3: 'orange',
  4: 'deep orange',
  5: 'red',
};

export const SEVERITY_DESCRIPTIONS: Record<FlagSeverity, string> = {
  1: 'Inconvenient but usable.',
  2: 'Doable with effort or help.',
  3: 'Hard for many users.',
  4: 'Hard or unsafe for most users.',
  5: 'Impassable. Needs a detour.',
};
