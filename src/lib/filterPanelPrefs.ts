import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

/**
 * Filter panel collapsed/expanded state — on-device only.
 *
 * Device-wide (not user-keyed) because the filter panel UI shape is a
 * sighted-user ergonomics choice, not personal data. Sharing across
 * accounts on the same device is fine. Two-key pattern (separate from
 * mapFilters.ts and filterSets.ts) so the panel state can be read/written
 * without touching the filter values themselves — see LEARNINGS.md.
 *
 * Default is `false` (panel expanded) so a brand-new user sees the full
 * filter UI on first open and discovers the collapse affordance.
 */

const STORAGE_KEY = '@accessmap/filter_panel_collapsed_v1';

export async function loadFilterPanelCollapsed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch (e) {
    console.warn('[filterPanelPrefs] load failed:', errorMessage(e, 'AsyncStorage error.'));
    return false;
  }
}

export async function saveFilterPanelCollapsed(collapsed: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, collapsed ? 'true' : 'false');
  } catch (e) {
    console.warn('[filterPanelPrefs] save failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
