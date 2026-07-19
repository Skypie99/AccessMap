import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenStage } from '@/components/ui/ScreenStage';
import { Skeleton } from '@/components/ui/Skeleton';
import { radius, spacing } from '@/theme';
import { useColor } from '@/theme/ThemeContext';

/**
 * T12 (F3-01): the fallback shown while a lazy screen's chunk loads (Settings /
 * Admin, reached from the hamburger drawer). Instead of a bare spinner over a
 * flat wash — the app's one undressed frame, between two fully-dressed surfaces —
 * it dresses the destination's own stage: the Deep Field wash (ScreenStage) plus
 * an editorial-header-shaped static Skeleton (a short eyebrow bar over a
 * display-title bar), so the drawer→Settings handoff never drops its floor.
 *
 * Both primitives are opaque (no BlurView), so this keeps ScreenFallback's M-54
 * "opaque system-integrity tier" categorization — dressing the LAZY chunk-load
 * fallback is F3-01's sanctioned exception, NOT a material-train migration (the
 * ErrorBoundary crash fallback stays a bare surface, untouched). The Skeleton is
 * RM-static (0.5) and AT-hidden, so this swaps the un-gated spinner for a calmer,
 * RM-improving frame. On web the chunk is local, so this only flashes briefly;
 * the drawer-open warm-import (DrawerHost) usually resolves it before it shows.
 *
 * Extracted from RootNavigator so the dressed frame is unit-testable without the
 * full navigator graph.
 */
export function ScreenFallback() {
  const color = useColor();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: color.stage1 }}>
      <ScreenStage />
      <View style={{ paddingTop: insets.top + spacing.xxl, paddingHorizontal: spacing.xxl, gap: spacing.sm }}>
        <Skeleton width={96} height={12} borderRadius={radius.sm} />
        <Skeleton width={200} height={40} borderRadius={radius.md} />
      </View>
    </View>
  );
}
