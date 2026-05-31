/**
 * fonts.ts — custom font loader for the AccessMap design system.
 *
 * Usage in App.tsx:
 *   const [fontsLoaded, fontError] = useAppFonts();
 *   if (!fontsLoaded && !fontError) return null; // or hold splash
 *
 * Font family strings come from font.family in @/theme.
 * Design system 2026-05-31:
 *   Plus Jakarta Sans  — display headings (800 ExtraBold, 700 Bold)
 *   Public Sans        — body + UI (400/500/600)
 *   JetBrains Mono     — points, stats, coordinates (400/500/600)
 */

import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
} from '@expo-google-fonts/public-sans';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
} from '@expo-google-fonts/jetbrains-mono';

export function useAppFonts() {
  return useFonts({
    // Plus Jakarta Sans — display headings
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    // Public Sans — body + UI labels
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    // JetBrains Mono — points, stats
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });
}
