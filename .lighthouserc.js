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
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
