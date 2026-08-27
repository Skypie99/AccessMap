import { InteractionManager, type AppStateStatus } from 'react-native';
import type { SharedModalKey } from '@/lib/sharedModalsContext';

interface PushEducationGateState {
  pending: boolean;
  appState: AppStateStatus;
  sharedModalOpen: SharedModalKey;
  drawerOpen: boolean;
}

export interface CancellableInteractionTask {
  cancel: () => void;
}

/** A tab press may offer education only when no competing surface owns focus. */
export function canOfferPushEducation(state: PushEducationGateState): boolean {
  return (
    state.pending &&
    state.appState === 'active' &&
    state.sharedModalOpen === null &&
    !state.drawerOpen
  );
}

/**
 * Queue the offer behind the tab/navigation interaction, then recheck every
 * gate. The auth consumer supplies the atomic spend, so multiple queued tasks
 * are safe: the first consumes and the rest become no-ops.
 */
export function schedulePushEducationAfterTabPress(
  getState: () => PushEducationGateState,
  consume: () => Promise<void>,
  onSettled: () => void = () => {},
  runAfterInteractions: typeof InteractionManager.runAfterInteractions =
    InteractionManager.runAfterInteractions,
): CancellableInteractionTask | null {
  if (!canOfferPushEducation(getState())) return null;
  return runAfterInteractions(() => {
    onSettled();
    if (canOfferPushEducation(getState())) void consume();
  });
}
