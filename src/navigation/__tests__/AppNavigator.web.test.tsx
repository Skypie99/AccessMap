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
jest.mock('../rootNavigatorChunk', () => ({
  importRootNavigatorChunk: () => mockImportChunk(),
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
