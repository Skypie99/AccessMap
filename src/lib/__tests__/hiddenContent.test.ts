/**
 * Apple 1.2(c) — the hide list. The one Guideline 1.2 leg this phase closes.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearHidden,
  filterHidden,
  hideContent,
  loadHidden,
  unhideContent,
} from '../hiddenContent';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.restoreAllMocks();
});

describe('the hide list round-trips', () => {
  it('starts empty', async () => {
    await expect(loadHidden()).resolves.toEqual({ flag: [], comment: [], author: [] });
  });

  it('hides a flag and reads it back', async () => {
    await hideContent('flag', 'f1');
    await expect(loadHidden()).resolves.toEqual({ flag: ['f1'], comment: [], author: [] });
  });

  it('keeps flags and comments in separate buckets', async () => {
    await hideContent('flag', 'x');
    await hideContent('comment', 'x'); // same id, different kind
    const hidden = await loadHidden();
    expect(hidden.flag).toEqual(['x']);
    expect(hidden.comment).toEqual(['x']);
  });

  it('is idempotent — hiding twice does not duplicate', async () => {
    await hideContent('flag', 'f1');
    await hideContent('flag', 'f1');
    await expect(loadHidden()).resolves.toEqual({ flag: ['f1'], comment: [], author: [] });
  });

  it('un-hides, so the choice is reversible', async () => {
    await hideContent('flag', 'f1');
    await hideContent('flag', 'f2');
    await unhideContent('flag', 'f1');
    await expect(loadHidden()).resolves.toEqual({ flag: ['f2'], comment: [], author: [] });
  });

  it('clears everything', async () => {
    await hideContent('flag', 'f1');
    await clearHidden();
    await expect(loadHidden()).resolves.toEqual({ flag: [], comment: [], author: [] });
  });
});

describe('reads fail toward showing MORE, never less', () => {
  it('a corrupt stored value reads as nothing hidden', async () => {
    await AsyncStorage.setItem('@accessmap/hidden_content_v1', 'not json{{');
    await expect(loadHidden()).resolves.toEqual({ flag: [], comment: [], author: [] });
  });

  it('a storage read failure reads as nothing hidden', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'));
    await expect(loadHidden()).resolves.toEqual({ flag: [], comment: [], author: [] });
  });

  it('a non-string entry is dropped rather than trusted', async () => {
    await AsyncStorage.setItem('@accessmap/hidden_content_v1', JSON.stringify({ flag: ['ok', 7, null] }));
    await expect(loadHidden()).resolves.toEqual({ flag: ['ok'], comment: [], author: [] });
  });
});

describe('writes surface their failure', () => {
  it('hideContent throws so the caller can tell the user it did not stick', async () => {
    // A hide that silently fails is the worst outcome for this feature: the
    // user has just said "never show me this" and been quietly ignored.
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
    await expect(hideContent('flag', 'f1')).rejects.toThrow('disk full');
  });
});

describe('filterHidden', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const idOf = (r: { id: string }) => r.id;

  it('drops hidden rows', () => {
    expect(filterHidden(rows, ['b'], idOf)).toEqual([{ id: 'a' }, { id: 'c' }]);
  });

  it('returns the SAME array reference when nothing is hidden', () => {
    // Identity matters: this runs on every render of the flag list, and a new
    // array each time would defeat FlatList's memoisation.
    expect(filterHidden(rows, [], idOf)).toBe(rows);
  });

  it('handles hiding everything', () => {
    expect(filterHidden(rows, ['a', 'b', 'c'], idOf)).toEqual([]);
  });
});
