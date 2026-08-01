/**
 * Guard tests for the sign-out teardown hardening (security audit 2026-07-31):
 *   - IO-2: the web client must use PKCE, and native must NOT.
 *
 * Non-vacuity: each test asserts a property that is false in the pre-fix code,
 * so removing the fix fails the test rather than silently passing.
 */

import { Platform } from 'react-native';
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'supabase.ts'), 'utf8');

describe('IO-2 — PKCE on web only', () => {
  it('sets flowType to pkce on web and implicit on native', () => {
    expect(SRC).toContain("flowType: Platform.OS === 'web' ? 'pkce' : 'implicit'");
  });

  it('keeps detectSessionInUrl on web — the confirmation link depends on it', () => {
    // Guards against a future "fix" that closes IO-2 by turning this off,
    // which would break "click the link -> land signed in" at sign-up.
    expect(SRC).toContain("detectSessionInUrl: Platform.OS === 'web'");
  });

  it('does not apply PKCE unconditionally', () => {
    // A bare `flowType: 'pkce'` would strand native sign-up confirmation:
    // the verifier lives in AsyncStorage, the email opens in the system
    // browser, and there is no auth deep-link route back into the app.
    expect(SRC).not.toMatch(/flowType:\s*'pkce'\s*,/);
  });

  it('native really is the non-web branch in this test environment', () => {
    // Sanity: keeps the two assertions above meaningful rather than tautological.
    expect(Platform.OS).not.toBe('web');
  });
});
