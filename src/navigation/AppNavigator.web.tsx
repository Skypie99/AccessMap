import React, { Suspense } from 'react';
import { ScreenFallback } from './ScreenFallback';

// Web: the first-launch welcome does not render the navigator. Keeping the
// navigator (map libraries, screens, React Navigation) out of the entry chunk
// cuts what a first visit downloads before the welcome can paint (Lighthouse
// QD-2: unused-javascript). One shared load promise: FirstLaunchGate calls
// preloadAppNavigator as soon as the app is needed (Skip/Continue, or at once
// for a returning visitor) and React.lazy reuses it, so the chunk is fetched
// once and the download overlaps the remaining fonts instead of queueing after
// them. A failed load is forgotten, so the next attempt retries.
let rootNavigatorLoad: Promise<typeof import('./RootNavigator')> | null = null;

export function preloadAppNavigator(): Promise<typeof import('./RootNavigator')> {
  if (!rootNavigatorLoad) {
    rootNavigatorLoad = import('./RootNavigator').catch((error: unknown) => {
      rootNavigatorLoad = null;
      throw error;
    });
  }
  return rootNavigatorLoad;
}

const LazyRootNavigator = React.lazy(preloadAppNavigator);

export default function AppNavigator(props: React.ComponentProps<typeof LazyRootNavigator>) {
  return (
    <Suspense fallback={<ScreenFallback />}>
      <LazyRootNavigator {...props} />
    </Suspense>
  );
}
