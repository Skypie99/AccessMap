import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootTabParamList } from '@/navigation/RootNavigator';

/**
 * Per-user UI preferences that live entirely on-device.
 *
 * These are intentionally NOT in `public.users` — they're UX shape, not data
 * the server cares about. Keep them here so a missing column or RLS hiccup
 * never blocks the app rendering.
 *
 * Keys are namespaced + versioned so a future revamp can bump _v1 → _v2 and
 * safely re-default without touching unrelated storage.
 */

const DEFAULT_TAB_KEY_PREFIX = '@accessmap/default_tab_v1:';

export type DefaultTab = keyof RootTabParamList;
export const DEFAULT_TABS: DefaultTab[] = ['Map', 'Tasks', 'Profile'];

function defaultTabKey(userId: string): string {
  return `${DEFAULT_TAB_KEY_PREFIX}${userId}`;
}

function isDefaultTab(v: unknown): v is DefaultTab {
  return v === 'Map' || v === 'Tasks' || v === 'Profile';
}

/**
 * Resolves to the user's chosen landing tab, or 'Map' as a safe default.
 * Defensive on storage errors: returns 'Map' rather than throwing.
 */
export async function getDefaultTab(userId: string): Promise<DefaultTab> {
  try {
    const value = await AsyncStorage.getItem(defaultTabKey(userId));
    return isDefaultTab(value) ? value : 'Map';
  } catch {
    return 'Map';
  }
}

export async function setDefaultTab(
  userId: string,
  tab: DefaultTab,
): Promise<void> {
  try {
    await AsyncStorage.setItem(defaultTabKey(userId), tab);
  } catch {
    // Ignore — worst case the user picks again next time.
  }
}
