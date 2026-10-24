// Native: one bundle ships every screen, so the navigator is not a separate
// download — this is a straight re-export and the two loaders are no-ops.
// Web resolves AppNavigator.web.tsx instead; it explains the split.
export { default } from './RootNavigator';

export function preloadAppNavigator(): Promise<unknown> {
  return Promise.resolve();
}

export function prefetchAppNavigatorOnEngagement(): () => void {
  return () => {};
}
