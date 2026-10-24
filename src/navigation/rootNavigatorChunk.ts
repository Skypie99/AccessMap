// The web navigator chunk's one download point. Only AppNavigator.web.tsx
// imports this (native bundles RootNavigator directly), so on web the import()
// below is where Metro splits the navigator into its own chunk. Keeping it in
// its own module gives AppNavigator.web's load-and-retry logic a seam the tests
// can drive without a real network.
export function importRootNavigatorChunk(): Promise<typeof import('./RootNavigator')> {
  return import('./RootNavigator');
}

declare global {
  // Metro (0.83, Expo SDK 54) rewrites a call to this unbound name into
  // asyncRequire.prefetch(): fetch the chunk and define its modules without
  // running any of them. Nothing by this name exists at runtime.
  function __prefetchImport(specifier: string): void;
}

// Download-only warm-up for the same chunk: the later import() reuses the
// in-flight or finished download (Metro keys its chunk loads by path), and a
// failed prefetch is forgotten, so import() simply requests the chunk again.
export function prefetchRootNavigatorChunk(): void {
  try {
    __prefetchImport('./RootNavigator');
  } catch {
    // Only reachable if a toolchain stops rewriting the call: then there is no
    // warm-up, and Skip downloads the chunk exactly as it did before.
  }
}
