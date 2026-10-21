# First-launch Lighthouse fixture

This audit covers the fresh, anonymous **Welcome to Flagstone** screen. It does
not prove login, location, map, backend, release readiness, or physical-device
accessibility. The existing Lighthouse recommended preset and score thresholds
remain in force.

The build script disables Expo dotenv loading, replaces inherited public Expo
settings, and supplies an obviously synthetic non-credential key with a loopback
URL. No Supabase project or backend credentials are required. The guard tests also
verify that runtime errors and attempted external requests cannot pass readiness. The app source and
release manifest are unchanged. This export is an audit fixture, never a deploy
artifact.

The export runs before LHCI starts its static server, avoiding the old server
readiness timeout while Metro builds. A Puppeteer readiness check then requires
the actual welcome dialog and its Skip/Next controls, fails on runtime or console
errors and external requests, and saves a screenshot plus a small receipt. LHCI
uses a fresh storage reset for its normal audit; the hook does not skip onboarding.
Source maps are exported for Lighthouse diagnostics. The audit uses measured
DevTools throttling with Lighthouse's default mobile profile: Lantern simulation
returned `NO_LCP` despite the visible first-launch screen. Measured throttling
produces a complete performance result without disabling audits or changing
thresholds. These measurements should not be compared directly with old simulated
scores. See the [Lighthouse throttling documentation](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md).
The request blocker applies to the readiness page; the audit's network trace is
separate evidence, not a claim of universal browser network isolation. Tool and browser revisions
are fixed by this directory's lockfile and Puppeteer version. CI pins the supported
Ubuntu 22.04 runner because Ubuntu 24.04's AppArmor policy prevented the downloaded
Chrome from starting. Browser sandboxing remains enabled; no host security policy
is modified.

From the repository root:

```sh
npm ci --legacy-peer-deps
npm ci --prefix .github/lighthouse --ignore-scripts
.github/lighthouse/node_modules/.bin/puppeteer browsers install chrome
node --test .github/lighthouse/fixture.test.cjs
node .github/lighthouse/build.cjs
NODE_PATH="$PWD/.github/lighthouse/node_modules" .github/lighthouse/node_modules/.bin/lhci collect
NODE_PATH="$PWD/.github/lighthouse/node_modules" .github/lighthouse/node_modules/.bin/lhci assert
```

These local collect/assert commands do not upload. The existing CI autorun
publishes the Lighthouse report to temporary-public-storage; GitHub also retains
first-launch proof and reports as an Actions artifact. No app environment secrets
should be added to this job. Unexpected product audit failures remain failures;
do not disable assertions to conceal them.

Rollback: revert the CI fixture commit. This restores the previous workflow and
configuration without changing app source, production services, or release status.
