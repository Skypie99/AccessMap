import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const serviceWorker = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');

describe('OpenFreeMap web configuration guard', () => {
  it('cache-firsts only the approved OpenFreeMap host', () => {
    expect(serviceWorker).toContain("url.hostname === 'tiles.openfreemap.org'");
    expect(serviceWorker).not.toContain('cartocdn.com');
  });

  it('bumps the tile cache so a browser does not retain CARTO watermark imagery', () => {
    expect(serviceWorker).toContain("const CACHE_VERSION = 'v3'");
  });
});
