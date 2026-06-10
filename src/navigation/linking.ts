import { Linking } from 'react-native';

/**
 * Consume-once getter for a deep link captured while no NavigationContainer
 * was mounted (L8). App.tsx's Gate owns the ref behind this: a warm
 * accessmap://flag/{id} link that arrives while the user is parked on the
 * native sign-in screen fires RN's 'url' event with nobody listening —
 * React Navigation only attaches its own listener once the container
 * mounts, and Linking.getInitialURL() replays COLD-start URLs only, so the
 * link would be silently dropped. Gate stores it; RootNavigator hands the
 * getter to createLinking below so the container picks it up on mount.
 * Returning null means "nothing pending" — must clear on read so a stale
 * link can't re-fire on a later sign-out → sign-in cycle.
 */
export type TakePendingUrl = () => string | null;

/**
 * Deep-link config factory. Registers accessmap://flag/{id} (matches the URL
 * the Share-flag button on FlagDetailModal emits via src/lib/shareFlag.ts,
 * and the scheme is already declared in app.json). React Navigation's
 * built-in `linking` uses RN's own Linking API, so no expo-linking
 * dependency needed.
 *
 * A factory (rather than the old module-level const) so the Gate can thread
 * its pending-URL getter in; RootNavigator builds the object ONCE per mount
 * (NavigationContainer reads `linking` on mount only).
 */
export function createLinking(takePendingUrl?: TakePendingUrl) {
  return {
    prefixes: ['accessmap://'],
    config: {
      screens: {
        // The :flagId path segment maps to params.flagId on the Map screen.
        // MapScreen reads it and runs fetchFlagById + animateTo + showCallout.
        // Optional (`?`, L10): the Map route is also reached with NO flagId —
        // a required segment made getPathFromState serialize the paramless
        // route as /flag/undefined in the web address bar.
        Map: 'flag/:flagId?',
      },
    },
    // L8: a URL captured while signed out wins over the cold-start URL;
    // otherwise defer to the platform as before.
    getInitialURL: async () => takePendingUrl?.() ?? Linking.getInitialURL(),
  };
}
