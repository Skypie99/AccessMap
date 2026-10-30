// Unused-JavaScript budget in KiB, enforced by scripts/check-unused-js-budget.mjs
// (a Lighthouse workflow step right after `lhci autorun`). See the note at the
// 'unused-javascript' assertion below. It may only go down.
const UNUSED_JAVASCRIPT_BUDGET_KIB = 135;

module.exports = {
  UNUSED_JAVASCRIPT_BUDGET_KIB,
  ci: {
    collect: {
      // The web export is built by the workflow BEFORE this server starts.
      // Previously `npx expo export` ran inside startServerCommand: Metro takes
      // far longer than LHCI's ready timeout (10s default), the timeout fired
      // while the export was still bundling, and Lighthouse audited port 9001
      // while nothing was listening yet — Chrome showed an error interstitial
      // and every run failed with CHROME_INTERSTITIAL_ERROR. `serve` announces
      // readiness with "Accepting connections at ...", which the default
      // pattern (/listen|ready/i) never matches either, so name it explicitly.
      startServerCommand: 'npx serve dist -p 9001',
      startServerReadyPattern: 'accepting connections',
      startServerReadyTimeout: 30000,
      url: ['http://localhost:9001'],
      numberOfRuns: 1,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Accessibility: strict (we care a lot)
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // Performance: warn (acceptable range for map app)
        'categories:performance': ['warn', { minScore: 0.6 }],
        // Best practices
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        // SEO: lower bar (it's an app, not a public website)
        'categories:seo': ['warn', { minScore: 0.7 }],

        // ------------------------------------------------------------------
        // ENFORCEMENT CHANGE — REQUIRES OWNER APPROVAL BEFORE ANY PUSH
        // (prepared 2026-10-22, Flagstone QA closeout; not yet approved)
        //
        // Exactly three `lighthouse:recommended` preset assertions are
        // disabled because Lighthouse 12.1.0's TraceElements gatherer crashed
        // before the audits could run on this page:
        //   Dependency "RootCauses" failed with exception:
        //   Cannot read properties of undefined (reading 'frame_sequence')
        // Each audit therefore returned scoreDisplayMode 'error' with no
        // value, and LHCI reports: "Audit did not produce a value at all.
        // 'minScore' might not be a valid assertion for this audit." An
        // assertion on a no-value audit can never pass and enforces nothing.
        // Evidence: Lighthouse run 39755992084 on commit 65471ff1 (2026-10-22);
        // see the Flagstone QA closeout record (2026-10-22).
        // Re-enable these three once the upstream gatherer is fixed.
        //
        // Deliberately NOT disabled: the three genuine, measured findings —
        // font-display (0.5), unused-javascript (647 KB of 903 KB AppEntry
        // wasted), valid-source-maps (0) — keep failing honestly at preset
        // severity and are tracked as open quality debt (QUALITY-DEBT-RECORD
        // 2026-10-22) for the future website performance workstream.
        // (unused-javascript has since moved to a byte budget; see below.)
        // The preset and all four category thresholds above are unchanged.
        'lcp-lazy-loaded': 'off',
        'non-composited-animations': 'off',
        'prioritize-lcp-image': 'off',

        // ------------------------------------------------------------------
        // unused-javascript: BYTE BUDGET — owner-approved 2026-10-29.
        //
        // The preset fails any script with more than 20 KiB of unused code
        // (transfer-size bytes). This entry cannot get there: measured
        // 2026-10-29 with this workflow's build, a welcome-only entry with
        // Supabase removed still left 85 KiB unused, of which react-dom alone
        // was about 20 KiB, and the react-native-web / Expo runtime most of
        // the rest. So the assertion stays visible here as a warning, and
        // the error-level gate is UNUSED_JAVASCRIPT_BUDGET_KIB (top of this
        // file): the audit's total unused bytes as measured in CI for the
        // full app on 2026-10-29 (137,841 bytes, Lighthouse run 40845308555
        // on PR #38), rounded up to the next KiB with no headroom. The
        // budget may only go down: lower it when a change ships less unused
        // code, never raise it to make a check pass.
        'unused-javascript': ['warn', { maxLength: 0 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
