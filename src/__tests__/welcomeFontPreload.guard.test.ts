/**
 * The welcome cards' font faces are preloaded from public/index.html so they
 * download alongside the JS bundle instead of after it executes (see
 * src/lib/fonts.ts). The hrefs are the exported asset paths Metro gives each
 * font, whose hash is the MD5 of the font file, so a font package update
 * changes them. This guard fails on drift rather than letting the page preload
 * a file that no longer exists while the real font quietly loads late.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const fontsSrc = fs.readFileSync(path.join(ROOT, 'src', 'lib', 'fonts.ts'), 'utf8');

const preloads = [...html.matchAll(/<link rel="preload" as="font"[^>]*>/g)].map((m) => m[0]);
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

const welcomeBlock = fontsSrc.match(/const welcomeFonts = \{([\s\S]*?)\};/)?.[1] ?? '';
const welcomeFamilies = [...welcomeBlock.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);

describe('welcome font preloads in public/index.html', () => {
  it("preloads exactly the welcome cards' faces declared in fonts.ts", () => {
    expect(welcomeFamilies).toHaveLength(3);
    const preloaded = preloads.map((tag) => attr(tag, 'data-flagstone-font'));
    expect([...preloaded].sort()).toEqual([...welcomeFamilies].sort());
  });

  it.each(welcomeFamilies)(
    '%s points at the exported asset of the installed font file',
    (family) => {
      const tag = preloads.find((t) => attr(t, 'data-flagstone-font') === family) ?? '';
      const href = attr(tag, 'href') ?? '';
      const parts = href.match(
        /^\/assets\/node_modules\/(@expo-google-fonts\/[^/]+\/[^/]+)\/(\w+)\.([0-9a-f]{32})\.ttf$/,
      );
      expect(parts).not.toBeNull();
      const [, dir, name, hash] = parts as RegExpMatchArray;
      expect(name).toBe(family);
      const file = fs.readFileSync(path.join(ROOT, 'node_modules', dir, `${name}.ttf`));
      expect(hash).toBe(crypto.createHash('md5').update(file).digest('hex'));
    },
  );

  it('uses CORS mode, so the @font-face request reuses each preload', () => {
    for (const tag of preloads) {
      expect(tag).toMatch(/\scrossorigin[\s>]/);
      expect(attr(tag, 'type')).toBe('font/ttf');
    }
  });
});
