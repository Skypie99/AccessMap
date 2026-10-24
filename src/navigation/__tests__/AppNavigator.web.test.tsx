/**
 * AppNavigator.web — the web navigator is one lazy chunk, fetched when the
 * visitor leaves the welcome cards. Skip is the only way into the app, so a
 * failed download must not strand the visitor:
 *  - one failure retries quietly (Metro forgets a failed chunk, so the retry
 *    really requests it again);
 *  - if the retry fails too, the error screen's "Try again" must request the
 *    chunk again. React.lazy keeps a rejected load for the life of the page, so
 *    without a fresh lazy component "Try again" re-threw the same failure and
 *    only a full browser reload got the visitor in.
 * And the download should not wait for Skip at all once the visitor engages:
 * their first press, tap, key or scroll on the welcome warms the chunk, while a
 * page nobody touches (a first-load audit) fetches nothing extra.
 *
 * Each test loads a fresh module registry: the navigator keeps its load promise
 * and lazy component at module scope, exactly as the app does across renders.
 */
import React from 'react';

// The renderer is required per test (after jest.resetModules) so it shares the
// fresh React instance; its import-time afterEach hook cannot run inside a test.
process.env.RNTL_SKIP_AUTO_CLEANUP = 'true';

// Each call is one download attempt of the navigator chunk.
const mockImportChunk = jest.fn();
const mockPrefetchChunk = jest.fn();
jest.mock('../rootNavigatorChunk', () => ({
  importRootNavigatorChunk: () => mockImportChunk(),
  prefetchRootNavigatorChunk: () => mockPrefetchChunk(),
}));

const chunkFailure = () => Promise.reject(new Error('Loading chunk RootNavigator failed.'));
// Built at call time so it uses the same (fresh) React Native as the renderer.
const chunkSuccess = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native') as typeof import('react-native');
  return Promise.resolve({ __esModule: true, default: () => <Text>navigator ready</Text> });
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function freshApp() {
  jest.resetModules();
  /* eslint-disable @typescript-eslint/no-require-imports */
  const rntl = require('@testing-library/react-native') as typeof import('@testing-library/react-native');
  const { SafeAreaProvider } = require('react-native-safe-area-context') as typeof import('react-native-safe-area-context');
  const ErrorBoundary = (require('@/components/ErrorBoundary') as typeof import('@/components/ErrorBoundary')).default;
  const navigator = require('../AppNavigator.web') as typeof import('../AppNavigator.web');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const AppNavigator = navigator.default;
  const renderApp = () =>
    rntl.render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ErrorBoundary>
          <AppNavigator initialRouteName="Home" />
        </ErrorBoundary>
      </SafeAreaProvider>,
    );
  return { fireEvent: rntl.fireEvent, navigator, renderApp };
}

// Past the quiet retry: the default 1 s wait would end on the retry's own tick.
const WAIT = { timeout: 5000 };

let consoleError: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  mockImportChunk.mockReset();
  mockPrefetchChunk.mockReset();
  // ErrorBoundary logs what it catches; the failures here are deliberate.
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  jest.useRealTimers();
});

test('a failed chunk download retries once, quietly, before any error shows', async () => {
  mockImportChunk.mockImplementationOnce(chunkFailure).mockImplementation(chunkSuccess);
  const { renderApp } = freshApp();
  const app = renderApp();

  expect(await app.findByText('navigator ready', {}, WAIT)).toBeTruthy();
  expect(app.queryByLabelText('Try again')).toBeNull();
  expect(mockImportChunk).toHaveBeenCalledTimes(2);
  app.unmount();
});

