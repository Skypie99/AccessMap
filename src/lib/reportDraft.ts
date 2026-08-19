/**
 * reportDraft — the guest→sign-in draft stash (A11Y-226, WCAG 3.3.7
 * Redundant Entry).
 *
 * THE DEFECT THIS CLOSES. A guest fills the report form (category, severity,
 * description, photos, context tags) and taps the anon banner's "Sign in".
 * Signing in swaps <RootNavigator/> (guest tree) for <SignedInArea/> at the
 * same position in App.tsx's Gate — React unmounts the guest tree, and the
 * draft, which lives only in ReportFlagModal component state, dies with it.
 * The user re-entered everything. Reporting is the app's core act and the
 * guest is the App-Review cohort.
 *
 * WHY IN-MEMORY, DELIBERATELY. A draft can describe a real location and a
 * real barrier near the user. It never touches AsyncStorage/disk — the stash
 * lives in module scope, which survives the Gate tree swap (same JS runtime)
 * and dies with the app process. Privacy-by-default beats convenience here;
 * a restart losing an unsubmitted draft is the pre-existing behavior.
 *
 * CONSUME-ONCE. `take` clears on read — the App.tsx `takePendingUrl` precedent
 * — so a stale draft can't resurrect into a later, unrelated session of the
 * form. Photo URIs stay valid across the swap: web blob: URLs are only revoked
 * post-settle (removeUri / reset — see ReportFlagModal's L7 note) and native
 * file:// URIs are cache files no unmount deletes.
 */
import type { FlagCategory, FlagSeverity } from '@/types/database';
import type { ContextTag } from '@/lib/contextTags';

export interface ReportDraft {
  category: FlagCategory;
  severity: FlagSeverity;
  description: string;
  photoUris: string[];
  contextTags: ContextTag[];
  /** Picker-reported dimensions per uri (B8) — rides along so the
   *  downscale-on-ingest math survives the handoff too. */
  photoDims: Record<string, { width: number; height: number }>;
  /** Per-uri VoiceOver descriptions (photo_alt feature, 2026-08-19). */
  photoAlts: Record<string, string>;
}

let stash: ReportDraft | null = null;

/** Called by the anon banner's "Sign in" press, right before onClose. */
export function stashReportDraft(draft: ReportDraft): void {
  stash = draft;
}

/** Consume-once: returns the stashed draft and clears it. */
export function takeReportDraft(): ReportDraft | null {
  const draft = stash;
  stash = null;
  return draft;
}
