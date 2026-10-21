module.exports = {
  ci: {
    collect: {
      staticDistDir: 'dist-lighthouse',
      puppeteerScript: '.github/lighthouse/ready.cjs',
      chromePath: require('./.github/lighthouse/node_modules/puppeteer').executablePath(),
      url: ['http://localhost:9001'],
      numberOfRuns: 1,
      // Lantern simulation returned NO_LCP for this rendered first-launch modal.
      // Measure with the same default mobile throttling profile instead.
      settings: { throttlingMethod: 'devtools' },
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