test('when the retry fails too, "Try again" requests the chunk again and lets the visitor in', async () => {
  mockImportChunk
    .mockImplementationOnce(chunkFailure)
    .mockImplementationOnce(chunkFailure)
    .mockImplementation(chunkSuccess);
  const { renderApp, fireEvent } = freshApp();
  const app = renderApp();

  const tryAgain = await app.findByLabelText('Try again', {}, WAIT);
  expect(app.queryByText('navigator ready')).toBeNull();
  expect(mockImportChunk).toHaveBeenCalledTimes(2);

  fireEvent.press(tryAgain);

  expect(await app.findByText('navigator ready', {}, WAIT)).toBeTruthy();
  expect(mockImportChunk).toHaveBeenCalledTimes(3);
  app.unmount();
});

test("the gate's preload and the lazy navigator share one download", async () => {
  mockImportChunk.mockImplementation(chunkSuccess);
  const { navigator, renderApp } = freshApp();
  const first = navigator.preloadAppNavigator();
  expect(navigator.preloadAppNavigator()).toBe(first);
  await first;

  const app = renderApp();

  expect(await app.findByText('navigator ready', {}, WAIT)).toBeTruthy();
  expect(mockImportChunk).toHaveBeenCalledTimes(1);
  app.unmount();
});

describe('engagement warms the chunk before Skip', () => {
  // The test environment has no DOM; the warm-up only needs document events.
  const g = globalThis as { document?: unknown };
  beforeEach(() => {
    g.document = new EventTarget();
  });
  afterEach(() => {
    delete g.document;
  });
  const fire = (type: string) => (g.document as EventTarget).dispatchEvent(new Event(type));

  test('nothing is fetched until the first press, which fetches once', () => {
    const { navigator } = freshApp();
    navigator.prefetchAppNavigatorOnEngagement();
    expect(mockPrefetchChunk).not.toHaveBeenCalled();

    fire('pointerdown');
    fire('pointerdown');
    fire('wheel');

    expect(mockPrefetchChunk).toHaveBeenCalledTimes(1);
    expect(mockImportChunk).not.toHaveBeenCalled();
  });

  test('a key press counts, so keyboard visitors get the head start too', () => {
    const { navigator } = freshApp();
    navigator.prefetchAppNavigatorOnEngagement();
    fire('keydown');
    expect(mockPrefetchChunk).toHaveBeenCalledTimes(1);
  });

  test('leaving the welcome first removes the listeners', () => {
    const { navigator } = freshApp();
    const stop = navigator.prefetchAppNavigatorOnEngagement();
    stop();
    fire('pointerdown');
    fire('touchstart');
    expect(mockPrefetchChunk).not.toHaveBeenCalled();
  });

  test('no warm-up once the gate has already requested the navigator', () => {
    mockImportChunk.mockImplementation(chunkSuccess);
    const { navigator } = freshApp();
    navigator.prefetchAppNavigatorOnEngagement();
    void navigator.preloadAppNavigator();
    fire('pointerdown');
    expect(mockPrefetchChunk).not.toHaveBeenCalled();
    expect(mockImportChunk).toHaveBeenCalledTimes(1);
  });
});

test('the warm-up and the import name the same chunk', () => {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const { stripComments } = require('@/__tests__/support/stripComments') as typeof import('@/__tests__/support/stripComments');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const src = stripComments(fs.readFileSync(path.join(__dirname, '..', 'rootNavigatorChunk.ts'), 'utf8'));
  // `typeof import(...)` in the return type is a type, not a load.
  const imported = [...src.matchAll(/(?<!typeof )\bimport\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
  // A bare call (no local binding) is what Metro rewrites into a prefetch.
  const prefetched = [...src.matchAll(/\b__prefetchImport\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);
  expect(imported).toEqual(['./RootNavigator']);
  expect(prefetched).toEqual(['./RootNavigator']);
  // The `declare global` typing is erased before Metro sees the file; any other
  // declaration would be a real binding, and Metro leaves a bound name alone.
  const runtime = src.replace(/declare global \{[\s\S]*?\n\}/, '');
  expect(runtime).not.toMatch(/(?:const|let|var|function)\s+__prefetchImport\b/);
});
