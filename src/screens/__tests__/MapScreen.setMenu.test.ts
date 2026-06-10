/**
 * M4 (re-sweep 2026-06-09) — web-safe saved-filter-set menu.
 *
 * Unit tests for the exported helper `webSetMenuChoice(setName, isDefault,
 * confirmFn)` in MapScreen.tsx. On web, Alert.alert is a no-op shim, so the
 * native three-button action sheet never appears — the helper replaces it
 * with two sequential confirm() binaries:
 *   1. Make default / Remove default (label + copy flip on isDefault)
 *   2. Delete (marked destructive)
 * Declining both means "cancel" → null. The confirm function is injected,
 * so these tests pin the prompt sequence with a plain jest.fn() — no
 * window.confirm shim needed. Screen-level wiring (the Platform.OS branch
 * in openSetMenu) stays out of scope, same as the other MapScreen suites.
 *
 * MapScreen's import graph pulls in native-bridge modules; everything that
 * would explode at module-eval time in Node is mocked below, following the
 * patterns in MapScreen.deeplink.test.ts / MapScreen.heatmap.test.tsx.
 */

// jest.mock calls are hoisted above all imports by babel-jest, so these
// imports resolve against the mocked module graph. Kept at the top (not
// mid-file) to keep import/first happy — same note as ReportFlagModal.test.
import { webSetMenuChoice } from '../MapScreen';

// ---------------------------------------------------------------------------
// Mock: @/lib/supabase — MapScreen imports flags.ts / flagsStore / auth
// transitively; createClient would spin up async work at import time.
// ---------------------------------------------------------------------------
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
  },
}));

// ---------------------------------------------------------------------------
// Mock: native map modules (via @/components/PlatformMap)
// ---------------------------------------------------------------------------
jest.mock('react-native-maps', () => ({
  __esModule: true,
  default: () => null,
  Marker: () => null,
  Callout: () => null,
  Polygon: () => null,
  PROVIDER_DEFAULT: 'default',
}));
jest.mock('react-native-map-clustering', () => ({
  __esModule: true,
  default: () => null,
}));

// ---------------------------------------------------------------------------
// Mock: expo device modules (no native bridge in the Node test env)
// ---------------------------------------------------------------------------
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

/** Build a confirm mock that answers the prompts in order. */
function confirmAnswering(...answers: boolean[]) {
  const queue = [...answers];
  return jest.fn(async () => {
    const next = queue.shift();
    if (next === undefined) throw new Error('confirmFn called more times than expected');
    return next;
  });
}

describe('webSetMenuChoice', () => {
  it("returns 'toggleDefault' when the first prompt is accepted (and never asks about delete)", async () => {
    const confirmFn = confirmAnswering(true);
    const choice = await webSetMenuChoice('Wheelchair-only', false, confirmFn);
    expect(choice).toBe('toggleDefault');
    expect(confirmFn).toHaveBeenCalledTimes(1);
  });

  it("returns 'delete' when the first prompt is declined and the second accepted", async () => {
    const confirmFn = confirmAnswering(false, true);
    const choice = await webSetMenuChoice('Wheelchair-only', false, confirmFn);
    expect(choice).toBe('delete');
    expect(confirmFn).toHaveBeenCalledTimes(2);
  });

  it('returns null when both prompts are declined (cancel)', async () => {
    const confirmFn = confirmAnswering(false, false);
    const choice = await webSetMenuChoice('Wheelchair-only', false, confirmFn);
    expect(choice).toBeNull();
    expect(confirmFn).toHaveBeenCalledTimes(2);
  });

  it("labels the first prompt 'Make default' when the set is not the default", async () => {
    const confirmFn = confirmAnswering(true);
    await webSetMenuChoice('Wheelchair-only', false, confirmFn);
    expect(confirmFn).toHaveBeenCalledWith(
      'Wheelchair-only',
      'Make this the filter that opens by default on launch?',
      'Make default',
      false,
    );
  });

  it("labels the first prompt 'Remove default' when the set is already the default", async () => {
    const confirmFn = confirmAnswering(true);
    await webSetMenuChoice('Wheelchair-only', true, confirmFn);
    expect(confirmFn).toHaveBeenCalledWith(
      'Wheelchair-only',
      'This filter opens by default on launch. Remove it as the default?',
      'Remove default',
      false,
    );
  });

  it('asks the delete prompt as destructive, named after the set, with permanence spelled out', async () => {
    const confirmFn = confirmAnswering(false, true);
    await webSetMenuChoice('Wheelchair-only', false, confirmFn);
    const [title, message, label, destructive] = confirmFn.mock.calls[1] as unknown as [
      string,
      string,
      string,
      boolean,
    ];
    expect(title).toBe('Delete "Wheelchair-only"?');
    expect(message).toMatch(/permanently deletes/i);
    expect(message).toMatch(/cannot be undone/i);
    expect(label).toBe('Delete');
    // The destructive flag is what makes the native confirm() render the
    // action in red — the prompt must read (and render) as destructive.
    expect(destructive).toBe(true);
  });
});
