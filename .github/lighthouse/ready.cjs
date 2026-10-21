const fs = require('node:fs');
const path = require('node:path');

// LHCI calls this in the same browser used for the audit. A fresh browser must
// render the real first-launch UI; a successfully served error page is not ready.
module.exports = async (browser, { url }) => {
  const origin = new URL(url).origin;
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') failures.push(message.text());
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const target = new URL(request.url());
    if (['http:', 'https:'].includes(target.protocol) && target.origin !== origin) {
      failures.push(`Unexpected external request to ${target.origin}`);
      void request.abort();
    } else {
      void request.continue();
    }
  });
  try {
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    if (!response || response.status() !== 200) throw new Error('First-launch page did not return HTTP 200');
    await page.waitForSelector('[aria-label="Welcome to Flagstone"]', { visible: true, timeout: 30000 });
    await page.waitForSelector('[aria-label="Skip the tutorial"]', { visible: true });
    await page.waitForSelector('[aria-label="Next. Card 1 of 5."]', { visible: true });
    await page.evaluate(() => document.fonts.ready);
    if (failures.length) throw new Error(`First-launch readiness failed: ${failures.join('; ')}`);
    const output = path.resolve('.lighthouseci');
    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, 'first-launch.png'), fullPage: true });
    fs.writeFileSync(path.join(output, 'first-launch.json'), JSON.stringify({
      url, status: response.status(), screen: 'Welcome to Flagstone',
      browser: await browser.version(), consoleErrors: failures,
      scope: 'Fresh anonymous first launch; no backend, login, location or map acceptance.',
    }, null, 2) + '\n');
    console.log('Verified real Flagstone first-launch screen.');
  } finally {
    await page.close();
  }
};
