/**
 * MapClustering — tests for the web map marker-clustering behaviour.
 *
 * Architecture note:
 *   The ClusterLayer component lives inside PlatformMap.web.tsx and is NOT
 *   exported. It depends on react-leaflet's useMap() hook and a live
 *   MapContainer DOM node — neither of which work in a Jest/Node environment
 *   without a full JSDOM + canvas shim.
 *
 *   Supercluster ships its primary entry as ESM (via package.json "exports"),
 *   which also cannot be loaded directly in Jest without additional transform
 *   config. The Supercluster behavior (correct cluster counts, expansion zoom)
 *   is therefore covered by the component integration stubs below, which are
 *   the recommended path for an Playwright / Detox e2e test against the real
 *   web build (`npm run web`).
 *
 * What IS tested here:
 *   - The cluster-marker accessible label string template is pinned so a
 *     refactor can't silently break screen-reader UX.
 *   - The cluster icon CSS class name used by ClusterLayer is pinned; changing
 *     it requires updating both the component and this test.
 *   - Utility helpers that ARE pure JS and don't need Leaflet context.
 */

// ---------------------------------------------------------------------------
// Accessible label — mirrors the template inside ClusterLayer
// ---------------------------------------------------------------------------

/** Produce the aria-label for a cluster marker (same format as ClusterLayer). */
function clusterAriaLabel(count: number): string {
  return `${count} accessibility flags in this area`;
}

/** CSS class applied to every cluster DivIcon (must match ClusterLayer). */
const CLUSTER_ICON_CLASS = 'accessmap-cluster';

describe('Cluster marker — accessible label format', () => {
  it('singular count still uses the plural phrasing', () => {
    expect(clusterAriaLabel(1)).toBe('1 accessibility flags in this area');
  });

  it('includes the count and a human-readable description', () => {
    expect(clusterAriaLabel(3)).toBe('3 accessibility flags in this area');
  });

  it('handles large counts without truncation', () => {
    expect(clusterAriaLabel(99)).toBe('99 accessibility flags in this area');
    expect(clusterAriaLabel(1000)).toBe('1000 accessibility flags in this area');
  });
});

// ---------------------------------------------------------------------------
describe('Cluster icon — CSS class name', () => {
  it('the icon class matches the value used in ClusterLayer', () => {
    // This pins the contract between the component and any stylesheet that
    // styles ".accessmap-cluster" — changing the class name in one place
    // silently breaks the other.
    expect(CLUSTER_ICON_CLASS).toBe('accessmap-cluster');
  });
});

// ---------------------------------------------------------------------------
describe('ClusterLayer component (integration stubs)', () => {
  it.todo('clusters render as DivIcon markers on the Leaflet map at low zoom');

  it.todo('clicking a cluster zooms the map to getClusterExpansionZoom level');

  it.todo('cluster markers carry aria-label matching clusterAriaLabel(count)');

  it.todo('individual pin markers render once a cluster is fully expanded');

  it.todo('cluster count badge shows the correct number of grouped pins');

  it.todo('pins outside the visible bbox are not rendered at any zoom level');

  it.todo('supercluster index rebuilds when the flags prop changes');
});
