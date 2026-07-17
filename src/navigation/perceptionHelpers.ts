import { Platform } from 'react-native';

/**
 * The Tasks tab badge's single definition and single writer (T16): how many OPEN
 * flags need attention, capped at 99, or undefined (no badge) at zero.
 * Global/unfiltered by design (S-7) — it must NOT become filter-aware, so it may
 * differ from a filtered "OPEN n" list header, but never from itself across a tab
 * transition. TasksScreen deliberately writes no badge; this is the only writer.
 *
 * Extracted from RootNavigator so the definition is unit-testable without loading
 * the native-heavy navigator tree (react-native-maps et al.).
 */
export function computeTasksBadge(flags: readonly { status: string }[]): number | undefined {
  const open = flags.filter((f) => f.status === 'open').length;
  return open > 0 ? Math.min(open, 99) : undefined;
}

/**
 * Web-only keyboard-focus isolation (T11 / F1-04, WCAG 2.4.3 Focus Order).
 * Mirror a tab scene's focus to the DOM `inert` flag — an INACTIVE scene becomes
 * inert (removed from the tab order + AT tree). React Navigation only marks
 * inactive scenes aria-hidden, which leaves their controls keyboard-focusable, so
 * a Map-screen keyboard user could Tab into the occluded Home controls. No-op on
 * native (focus is OS-drawn) and when the node isn't mounted.
 */
export function applySceneInert(node: { inert?: boolean } | null, isFocused: boolean): void {
  if (Platform.OS !== 'web') return;
  if (node) node.inert = !isFocused;
}
