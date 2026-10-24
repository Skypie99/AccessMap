import React, { Suspense, useEffect, useState } from 'react';
import { View } from 'react-native';
import { ErrorFallback } from '@/components/ErrorBoundary';
import { AppText } from '@/components/ui/AppText';
import { announce } from '@/lib/announce';
import { allAppFontsSettled } from '@/lib/fonts';
import { font } from '@/theme';
import { useColor } from '@/theme/ThemeContext';
import { ScreenFallback } from './ScreenFallback';
import { importRootNavigatorChunk, prefetchRootNavigatorChunk } from './rootNavigatorChunk';

// Web: the first-launch welcome does not render the navigator. Keeping the
// navigator (map libraries, screens, React Navigation) out of the entry chunk
// cuts what a first visit downloads before the welcome can paint (Lighthouse
// QD-2: unused-javascript). One shared load promise: FirstLaunchGate calls
// preloadAppNavigator as soon as the app is needed (Skip/Continue, or at once
// for a returning visitor) and React.lazy reuses it, so the chunk is fetched
// once and the download overlaps the remaining fonts instead of queueing after
// them. A failed load is forgotten, so the next attempt retries.
type RootNavigatorModule = typeof import('./RootNavigator');
type RootNavigatorProps = React.ComponentProps<RootNavigatorModule['default']>;
type LazyRootNavigator = React.LazyExoticComponent<RootNavigatorModule['default']>;

// Skip is the moment a flaky mobile connection drops this download, and it is
// the only way into the app, so one failure retries quietly before the error
// screen shows. Metro forgets a failed chunk, so the second import() requests
// it again rather than replaying the failure.
export const NAVIGATOR_RETRY_DELAY_MS = 1000;

let rootNavigatorLoad: Promise<RootNavigatorModule> | null = null;

function importRootNavigator(): Promise<RootNavigatorModule> {
  return importRootNavigatorChunk().catch(
    () =>
      new Promise<RootNavigatorModule>((resolve, reject) => {
        setTimeout(() => importRootNavigatorChunk().then(resolve, reject), NAVIGATOR_RETRY_DELAY_MS);
      }),
  );
}

export function preloadAppNavigator(): Promise<RootNavigatorModule> {
  if (!rootNavigatorLoad) {
    rootNavigatorLoad = importRootNavigator().catch((error: unknown) => {
      rootNavigatorLoad = null;
      throw error;
    });
  }
  return rootNavigatorLoad;
}

// The welcome holds the visitor for as long as they choose to read, while the
// navigator chunk (most of the app) would otherwise wait for Skip or Continue
// and then make them wait for it. Their first press, tap, key or scroll on the
// welcome says they are heading in, so the download starts then and runs while
// they finish the cards. It only fetches and defines the chunk: no navigator
// code runs until the app is needed, so the cards stay responsive. A page
// nobody touches (a first-load audit included) fetches nothing extra.
const ENGAGEMENT_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const;
const CAPTURE = { capture: true } as const;

export function prefetchAppNavigatorOnEngagement(): () => void {
  if (typeof document === 'undefined') return () => {};
  const stop = () => {
    for (const type of ENGAGEMENT_EVENTS) document.removeEventListener(type, onEngage, CAPTURE);
  };
  const onEngage = () => {
    stop();
    if (!rootNavigatorLoad) prefetchRootNavigatorChunk();
  };
  for (const type of ENGAGEMENT_EVENTS) {
    document.addEventListener(type, onEngage, { capture: true, passive: true });
  }
  return stop;
}

// A download that failed twice (the quiet retry included) is named, so the
// boundary below can tell it from a crash inside the navigator. A crash still
// reaches the app-level ErrorBoundary and its crash copy.
const NAVIGATOR_LOAD_ERROR = 'NavigatorLoadError';

function navigatorLoadError(cause: unknown): Error {
  const error = new Error(`The app could not be downloaded: ${cause instanceof Error ? cause.message : String(cause)}`);
  error.name = NAVIGATOR_LOAD_ERROR;
  return error;
}

// The navigator's screens draw with all eight font faces, and the welcome only
// waited for three, so it also waits for the other five: right after an
// immediate Skip they can still be downloading. One loading frame covers both
// waits, instead of a blank wash before the frame.
//
// React.lazy keeps a rejected load for the life of the page: the error
// boundary's "Try again" would re-render straight into the same failure, so the
// only way out was reloading the browser tab. After a failure, swap in a fresh
// lazy component; "Try again" remounts LazyNavigator, which picks it up and
// requests the chunk again.
function createLazyRootNavigator(): LazyRootNavigator {
  return React.lazy(() =>
    Promise.all([preloadAppNavigator(), allAppFontsSettled]).then(
      ([module]) => module,
      (error: unknown) => {
        lazyRootNavigator = createLazyRootNavigator();
        throw navigatorLoadError(error);
      },
    ),
  );
}

