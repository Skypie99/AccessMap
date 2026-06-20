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
// The selectable landing tabs (the visible 3-tab bar, Phase 7a). 'Map'
// became 'Home' — see the migration in getDefaultTab.
export const DEFAULT_TABS: DefaultTab[] = ['Home', 'Tasks', 'Profile'];

function defaultTabKey(userId: string): string {
  return `${DEFAULT_TAB_KEY_PREFIX}${userId}`;
}

function isDefaultTab(v: unknown): v is DefaultTab {
  return v === 'Home' || v === 'Tasks' || v === 'Profile';
}

/**
 * Resolves to the user's chosen landing tab, or 'Home' as a safe default.
 * Defensive on storage errors: returns 'Home' rather than throwing.
 *
 * Phase 7a migration: the old 'Map' tab is now 'Home' (the full map became a
 * hidden route reached from Home). A stored 'Map' preference maps to 'Home' so
 * existing users keep a valid landing tab. Read-time only — we don't rewrite
 * storage, since 'Map' always resolves to 'Home' anyway.
 */
export async function getDefaultTab(userId: string): Promise<DefaultTab> {
  try {
    const value = await AsyncStorage.getItem(defaultTabKey(userId));
    if (value === 'Map') return 'Home';
    return isDefaultTab(value) ? value : 'Home';
  } catch {
    return 'Home';
  }
}

export async function setDefaultTab(userId: string, tab: DefaultTab): Promise<void> {
  try {
    await AsyncStorage.setItem(defaultTabKey(userId), tab);
  } catch {
    // Ignore — worst case the user picks again next time.
  }
}
