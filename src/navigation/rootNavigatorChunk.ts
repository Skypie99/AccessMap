// The web navigator chunk's one download point. Only AppNavigator.web.tsx
// imports this (native bundles RootNavigator directly), so on web the import()
// below is where Metro splits the navigator into its own chunk. Keeping it in
// its own module gives AppNavigator.web's load-and-retry logic a seam the tests
// can drive without a real network.
export function importRootNavigatorChunk(): Promise<typeof import('./RootNavigator')> {
  return import('./RootNavigator');
}