let lazyRootNavigator = createLazyRootNavigator();

// An immediate Skip on a slow connection waits for the whole chunk and the last
// faces (about 6 s on Lighthouse's slow 4G), and the skeleton alone says
// nothing: it is hidden from screen readers and holds still under Reduce
// Motion. Past this delay the wait gets words, on screen and in a polite
// status. A visitor who engaged with the welcome, or is returning, usually has
// everything sooner and is spared a status that would vanish as it was spoken.
export const NAVIGATOR_STATUS_DELAY_MS = 1000;
export const NAVIGATOR_LOADING_TEXT = 'Loading Flagstone…';
export const NAVIGATOR_OPEN_TEXT = 'Flagstone is open.';
export const NAVIGATOR_FAILED_TITLE = "Couldn't load Flagstone";
export const NAVIGATOR_FAILED_BODY = 'Check your connection and try again. If it keeps happening, reload the page.';

// Set once the loading status has shown, so the app's arrival is announced only
// after a wait that was announced.
let loadingAnnounced = false;

// The status mounts empty with the fallback and only its text changes: browser
// screen readers speak a live region's text changes but often skip a region
// that arrives with its text. role="status" is polite and atomic on its own
// (react-native-web 0.21 drops aria-atomic). The words sit in the subtitle slot
// of the header the skeleton is shaped like, at the subtitle's size, in the
// welcome's body face: the other faces may still be downloading, and this line
// must not swap fonts while it is read. Body ink, not the subtitle's muted ink:
// this high on the stage the brand pool is at its deepest, and textMuted
// measured 4.47:1 there against the 4.5:1 floor (2026-10-24).
function NavigatorLoadingStatus() {
  const color = useColor();
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => {
      loadingAnnounced = true;
      setWaiting(true);
    }, NAVIGATOR_STATUS_DELAY_MS);
    return () => clearTimeout(id);
  }, []);
  return (
    <View role="status" aria-live="polite">
      <AppText variant="bodyMedium" size={font.size.md} color={color.text}>
        {waiting ? NAVIGATOR_LOADING_TEXT : ''}
      </AppText>
    </View>
  );
}

// The status above leaves with the fallback, so the app-wide live region says
// the wait is over. It mounts with the navigator, never before.
function NavigatorArrival() {
  useEffect(() => {
    if (!loadingAnnounced) return;
    loadingAnnounced = false;
    announce(NAVIGATOR_OPEN_TEXT);
  }, []);
  return null;
}

type LoadBoundaryState = { failed: boolean; error: unknown };

// A failed download is not a crash, so it keeps the error screen but says what
// happened and what helps; "Try again" remounts LazyNavigator, which requests
// the chunk again. Anything else is rethrown to the app-level ErrorBoundary.
class NavigatorLoadBoundary extends React.Component<{ children: React.ReactNode }, LoadBoundaryState> {
  state: LoadBoundaryState = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): LoadBoundaryState {
    return { failed: true, error };
  }

  handleRetry = () => {
    this.setState({ failed: false, error: null });
  };

  render() {
    if (!this.state.failed) return this.props.children;
    const { error } = this.state;
    if (!(error instanceof Error && error.name === NAVIGATOR_LOAD_ERROR)) throw error;
    return <ErrorFallback title={NAVIGATOR_FAILED_TITLE} body={NAVIGATOR_FAILED_BODY} onReset={this.handleRetry} />;
  }
}

// Reads the lazy component at render, so a remount after a failure picks up the
// fresh one.
function LazyNavigator(props: RootNavigatorProps) {
  const Navigator = lazyRootNavigator;
  return (
    <Suspense
      fallback={
        <ScreenFallback>
          <NavigatorLoadingStatus />
        </ScreenFallback>
      }
    >
      <Navigator {...props} />
      <NavigatorArrival />
    </Suspense>
  );
}

export default function AppNavigator(props: RootNavigatorProps) {
  return (
    <NavigatorLoadBoundary>
      <LazyNavigator {...props} />
    </NavigatorLoadBoundary>
  );
}
