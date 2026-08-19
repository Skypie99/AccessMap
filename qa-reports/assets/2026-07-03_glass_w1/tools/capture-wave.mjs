// Glass Rollout Wave 1 — capture ONE wave surface per fresh browser session
// via the guest path (read-only, no credentials). Drives expo web @ :8081.
// usage: node capture-wave.mjs <outDir> <screen> [--dark]
//   screen ∈ drawer | resources | howtohelp | about | settings | feedback
import { chromium } from '/Users/skypie/AccessMap-material-lab/2026-07-02/tools/node_modules/playwright/index.mjs';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2];
const screen = process.argv[3];
if (!outDir || !screen) throw new Error('usage: node capture-wave.mjs <outDir> <screen> [--dark]');
mkdirSync(outDir, { recursive: true });
const dark = process.argv.includes('--dark');
const lite = process.argv.includes('--lite'); // C-lite spot-check: pre-seed glass mode
const tag = `${dark ? 'dark' : 'light'}-375${lite ? '-lite' : ''}`;
const APP = 'http://localhost:8081';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 375, height: 812 },
  deviceScaleFactor: 2,
  colorScheme: dark ? 'dark' : 'light',
});
await ctx.addInitScript(() => { try { localStorage.setItem('@accessmap/onboarded_v1', '1'); } catch {} });
if (lite) await ctx.addInitScript(() => { try { localStorage.setItem('@accessmap/glass_mode_v1', 'lite'); } catch {} });
const page = await ctx.newPage();
const clickText = async (re) => {
  const el = page.getByText(re).first();
  if (await el.isVisible().catch(() => false)) { await el.click().catch(() => {}); return true; }
  return false;
};

await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 120_000 });
await sleep(4500);
// guest + onboarding
const guest = page.getByText(/guest/i).first();
if (await guest.isVisible().catch(() => false)) { await guest.click().catch(() => {}); await sleep(1500); }
for (let i = 0; i < 6; i++) { if (await clickText(/^(Next|Open the Map|Get started|Skip|Continue|Done)$/)) await sleep(500); else break; }
await sleep(1500);

const openDrawer = async () => {
  const m = page.getByLabel('Open navigation menu').first();
  if (await m.isVisible().catch(() => false)) { await m.click().catch(() => {}); await sleep(800); return true; }
  return false;
};

if (screen === 'drawer') {
  await openDrawer();
} else if (screen === 'resources') {
  await openDrawer(); await clickText(/^Resources$/); await sleep(1100);
} else if (screen === 'howtohelp') {
  await openDrawer(); await clickText(/^How To Help$/); await sleep(1100);
} else if (screen === 'about') {
  await openDrawer(); await clickText(/^About the App$/); await sleep(1100);
} else if (screen === 'settings') {
  await openDrawer(); await clickText(/^Settings$/); await sleep(1600);
} else if (screen === 'feedback') {
  const fb = page.getByLabel('Send feedback').first();
  if (await fb.isVisible().catch(() => false)) { await fb.click().catch(() => {}); await sleep(1100); }
  else { await openDrawer(); await clickText(/^Settings$/); await sleep(1400); await clickText(/^Send feedback$/); await sleep(1100); }
} else {
  throw new Error('unknown screen: ' + screen);
}

await page.screenshot({ path: join(outDir, `wave-${tag}-${screen}.png`) });
console.log(`[shot] wave-${tag}-${screen}.png`);
await browser.close();
