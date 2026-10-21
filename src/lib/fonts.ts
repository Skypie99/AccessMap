/**
 * fonts.ts — custom font loader for the Flagstone design system.
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

import { Asset } from 'expo-asset';
import { FontDisplay, useFonts } from 'expo-font';
import { Platform } from 'react-native';
// Per-weight subpath imports — NOT the package-root barrel. The barrel re-exports
// every weight, so importing from it makes Metro bundle all 48 .ttf into dist/
// even though we ship 8. Importing each weight's own module pulls only that .ttf.
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { PublicSans_400Regular } from '@expo-google-fonts/public-sans/400Regular';
import { PublicSans_500Medium } from '@expo-google-fonts/public-sans/500Medium';
import { PublicSans_600SemiBold } from '@expo-google-fonts/public-sans/600SemiBold';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono/400Regular';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono/500Medium';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';

// The existing font-ready gate needs all eight faces. Keep their identities
// unchanged; the web display descriptor is ignored by Expo's native loader.
const appFonts = {
  // Plus Jakarta Sans — display headings
  PlusJakartaSans_700Bold: { uri: PlusJakartaSans_700Bold, display: FontDisplay.SWAP },
  PlusJakartaSans_800ExtraBold: { uri: PlusJakartaSans_800ExtraBold, display: FontDisplay.SWAP },
  // Public Sans — body + UI labels
  PublicSans_400Regular: { uri: PublicSans_400Regular, display: FontDisplay.SWAP },
  PublicSans_500Medium: { uri: PublicSans_500Medium, display: FontDisplay.SWAP },
  PublicSans_600SemiBold: { uri: PublicSans_600SemiBold, display: FontDisplay.SWAP },
  // JetBrains Mono — points, stats
  JetBrainsMono_400Regular: { uri: JetBrainsMono_400Regular, display: FontDisplay.SWAP },
  JetBrainsMono_500Medium: { uri: JetBrainsMono_500Medium, display: FontDisplay.SWAP },
  JetBrainsMono_600SemiBold: { uri: JetBrainsMono_600SemiBold, display: FontDisplay.SWAP },
};

// Discover the required font downloads before the hook's effect/FontObserver
// work. Anonymous font preloads share the subsequent CSS font requests.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  for (const [family, resource] of Object.entries(appFonts)) {
    if (document.querySelector(`link[data-flagstone-font="${family}"]`)) continue;
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'font';
    preload.type = 'font/ttf';
    preload.crossOrigin = 'anonymous';
    preload.href = Asset.fromModule(resource.uri).uri;
    preload.dataset.flagstoneFont = family;
    document.head.appendChild(preload);
  }
}

export function useAppFonts() {
  return useFonts(appFonts);
}
