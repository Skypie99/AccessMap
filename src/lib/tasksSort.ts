/**
 * Tasks-screen sort options — pure ordering for the FlagRow list shown
 * in TasksScreen, plus an AsyncStorage-backed preference for the user's
 * last-chosen mode. The order applies WITHIN each section (Open /
 * Verified) so the Open-first grouping in TasksScreen is preserved.
 *
 * Stored device-wide (not per-user) because Tasks sort is a UI affordance,
 * not user data — every account on the same device sees the same default.
 * Storage key: `@accessmap/tasks_sort_v1` — version bump on shape change.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';
import type { FlagRow } from '@/types/database';

/**
 * Sort modes the segmented control exposes.
 * - `newest`  — most recent first (current default behavior).
 * - `oldest`  — oldest first; useful for triaging long-pending reports.
 * - `severity` — highest severity first; tiebreaker = most recent.
 */
export type TasksSort = 'newest' | 'oldest' | 'severity';

export const DEFAULT_TASKS_SORT: TasksSort = 'newest';

export const TASKS_SORT_LABELS: Record<TasksSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  severity: 'Severity',
};

export const TASKS_SORT_ORDER: TasksSort[] = ['newest', 'oldest', 'severity'];

const STORAGE_KEY = '@accessmap/tasks_sort_v1';

function isValidSort(v: unknown): v is TasksSort {
  return v === 'newest' || v === 'oldest' || v === 'severity';
}

/**
 * Pure: return a new array sorted per the chosen mode. Does NOT mutate
 * the input. Stable for ties — uses the original index as a deterministic
 * secondary key so two flags with the same created_at don't shuffle on
 * every render.
 */
export function sortFlags(flags: FlagRow[], mode: TasksSort): FlagRow[] {
  // Carry the original index so the sort is stable across re-renders
  // even when two rows compare equal on the primary key.
  const indexed = flags.map((f, i) => ({ f, i }));
  switch (mode) {
    case 'newest':
      indexed.sort((a, b) => {
        const ta = Date.parse(a.f.created_at);
        const tb = Date.parse(b.f.created_at);
        if (tb !== ta) return tb - ta;
        return a.i - b.i;
      });
      break;
    case 'oldest':
      indexed.sort((a, b) => {
        const ta = Date.parse(a.f.created_at);
        const tb = Date.parse(b.f.created_at);
        if (ta !== tb) return ta - tb;
        return a.i - b.i;
      });
      break;
    case 'severity':
      indexed.sort((a, b) => {
        if (b.f.severity !== a.f.severity) return b.f.severity - a.f.severity;
        // Tiebreaker: newer first within the same severity, so the user's
        // attention lands on recent high-severity reports first.
        const ta = Date.parse(a.f.created_at);
        const tb = Date.parse(b.f.created_at);
        if (tb !== ta) return tb - ta;
        return a.i - b.i;
      });
      break;
  }
  return indexed.map((x) => x.f);
}

export async function loadTasksSort(): Promise<TasksSort> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TASKS_SORT;
    const parsed: unknown = JSON.parse(raw);
    return isValidSort(parsed) ? parsed : DEFAULT_TASKS_SORT;
  } catch (e) {
    console.warn(
      '[tasksSort] load failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
    return DEFAULT_TASKS_SORT;
  }
}

export async function saveTasksSort(mode: TasksSort): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(mode));
  } catch (e) {
    console.warn(
      '[tasksSort] save failed:',
      errorMessage(e, 'AsyncStorage error.'),
    );
  }
}
