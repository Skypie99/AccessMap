/**
 * GSP-03 pin-outline arbiter — the M3 retune, checked instead of eyeballed.
 *
 * GLASS.md §12.2 + §12.4: a map pin's backdrop is a live, unbounded surface, so
 * the bases are #000 AND #FFF in both modes plus the documented domain saturants
 * (the five heat-ramp fills, which render UNDER the pins). §12.4 is the rule that
 * matters here: a boundary colour cannot span the range alone — a white ring
 * vanishes on white tiles — so the pin carries a REGIME-DECOMPOSED UNION (white
 * ring for dark backdrops, navy hairline for light ones) and what must be proved
 * is that the UNION covers every backdrop luminance at the 3:1 boundary floor.
 * §12.4 also forbids reading a 3.0 boundary union as a 4.5 text guarantee: this
 * file proves separation of the pin from its backdrop, nothing about text.
 */
const hex = (h) => {
  const v = h.replace('#', '');
  const n = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const Y = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const ratio = (a, b) => {
  const [hi, lo] = Y(a) >= Y(b) ? [Y(a), Y(b)] : [Y(b), Y(a)];
  return (hi + 0.05) / (lo + 0.05);
};
const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
const fmt = (rgb) =>
  '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase();

// The two regimes of the pin's edge, before and after the retune.
const NAVY = hex('#0F1B2D');
const WHITE = hex('#ffffff');
const REGIMES = {
  before: { ringAlpha: 1, hairAlpha: 1.0, ringPx: 2.5, hairPx: 1 },
  after: { ringAlpha: 1, hairAlpha: 0.6, ringPx: 2, hairPx: 0.5 },
};

// Bases: the §12.2 extremes + the five heat-ramp fills the pins sit on top of.
const BASES = [
  ['#000000', 'black tile extreme'],
  ['#FFFFFF', 'white tile extreme'],
  ['#F7C948', 'heat sev1'],
  ['#F0A030', 'heat sev2'],
  ['#F2792B', 'heat sev3'],
  ['#E85638', 'heat sev4'],
  ['#D92D20', 'heat sev5'],
];

const FLOOR = 3;
let worstUnion = Infinity;
const rows = [];
for (const [name, cfg] of Object.entries(REGIMES)) {
  for (const [baseHex, baseName] of BASES) {
    const base = hex(baseHex);
    const ring = over(WHITE, cfg.ringAlpha, base);
    const hair = over(NAVY, cfg.hairAlpha, base);
    const rRing = ratio(ring, base);
    const rHair = ratio(hair, base);
    const union = Math.max(rRing, rHair);
    if (name === 'after') worstUnion = Math.min(worstUnion, union);
    rows.push({
      regime: name,
      base: `${baseHex} (${baseName})`,
      ring: `${fmt(ring)} ${rRing.toFixed(2)}:1`,
      hair: `${fmt(hair)} ${rHair.toFixed(2)}:1`,
      union: union.toFixed(2) + ':1',
      verdict: union >= FLOOR ? 'PASS' : 'FAIL',
    });
  }
}

console.log('## Contrast report — GSP-03 pin outline retune (M3 / board 02), 2026-08-21\n');
console.log('Union rule (GLASS §12.4): a pin is separated from its backdrop if EITHER regime');
console.log(`clears the ${FLOOR}:1 boundary floor. Ring = #FFFFFF; hairline = #0F1B2D at its alpha.`);
console.log('BEFORE = 2.5px ring + 1px opaque hairline. AFTER = 2px ring + 0.5px hairline at 0.6.\n');
console.log('| regime | base | white ring vs base | navy hairline vs base | union | verdict |');
console.log('|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(`| ${r.regime} | \`${r.base}\` | ${r.ring} | ${r.hair} | **${r.union}** | ${r.verdict} |`);
}
const failed = rows.filter((r) => r.verdict === 'FAIL');
console.log(`\nWorst union AFTER the retune: **${worstUnion.toFixed(2)}:1** (floor ${FLOOR}:1).`);
console.log(failed.length === 0 ? '\nEXIT 0 — every base is covered by one regime or the other.' : `\nEXIT 1 — ${failed.length} uncovered base(s).`);
process.exit(failed.length === 0 ? 0 : 1);
