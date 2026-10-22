module.exports = {
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
        // The preset and all four category thresholds above are unchanged.
        'lcp-lazy-loaded': 'off',
        'non-composited-animations': 'off',
        'prioritize-lcp-image': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
