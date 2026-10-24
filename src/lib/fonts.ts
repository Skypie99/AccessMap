/**
 * fonts.ts — custom font loader for the Flagstone design system.
 *
 * Usage in App.tsx:
 *   const [fontsLoaded, fontError] = useAppFonts();
 *   if (!fontsLoaded && !fontError) return null; // or hold splash
 * and, for everything past the welcome cards, the web navigator awaits
 * allAppFontsSettled (AppNavigator.web.tsx).
 *
 * Font family strings come from font.family in @/theme.
 * Design system 2026-05-31:
 *   Plus Jakarta Sans  — display headings (800 ExtraBold, 700 Bold)
 *   Public Sans        — body + UI (400/500/600)
 *   JetBrains Mono     — points, stats, coordinates (400/500/600)
 */

import { Asset } from 'expo-asset';
import { FontDisplay, loadAsync, useFonts } from 'expo-font';
import { useEffect, useState } from 'react';
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
// unchanged. `display` is a web-only descriptor (expo-font: "setting the
// fontDisplay does nothing on native platforms") — on web it writes
// `font-display: swap` into the generated @font-face CSS, so fallback text
// stays visible while the faces download (Lighthouse QD-1: font-display).
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

// The first-launch welcome cards (OnboardingCards) draw with three faces only:
// `display` (title), `bodyMedium` (copy) and `label` (buttons). On web the
// cards wait for just these. The navigator still waits for all eight
// (allAppFontsSettled), so none of its screens swaps fonts mid-render.
// public/index.html preloads these three so they download alongside the JS
// bundle; change the set and update those tags (a guard test checks them).
const welcomeFonts = {
  PlusJakartaSans_800ExtraBold: appFonts.PlusJakartaSans_800ExtraBold,
  PublicSans_500Medium: appFonts.PublicSans_500Medium,
  PublicSans_600SemiBold: appFonts.PublicSans_600SemiBold,
};
const laterFonts = Object.fromEntries(
  Object.entries(appFonts).filter(([family]) => !(family in welcomeFonts)),
);

type FontLoadState = [loaded: boolean, error: Error | null];
type FontLoad = { promise: Promise<void>; settled: FontLoadState | null };

function trackLoad(promise: Promise<void>): FontLoad {
  const load: FontLoad = { promise, settled: null };
  promise.then(
    () => {
      load.settled = [true, null];
    },
    (error: Error) => {
      load.settled = [false, error];
    },
  );
  return load;
}

let webWelcomeLoad: FontLoad | null = null;
let webAllLoad: FontLoad | null = null;

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
  // Register all eight faces in one pass, before anything renders. expo-font
  // keeps every @font-face in a single <style>; adding a face later re-parses
  // it, which re-creates (and can re-fetch) faces already on screen. Each group
  // keeps its own promise because expo-font's web isLoaded() turns true as soon
  // as a face's rule exists, before its file has downloaded.
  const welcome = loadAsync(welcomeFonts);
  webWelcomeLoad = trackLoad(welcome);
  webAllLoad = trackLoad(Promise.all([welcome, loadAsync(laterFonts)]).then(() => undefined));
}

// `null` only when there is no document (a static render): nothing to wait for.
function useFontLoad(load: FontLoad | null): FontLoadState {
  const [state, setState] = useState<FontLoadState>(() =>
    load ? (load.settled ?? [false, null]) : [true, null],
  );
  useEffect(() => {
    if (!load) return;
    let live = true;
    load.promise.then(
      () => {
        if (live) setState((prev) => (prev[0] ? prev : [true, null]));
      },
      (error: Error) => {
        if (live) setState([false, error]);
      },
    );
    return () => {
      live = false;
    };
  }, [load]);
  return state;
}

function useWebWelcomeFonts() {
  return useFontLoad(webWelcomeLoad);
}

function useBundledFonts() {
  return useFonts(appFonts);
}

/** First-render gate. Web waits for the welcome faces; native has all eight bundled. */
export const useAppFonts = Platform.OS === 'web' ? useWebWelcomeFonts : useBundledFonts;

/**
 * Gate for everything after the welcome cards: settles once all eight faces
 * have loaded or failed (a failure falls back to system fonts, never a stall).
 * The web navigator awaits it behind its loading frame. Native: App's
 * first-render gate already waited for all eight bundled faces, so it is
 * settled from the start, exactly as before the web-only split.
 */
export const allAppFontsSettled: Promise<void> = webAllLoad
  ? webAllLoad.promise.then(
      () => undefined,
      () => undefined,
    )
  : Promise.resolve();
