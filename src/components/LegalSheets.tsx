/**
 * `useLegalSheets` — Privacy / Terms opened from INSIDE another modal.
 *
 * ─── THE BUG THIS EXISTS TO FIX ───────────────────────────────────────────
 * iOS refuses to present a second modal from a view controller that is already
 * presenting one. `SharedModalsHost` mounts PrivacyScreen and TermsScreen as
 * SIBLINGS of the tab navigator, so they present from the ROOT view
 * controller. That is correct from a tab screen (Settings), and broken from
 * anywhere already covered by a modal — About, the report sheets, the
 * blocked-content alerts. Tapping the link did nothing at all. Captured on an
 * iPhone 17 Pro simulator, 2026-08-19, one line per dead tap:
 *
 *   [com.apple.UIKit:Presentation] Attempt to present <RCTModalHostViewController>
 *   on <UIViewController: 0x1130a9800> (from <UIViewController: 0x1130a9800>)
 *   which is already presenting <RCTModalHostViewController: 0x133c15e00>.
 *
 * ⚑ The comment in RootNavigator.tsx asserted the opposite — "Native does not
 * care: a pageSheet is its own UIKit scene and the last-presented modal is on
 * top regardless of tree position." That is false, and the mount-ORDER fix it
 * describes only ever fixed web (where two modals are same-z-index fixed divs
 * and the later sibling wins). Web was fine throughout; native never was.
 *
 * ─── THE FIX, AND WHY IT IS THIS ONE ──────────────────────────────────────
 * Mount the sheet INSIDE the surface that opens it. A presented view
 * controller may itself present, so the sheet now presents from ITS OWN
 * modal's VC rather than from the occupied root — and About stays open
 * beneath it, which is the behaviour §SKY-6 asked for in the first place.
 *
 * This is not a new pattern. SignInScreen has mounted both sheets locally
 * since B-3, for a different reason (it lives outside SharedModalsProvider
 * entirely), and both open correctly there on device — that working surface is
 * what identified the shape of the fix. This hook is that same arrangement,
 * factored so an adopting surface spends two lines instead of re-deriving the
 * wiring five times.
 *
 * ─── WHAT STAYS ON THE SHARED HOST ────────────────────────────────────────
 * SettingsScreen. It is a tab screen, nothing is presenting over the root when
 * its rows fire, so `setOpen('privacy')` is correct there and keeps the single
 * shared instance. Only surfaces that are THEMSELVES modals need this hook.
 *
 * Usage:
 *   const legal = useLegalSheets();
 *   <Pressable onPress={legal.openTerms}>…</Pressable>
 *   {legal.sheets}   // last child, inside the host modal
 */
import React, { useCallback, useMemo, useState } from 'react';
import PrivacyScreen from '@/screens/PrivacyScreen';
import TermsScreen from '@/screens/TermsScreen';

type LegalSheet = 'privacy' | 'terms' | null;

export interface LegalSheets {
  /** Open the privacy policy over the host surface. */
  openPrivacy: () => void;
  /** Open the terms + community guidelines over the host surface. */
  openTerms: () => void;
  /** Render LAST inside the host modal, so the sheets present from its VC. */
  sheets: React.ReactNode;
}

export function useLegalSheets(): LegalSheets {
  const [open, setOpen] = useState<LegalSheet>(null);

  const close = useCallback(() => setOpen(null), []);
  const openPrivacy = useCallback(() => setOpen('privacy'), []);
  const openTerms = useCallback(() => setOpen('terms'), []);

  // Both stay mounted with visible=false, exactly as they do on the shared
  // host — a hidden Modal renders nothing, so this costs no view hierarchy.
  const sheets = useMemo(
    () => (
      <>
        <PrivacyScreen visible={open === 'privacy'} onClose={close} />
        <TermsScreen visible={open === 'terms'} onClose={close} />
      </>
    ),
    [open, close],
  );

  return { openPrivacy, openTerms, sheets };
}
