import React, { Suspense } from 'react';
import { ScreenFallback } from './ScreenFallback';
import { importRootNavigatorChunk } from './rootNavigatorChunk';

// Web: the first-launch welcome does not render the navigator. Keeping the
// navigator (map libraries, screens, React Navigation) out of the entry chunk
// cuts what a first visit downloads before the welcome can paint (Lighthouse
// QD-2: unused-javascript). One shared load promise: FirstLaunchGate calls
// preloadAppNavigator as soon as the app is needed (Skip/Continue, or at once
// for a returning visitor) and React.lazy reuses it, so the chunk is fetched
// once and the download overlaps the remaining fonts instead of queueing after
// them. A failed load is forgotten, so the next attempt retries.
type RootNavigatorModule = typeof import('./RootNavigator');
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

// React.lazy keeps a rejected load for the life of the page: the error
// boundary's "Try again" would re-render straight into the same failure, so the
// only way out was reloading the browser tab. After a failure, swap in a fresh
// lazy component; "Try again" re-renders AppNavigator, which picks it up and
// requests the chunk again.
function createLazyRootNavigator(): LazyRootNavigator {
  return React.lazy(() =>
    preloadAppNavigator().catch((error: unknown) => {
      lazyRootNavigator = createLazyRootNavigator();
      throw error;
    }),
  );
}

let lazyRootNavigator = createLazyRootNavigator();

export default function AppNavigator(props: React.ComponentProps<RootNavigatorModule['default']>) {
  const Navigator = lazyRootNavigator;
  return (
    <Suspense fallback={<ScreenFallback />}>
      <Navigator {...props} />
    </Suspense>
  );
}
