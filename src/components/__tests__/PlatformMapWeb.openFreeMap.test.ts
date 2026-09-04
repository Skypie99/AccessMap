import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'PlatformMap.web.tsx'), 'utf8');

describe('OpenFreeMap web basemap regression guard', () => {
  it('uses the approved official light and dark styles through the Leaflet bridge', () => {
    expect(source).toContain('https://tiles.openfreemap.org/styles/positron');
    expect(source).toContain('https://tiles.openfreemap.org/styles/dark');
    expect(source).toContain("from '@maplibre/maplibre-gl-leaflet'");
    expect(source).toContain('interactive: false');
  });

  it('keeps required provider attribution visible on full-map instances', () => {
    expect(source).toContain('OpenFreeMap');
    expect(source).toContain('OpenMapTiles');
    expect(source).toContain('OpenStreetMap');
    expect(source).toContain('map.attributionControl?.addAttribution(OPENFREEMAP_ATTRIBUTION)');
    expect(source).toContain('attributionControl={!suppressAttribution}');
  });

  it('does not restore CARTO or introduce a browser map credential', () => {
    expect(source).not.toContain('cartocdn.com');
    expect(source).not.toMatch(/api[_-]?key|access[_-]?token|EXPO_PUBLIC_.*MAP/i);
  });
});
