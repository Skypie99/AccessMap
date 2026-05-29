import AsyncStorage from '@react-native-async-storage/async-storage';
import { errorMessage } from './errors';

/**
 * Heat-map visibility toggle — on-device only.
 *
 * Device-wide (not user-keyed) for the same reason as filterPanelPrefs:
 * the toggle is an ergonomics knob, not personal data. Defaults to
 * `false` (heat layer hidden) so a fresh map opens with just the pins,
 * matching Dani's design compile guidance ("don't obscure markers on
 * first load").
 */

const STORAGE_KEY = '@accessmap/heatmap_enabled_v1';

export async function loadHeatmapEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw === 'true';
  } catch (e) {
    console.warn('[heatmapPrefs] load failed:', errorMessage(e, 'AsyncStorage error.'));
    return false;
  }
}

export async function saveHeatmapEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn('[heatmapPrefs] save failed:', errorMessage(e, 'AsyncStorage error.'));
  }
}
