// Native: one bundle ships every screen, so the navigator is not a separate
// download — this is a straight re-export and preloadAppNavigator is a no-op.
// Web resolves AppNavigator.web.tsx instead; it explains the split.
export { default } from './RootNavigator';

export function preloadAppNavigator(): Promise<unknown> {
  return Promise.resolve();
}
