module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npx expo export --platform web && npx serve web-build -p 9001',
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
