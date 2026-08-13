// Map-chrome compaction (Direction B-refined) — QUARTER-BUDGET measurement.
//
// SPEC §7.3: read the RENDERED persistent chrome band at 430×932 and 393×852
// and assert (1) the band ≤ 25% of the viewport height in the default signed-in
// state, and (2) the bar's top edge = safe-area + 8 (Sky's refinement ①).
//
// Adapted from design-reviews/device-tune/tools/measure-header.mjs (same
// Playwright require-root; same web-vs-device safe-area treatment). STRICTLY
// READ-ONLY on the app: never signs in, never presses a submit affordance.
//
// --- THE WEB-vs-DEVICE SEAM (read before trusting any number) ----------------
// The browser has no notch: useSafeAreaInsets().top is 0 on web and 59 on the
// 430×932 / 393×852 device classes. The overlay adds it as paddingTop, so the
// bar sits at y=8 on web and y=(59+8)=67 on device. Every web y is therefore
// reported AND device-adjusted (+SAFE_AREA_TOP), tagged, never silently merged.
// The command bar renders for guests too (unlike the old authUser saved-places
// row it replaced), so a guest web frame is a faithful measure of the bar.
//
// usage: node design-reviews/map-chrome/2026-08-12/tools/measure-mapchrome.mjs [base-url]

import { createRequire } from 'node:module';
const require = createRequire('/Users/skypie/AccessMap-material-lab/2026-07-02/tools/package.json');
const { chromium } = require('playwright');

const positional = process.argv.slice(2).find((a) => !a.startsWith('--') && a.includes('://'));
const BASE = positional || 'http://localhost:8081';

const GEO = { latitude: 49.8874, longitude: -119.4925 };
const SAFE_AREA_TOP = 59; // 430×932 (14 Pro Max) and 393×852 (14/15 Pro) both ≈ 59
const OVERLAY_TOP_PAD = 8; // Sky ① — expected bar top on device = 59 + 8 = 67
const BUDGET = 0.25; // the quarter budget
const DEVICES = [
  { name: '430x932', width: 430, height: 932 },
  { name: '393x852', width: 393, height: 852 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const measureBar = () =>
  // Runs in the page. Find the command bar as the nearest ancestor of the menu
  // button that ALSO contains the "Explore" heading — that's commandBarInner;
  // step to its offsetParent-ish outer (the GlassSurface pill, +paddingV) when
  // it is only slightly taller, so the band includes the bar's own padding.
  {
    const round = (n) => Math.round(n * 10) / 10;
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { top: round(r.top), bottom: round(r.bottom), height: round(r.height), width: round(r.width) };
    };
    const menu = document.querySelector('[aria-label="Open navigation menu"]');
    if (!menu) return { error: 'menu button (aria-label="Open navigation menu") not found' };
    const hasExplore = (el) => (el.innerText || '').includes('Explore');
    let inner = menu.parentElement;
    for (let i = 0; i < 6 && inner; i++) {
      if (hasExplore(inner)) break;
      inner = inner.parentElement;
    }
    if (!inner || !hasExplore(inner)) return { error: 'command bar (ancestor with Explore) not found' };
    // Prefer the outer GlassSurface pill if it only adds a little padding.
    let bar = inner;
    const p = inner.parentElement;
    if (p) {
      const pr = p.getBoundingClientRect();
      const ir = inner.getBoundingClientRect();
      if (pr.height - ir.height <= 24 && pr.height >= ir.height) bar = p;
    }
    return { bar: rect(bar), inner: rect(inner), viewport: { w: window.innerWidth, h: window.innerHeight } };
  };

const browser = await chromium.launch();
const results = [];

for (const dev of DEVICES) {
  const ctx = await browser.newContext({
    viewport: { width: dev.width, height: dev.height },
    deviceScaleFactor: 2,
    colorScheme: 'light',
    permissions: ['geolocation'],
    geolocation: GEO,
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('@accessmap/onboarded_v1', '1');
      localStorage.removeItem('@accessmap/glass_mode_v1');
    } catch {}
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 300_000 });

  const guest = page.getByText(/browse without an account/i).first();
  if (await guest.isVisible().catch(() => false)) {
    await guest.click().catch(() => {});
    await sleep(1500);
  }
  // Land on the Map tab (default) — wait for the bar's title.
  await page.getByText('Explore', { exact: true }).first().waitFor({ timeout: 120_000 }).catch(() => {});
  await sleep(2500);

  const m = await measureBar();
  if (m.error) {
    results.push({ device: dev.name, error: m.error, pageErrors });
    await ctx.close();
    continue;
  }
  const barBottomWeb = m.bar.bottom;
  const barTopWeb = m.bar.top;
  const deviceBandBottom = Math.round((barBottomWeb + SAFE_AREA_TOP) * 10) / 10;
  const deviceBarTop = Math.round((barTopWeb + SAFE_AREA_TOP) * 10) / 10;
  const pct = Math.round((deviceBandBottom / dev.height) * 1000) / 10;
  results.push({
    device: dev.name,
    viewport: m.viewport,
    web_frame: { barTop: barTopWeb, barBottom: barBottomWeb, barHeight: m.bar.height, inner: m.inner },
    device_adjusted: {
      SAFE_AREA_TOP,
      barTop: deviceBarTop,
      expectedBarTop: SAFE_AREA_TOP + OVERLAY_TOP_PAD,
      barTopOK: Math.abs(deviceBarTop - (SAFE_AREA_TOP + OVERLAY_TOP_PAD)) <= 2,
      persistentBandBottom: deviceBandBottom,
      persistentBandPct: pct,
      quarterBudgetPct: BUDGET * 100,
      withinQuarterBudget: deviceBandBottom <= dev.height * BUDGET,
    },
    pageErrors,
  });
  await ctx.close();
}

console.log(JSON.stringify({ base: BASE, note: 'Chromium proxy — blur/scroll feel is NEEDS-SKY-DEVICE', results }, null, 2));
await browser.close();
const anyFail = results.some((r) => r.error || !r.device_adjusted?.withinQuarterBudget || !r.device_adjusted?.barTopOK);
process.exit(anyFail ? 1 : 0);
