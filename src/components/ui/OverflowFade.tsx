/**
 * OverflowFade — the shared S16 / T14 overflow-scent fade edge (F2-07).
 *
 * A pointer-inert, a11y-hidden static gradient painted over the clipped right edge
 * of a horizontal chip scroller to cue "there is more past this edge". This
 * component is the SINGLE SOURCE OF THE INK — the shipped Map action bar and every
 * chip rail render it, so an F2-08 strengthen changes one constant here and
 * propagates everywhere (never a fork).
 *
 * Pair with useHorizontalOverflowFade(): wire that hook's `scrollHandlers` onto the
 * `ScrollView horizontal`, then render <OverflowFade visible={hasMore} /> as an
 * absolute sibling inside a `position: relative` wrapper over the right edge.
 */
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '@/theme';
import { useColor } from '@/theme/ThemeContext';

// The one true overflow-fade ink. Light: transparent -> 22% deep navy; dark:
// transparent -> 38% black. If F2-08's efficacy probe finds the light edge does
// not read over the Positron-tile action bar, strengthen the light stop HERE ONLY.
const OVERFLOW_FADE_INK = {
  light: ['rgba(15,27,45,0)', 'rgba(15,27,45,0.22)'] as const,
  dark: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.38)'] as const,
};

export interface OverflowFadeProps {
  /** Show the fade — drive from useHorizontalOverflowFade().hasMore. */
  visible: boolean;
  /** 'pill' rounds the right corners to a circular tray (the Map action bar);
   *  'square' (default) is the flat right edge of a chip strip. */
  edge?: 'pill' | 'square';
  /** Fade width in px (default 28). */
  width?: number;
}

export function OverflowFade({ visible, edge = 'square', width = 28 }: OverflowFadeProps) {
  const color = useColor();
  if (!visible) return null;
  const cornerRadius = edge === 'pill' ? radius.circle : 0;
  return (
    <LinearGradient
      colors={color.scheme === 'light' ? OVERFLOW_FADE_INK.light : OVERFLOW_FADE_INK.dark}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[
        styles.fade,
        { width, borderTopRightRadius: cornerRadius, borderBottomRightRadius: cornerRadius },
      ]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', right: 0, top: 0, bottom: 0 },
});
