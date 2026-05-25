/**
 * tasksScope — AsyncStorage-backed persistence for the Tasks screen's
 * "All / Mine" toggle (the `mineOnly` flag).
 *
 * The key is versioned (`_v1`) so that if the schema ever needs to change
 * we can bump the version and start fresh without old data causing bugs.
 *
 * Both functions fail-soft: load() returns false (the safe default "show all")
 * on any error; save() logs a warning but does not throw.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

const KEY = '@accessmap/tasks_scope_v1';

/** Load persisted "mine only" flag. Returns false on any failure. */
export async function loadScope(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return false;
    return raw === 'true';
  } catch (e) {
    console.warn('[tasksScope] load failed:', errorMessage(e, 'AsyncStorage error.'));
    return false;
  }
}

/** Persist "mine only" flag. Fire-and-forget; swallow errors. */
export async function saveScope(mineOnly: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(mineOnly));
  } catch (e) {
    console.warn('[tasksScope] save failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
