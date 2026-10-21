const assert = require('node:assert/strict');
const { test } = require('node:test');
const { fixtureEnvironment } = require('./build.cjs');

test('first-launch build discards inherited public services and disables dotenv', () => {
  const parent = {
    PATH: '/fixture/bin',
    EXPO_PUBLIC_SUPABASE_URL: 'https://example.invalid',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: 'synthetic-parent-value',
    EXPO_PUBLIC_MAP_TOKEN: 'synthetic-parent-map-value',
    EXPO_PUBLIC_ANALYTICS_URL: 'https://example.invalid/analytics',
    EXPO_NO_DOTENV: '0',
  };
  const env = fixtureEnvironment(parent);
  assert.equal(env.EXPO_PUBLIC_SUPABASE_URL, 'http://localhost:9001');
  assert.equal(env.EXPO_PUBLIC_SUPABASE_ANON_KEY, 'lighthouse-ci-not-a-credential');
  assert.equal(env.EXPO_NO_DOTENV, '1');
  assert.equal(env.EXPO_NO_TELEMETRY, '1');
  assert.equal(env.PATH, parent.PATH);
  assert.equal(env.EXPO_PUBLIC_MAP_TOKEN, undefined);
  assert.equal(env.EXPO_PUBLIC_ANALYTICS_URL, undefined);
  assert.equal(parent.EXPO_NO_DOTENV, '0');
});

// Use the installed audit browser to prove that HTTP 200 plus expected labels
// cannot conceal a runtime failure or an external request.
test('readiness rejects errors and external requests before producing a pass', async () => {
  const http = require('node:http');
  const puppeteer = require('puppeteer');
  const ready = require('./ready.cjs');
  const labels = '<div aria-label="Welcome to Flagstone">Welcome</div>' +
    '<button aria-label="Skip the tutorial">Skip</button>' +
    '<button aria-label="Next. Card 1 of 5.">Next</button>';
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/html');
    const script = request.url === '/runtime-error'
      ? 'throw new Error("Synthetic readiness failure")'
      : 'fetch("https://example.invalid/should-be-blocked").catch(() => {})';
    response.end(`${labels}<script>${script}</script>`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    await assert.rejects(ready(browser, { url: `${origin}/runtime-error` }), /Synthetic readiness failure/);
    await assert.rejects(ready(browser, { url: `${origin}/external-request` }), /Unexpected external request/);
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});
