/**
 * Tests for src/lib/filterPanelPrefs.ts — the AsyncStorage-backed boolean
 * for whether the Map filter panel is currently collapsed.
 *
 * What this protects against:
 *  - A storage hiccup at load time returning anything other than `false`
 *    and accidentally collapsing every user's panel on launch.
 *  - A storage hiccup at save time bubbling up and crashing the UI.
 *  - A future change to the canonical key that would silently reset every
 *    user's collapsed/expanded preference on next launch.
 */

import { loadFilterPanelCollapsed, saveFilterPanelCollapsed } from '../filterPanelPrefs';

const mockStorage: Record<string, string> = {};
let mockThrowOnGet = false;
let mockThrowOnSet = false;

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => {
      if (mockThrowOnGet) {
        mockThrowOnGet = false;
        return Promise.reject(new Error('boom'));
      }
      return Promise.resolve(key in mockStorage ? mockStorage[key] : null);
    }),
    setItem: jest.fn((key: string, value: string) => {
      if (mockThrowOnSet) {
        mockThrowOnSet = false;
        return Promise.reject(new Error('boom'));
      }
      mockStorage[key] = value;
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      delete mockStorage[key];
      return Promise.resolve();
    }),
  },
}));

const KEY = '@accessmap/filter_panel_collapsed_v1';

beforeEach(() => {
  for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  mockThrowOnGet = false;
  mockThrowOnSet = false;
  // Silence the helpful "[filterPanelPrefs] load/save failed" logs while
  // we're intentionally exercising the error paths.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('loadFilterPanelCollapsed', () => {
  it('returns false when nothing is stored (panel expanded by default)', async () => {
    expect(await loadFilterPanelCollapsed()).toBe(false);
  });

  it('returns true after saving true', async () => {
    await saveFilterPanelCollapsed(true);
    expect(await loadFilterPanelCollapsed()).toBe(true);
  });

  it('round-trips false', async () => {
    await saveFilterPanelCollapsed(false);
    expect(await loadFilterPanelCollapsed()).toBe(false);
  });

  it('returns false when AsyncStorage.getItem rejects', async () => {
    mockThrowOnGet = true;
    expect(await loadFilterPanelCollapsed()).toBe(false);
  });

  it('treats any non-"true" stored value as false (defensive)', async () => {
    // A future schema bump or a hand-edited key shouldn't accidentally
    // collapse the panel — only the canonical "true" string counts.
    mockStorage[KEY] = 'TRUE';
    expect(await loadFilterPanelCollapsed()).toBe(false);
    mockStorage[KEY] = '1';
    expect(await loadFilterPanelCollapsed()).toBe(false);
    mockStorage[KEY] = '';
    expect(await loadFilterPanelCollapsed()).toBe(false);
  });
});

describe('saveFilterPanelCollapsed', () => {
  it('writes the canonical key', async () => {
    await saveFilterPanelCollapsed(true);
    expect(mockStorage[KEY]).toBe('true');
    await saveFilterPanelCollapsed(false);
    expect(mockStorage[KEY]).toBe('false');
  });

  it('swallows storage errors (UI never throws)', async () => {
    mockThrowOnSet = true;
    await expect(saveFilterPanelCollapsed(true)).resolves.toBeUndefined();
  });
});
