import type { InteractionManager } from 'react-native';
import {
  canOfferPushEducation,
  schedulePushEducationAfterTabPress,
} from '../postSignInPushGate';

const eligible = {
  pending: true,
  appState: 'active' as const,
  sharedModalOpen: null,
  drawerOpen: false,
};

describe('post-sign-in push education navigation gate', () => {
  it.each([
    ['no pending attempt', { ...eligible, pending: false }],
    ['inactive app', { ...eligible, appState: 'background' as const }],
    ['shared modal open', { ...eligible, sharedModalOpen: 'feedback' as const }],
    ['drawer open', { ...eligible, drawerOpen: true }],
  ])('rejects %s', (_label, state) => {
    expect(canOfferPushEducation(state)).toBe(false);
  });

  it('accepts an active, unobstructed pending tab interaction', () => {
    expect(canOfferPushEducation(eligible)).toBe(true);
  });

  it('does not schedule work when the tab press is initially ineligible', () => {
    const runAfterInteractions = jest.fn();
    const consume = jest.fn(async () => {});

    const task = schedulePushEducationAfterTabPress(
      () => ({ ...eligible, drawerOpen: true }),
      consume,
      undefined,
      runAfterInteractions as unknown as typeof InteractionManager.runAfterInteractions,
    );

    expect(task).toBeNull();
    expect(runAfterInteractions).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it('waits for interactions and rechecks the live gates before consuming', () => {
    let state = { ...eligible };
    let queued: (() => void) | null = null;
    const cancel = jest.fn();
    const runAfterInteractions = jest.fn((callback: () => void) => {
      queued = callback;
      return { cancel };
    });
    const consume = jest.fn(async () => {});

    const task = schedulePushEducationAfterTabPress(
      () => state,
      consume,
      undefined,
      runAfterInteractions as unknown as typeof InteractionManager.runAfterInteractions,
    );
    expect(task).not.toBeNull();
    expect(consume).not.toHaveBeenCalled();

    state = { ...state, sharedModalOpen: 'feedback' };
    if (!queued) throw new Error('interaction callback was not queued');
    queued();
    expect(consume).not.toHaveBeenCalled();
  });

  it('consumes once the settled interaction remains eligible', () => {
    let queued: (() => void) | null = null;
    const runAfterInteractions = jest.fn((callback: () => void) => {
      queued = callback;
      return { cancel: jest.fn() };
    });
    const consume = jest.fn(async () => {});

    schedulePushEducationAfterTabPress(
      () => eligible,
      consume,
      undefined,
      runAfterInteractions as unknown as typeof InteractionManager.runAfterInteractions,
    );
    if (!queued) throw new Error('interaction callback was not queued');
    queued();

    expect(consume).toHaveBeenCalledTimes(1);
  });
});
