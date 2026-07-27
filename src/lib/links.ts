/**
 * External URLs the app links out to.
 *
 * Why a constant and not `Constants.expoConfig?.privacyPolicyUrl`:
 * `privacyPolicyUrl` is a legacy Expo key and is NOT part of the `ExpoConfig`
 * type, so reading it through expo-constants is a TS2339 error — and
 * `npm run typecheck` is a hard gate. A URL is configuration, not copy, so
 * pinning it here is safe; `appConfig.guard.test.ts` asserts it stays
 * byte-identical to app.json's value so the two can never drift.
 */
import { Linking } from 'react-native';
import { notify } from './confirm';

/**
 * The published privacy policy. Apple 5.1.1(i) requires this to be reachable
 * BOTH from App Store Connect metadata and from inside the app — app.json
 * alone only satisfies the metadata half.
 */
export const PRIVACY_POLICY_URL = 'https://skypie99.github.io/AccessMap/privacy/';

/**
 * Open an external URL, surfacing a failure instead of swallowing it.
 *
 * Mirrors the shipped pattern at FlagDetailModal.tsx:1246-1251 (try/catch →
 * notify). `notify` is the platform-aware shim, so this behaves on web too,
 * where a bare Alert.alert is a silent no-op — a dead link row that says
 * nothing is exactly the SR-041/SR-094 failure shape.
 */
export async function openExternalUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    notify("Couldn't open the link", url);
  }
}
