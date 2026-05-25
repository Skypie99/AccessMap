/**
 * Tests for src/lib/taskSelection.ts — the pure bulk-select state helper
 * powering TasksScreen's selection mode.
 *
 * What we lock in:
 *  - `EMPTY_SELECTION` starts inactive with no ids.
 *  - `enterSelectionWith(id)` flips to active with that one id picked.
 *  - `toggleId` adds an absent id, removes a present one, and preserves
 *    the order of remaining ids.
 *  - `toggleId` is its own inverse (twice = same state).
 *  - `isSelected` matches what toggle just did.
 *  - `count` is the length of `selectedIds`.
 *  - `clearSelection` returns to inactive/empty regardless of input.
 *  - No helper mutates its input — important because state lives in
 *    React's `useState` and a stray mutation would skip re-renders.
 */
import {
  EMPTY_SELECTION,
  clearSelection,
  count,
  enterSelectionWith,
  isSelected,
  toggleId,
  type TaskSelectionState,
} from '../taskSelection';

describe('taskSelection', () => {
  describe('EMPTY_SELECTION', () => {
    it('starts inactive with no ids', () => {
      expect(EMPTY_SELECTION.active).toBe(false);
      expect(EMPTY_SELECTION.selectedIds).toEqual([]);
      expect(count(EMPTY_SELECTION)).toBe(0);
    });
  });

  describe('enterSelectionWith', () => {
    it('flips to active with a single id selected', () => {
      const state = enterSelectionWith('a');
      expect(state.active).toBe(true);
      expect(state.selectedIds).toEqual(['a']);
      expect(count(state)).toBe(1);
      expect(isSelected(state, 'a')).toBe(true);
      expect(isSelected(state, 'b')).toBe(false);
    });

    it('does not mutate any shared frozen state', () => {
      enterSelectionWith('a');
      expect(EMPTY_SELECTION.selectedIds).toEqual([]);
      expect(EMPTY_SELECTION.active).toBe(false);
    });
  });

  describe('toggleId', () => {
    it('adds an absent id to the end of the list', () => {
      const start = enterSelectionWith('a');
      const next = toggleId(start, 'b');
      expect(next.selectedIds).toEqual(['a', 'b']);
      expect(next.active).toBe(true);
    });

    it('removes a present id, keeping the rest in order', () => {
      const start: TaskSelectionState = {
        active: true,
        selectedIds: ['a', 'b', 'c'],
      };
      const next = toggleId(start, 'b');
      expect(next.selectedIds).toEqual(['a', 'c']);
    });

    it('toggling the same id twice yields the original selection (idempotent round trip)', () => {
      const start = enterSelectionWith('a');
      const added = toggleId(start, 'b');
      const removed = toggleId(added, 'b');
      expect(removed.selectedIds).toEqual(start.selectedIds);
      expect(removed.active).toBe(start.active);
    });

    it('preserves the order of the first-selected ids across many toggles', () => {
      let state = enterSelectionWith('first');
      state = toggleId(state, 'second');
      state = toggleId(state, 'third');
      state = toggleId(state, 'fourth');
      expect(state.selectedIds).toEqual(['first', 'second', 'third', 'fourth']);
      // remove a middle one — the rest hold their order
      state = toggleId(state, 'second');
      expect(state.selectedIds).toEqual(['first', 'third', 'fourth']);
      // re-add it — goes to the end, not back to its old spot
      state = toggleId(state, 'second');
      expect(state.selectedIds).toEqual(['first', 'third', 'fourth', 'second']);
    });

    it('does not mutate the input state or its array', () => {
      const start: TaskSelectionState = {
        active: true,
        selectedIds: ['a', 'b'],
      };
      const snapshot = [...start.selectedIds];
      toggleId(start, 'c');
      toggleId(start, 'a');
      expect(start.active).toBe(true);
      expect(start.selectedIds).toEqual(snapshot);
    });

    it('preserves `active` when toggling (caller controls mode entry/exit)', () => {
      // Hypothetical: inactive-but-with-ids shouldn't happen via normal
      // flow, but the helper still leaves `active` alone.
      const inactiveWithIds: TaskSelectionState = {
        active: false,
        selectedIds: ['a'],
      };
      expect(toggleId(inactiveWithIds, 'b').active).toBe(false);
    });
  });

  describe('isSelected', () => {
    it('reports membership correctly', () => {
      const state: TaskSelectionState = {
        active: true,
        selectedIds: ['a', 'c'],
      };
      expect(isSelected(state, 'a')).toBe(true);
      expect(isSelected(state, 'b')).toBe(false);
      expect(isSelected(state, 'c')).toBe(true);
    });

    it('returns false against an empty selection', () => {
      expect(isSelected(EMPTY_SELECTION, 'anything')).toBe(false);
    });
  });

  describe('count', () => {
    it('matches the length of selectedIds', () => {
      expect(count(EMPTY_SELECTION)).toBe(0);
      expect(count(enterSelectionWith('a'))).toBe(1);
      expect(
        count({ active: true, selectedIds: ['a', 'b', 'c'] }),
      ).toBe(3);
    });
  });

  describe('clearSelection', () => {
    it('returns the inactive empty state', () => {
      const start: TaskSelectionState = {
        active: true,
        selectedIds: ['a', 'b', 'c'],
      };
      const cleared = clearSelection(start);
      expect(cleared.active).toBe(false);
      expect(cleared.selectedIds).toEqual([]);
    });

    it('returns the inactive empty state even from EMPTY_SELECTION (no-op safe)', () => {
      const cleared = clearSelection(EMPTY_SELECTION);
      expect(cleared.active).toBe(false);
      expect(cleared.selectedIds).toEqual([]);
    });

    it('does not mutate the input state', () => {
      const start: TaskSelectionState = {
        active: true,
        selectedIds: ['a', 'b'],
      };
      clearSelection(start);
      expect(start.active).toBe(true);
      expect(start.selectedIds).toEqual(['a', 'b']);
    });
  });
});
