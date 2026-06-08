/**
 * Bulk-select state for the Tasks screen.
 *
 * Pure, immutable helpers — no React, no AsyncStorage, no platform deps.
 * Selection is component-local (resets on tab change), so it just lives
 * in a `useState<TaskSelectionState>` inside TasksScreen and never gets
 * persisted.
 *
 * The shape is deliberately simple:
 *  - `active` is the gate. While false, the screen behaves normally —
 *    a card tap navigates to the Map; a long-press enters selection mode.
 *  - `selectedIds` is an ordered list of flag IDs. Order is the order the
 *    user picked them (first-selected appears first). De-duped — toggling
 *    the same id twice removes it; toggling once more re-adds it at the
 *    end.
 *
 * Every helper returns a brand-new state (or value); none mutate the input.
 * That keeps React happy and makes the helpers trivial to test.
 */

export interface TaskSelectionState {
  /** When false, the rest of the screen behaves as a normal Tasks list. */
  readonly active: boolean;
  /** Ordered, de-duped list of flag IDs the user has selected. */
  readonly selectedIds: readonly string[];
}

/**
 * The starting state. Frozen so a stray mutation surfaces loudly in dev
 * instead of silently leaking shared state between renders.
 */
export const EMPTY_SELECTION: TaskSelectionState = Object.freeze({
  active: false,
  selectedIds: Object.freeze([]) as readonly string[],
});

/**
 * Toggle a flag's membership in the current selection.
 *
 * Contract:
 *  - If `id` is NOT currently selected → append it to the end (so the
 *    visual / SR order matches pick order).
 *  - If `id` IS currently selected → remove it (preserving the order of
 *    everything else).
 *  - Always returns a new state object — never mutates `state` or its
 *    `selectedIds` array.
 *  - `active` is preserved. (Entering selection mode is the caller's
 *    job — see `enterSelectionWith`.)
 */
export function toggleId(state: TaskSelectionState, id: string): TaskSelectionState {
  const idx = state.selectedIds.indexOf(id);
  if (idx === -1) {
    return {
      active: state.active,
      selectedIds: [...state.selectedIds, id],
    };
  }
  return {
    active: state.active,
    selectedIds: state.selectedIds.filter((existing) => existing !== id),
  };
}

/**
 * Reset back to the empty / inactive state. Used on Cancel and after a
 * bulk action finishes so the screen returns to normal behavior.
 *
 * Returns `EMPTY_SELECTION` directly — it's frozen, so it's safe to
 * hand out the same reference every time.
 */
export function clearSelection(_state: TaskSelectionState): TaskSelectionState {
  return EMPTY_SELECTION;
}

/**
 * Enter selection mode with a single id already picked. This is the
 * canonical "long-press a card to start selecting" transition.
 *
 * Returns a fresh state — never mutates anything.
 */
export function enterSelectionWith(id: string): TaskSelectionState {
  return {
    active: true,
    selectedIds: [id],
  };
}

/** True when `id` is currently in the selection. O(n) but n is tiny. */
export function isSelected(state: TaskSelectionState, id: string): boolean {
  return state.selectedIds.includes(id);
}

/** How many ids are currently selected. Convenience for `"Verify (N)"` labels. */
export function count(state: TaskSelectionState): number {
  return state.selectedIds.length;
}
