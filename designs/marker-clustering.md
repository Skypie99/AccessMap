# Design spec — Map marker clustering

**Status:** spec only — not implemented.
**Source:** `FEATURES.md` → Later → "Marker clustering on the Map."
**Tokens:** all values reference `src/theme.ts`. If a value below isn't a
token name, that's a tell that the token vocabulary needs to grow first.
**Accessibility bar (Alex's):** 44pt minimum target, 4.5:1 text contrast,
3:1 UI/large-text contrast, never color alone, screen-reader label.

---

## Why

Today every flag is a separate pin. At ~25+ flags in a small area, pins stack
and become un-tappable (overlap), and at city zoom the map turns into noise.
Clustering groups nearby pins into a single circle with a count; tap to zoom
in / break apart.

## Behavior in one paragraph

When the map's visible region contains pins closer together than the cluster
distance, group them into a single cluster marker that shows the count of
flags inside. Tapping a cluster animates the camera to fit the cluster's
bounding box (or expands the cluster spider-style if all flags share a single
coordinate). Below the cluster distance, individual pins render as today.

## Visual

```
                     ┌─────┐
                     │ 23  │  ← cluster marker
                     └─────┘
                       ▲
                       │  large cluster (≥10 flags)
                       │
                     ╭───╮
                     │ 5 │   ← small cluster (2–9 flags)
                     ╰───╯
```

### Cluster marker

Two visual sizes, picked by count. Both are circles (radius `full`) carrying
the count as a centered numeral.

| Token | Value | Notes |
|---|---|---|
| Shape | `radius.full` (999) | always circular |
| Small size | 36 × 36 | clusters of 2–9 |
| Large size | 48 × 48 | clusters of 10+ |
| `minHeight` / `minWidth` of tap target | 44 | small clusters: wrap in a 44pt hit area (44 ≥ 36) |
| Background | `color.brand` (#2f80ed) | brand-blue distinguishes cluster from any severity color |
| Border | 2pt solid `color.textOnBrand` (#fff) | white halo for legibility on busy map tiles |
| Numeral color | `color.textOnBrand` | white on brand = 3.3:1 — keep weight `bold` and size ≥ `font.size.lg` (16) to clear AA large-text |
| Numeral size — small | `font.size.lg` (16) bold | "2" – "9" |
| Numeral size — large | `font.size.xl` (18) bold | "10+" — see overflow rule below |
| Shadow | `shadow.e2` | matches existing FAB elevation |

### Overflow rule for the numeral

- 1 – 99: render verbatim (`"23"`).
- 100 – 999: render verbatim with `font.size.lg` even on large clusters.
- 1000+: render `"999+"` to keep glyphs at one width.

### Color is never the only signal

The cluster's *color* doesn't carry severity meaning — that would be
misleading at zoom-out where a single circle represents flags of mixed
severities. The numeral carries the only meaning (count). Once the cluster
breaks into individual pins, each pin re-acquires its severity color.

### Spidering for co-located flags

When 2+ flags share an identical (lat, lng) within ~5m, tapping the cluster
won't help — the bounding box has area 0. Instead, animate a "spider":
fan the pins out around the cluster center on a 60pt radius circle. Tapping
empty space (or the cluster again) collapses them back.

```
   ●         ●       ← spidered pins (each at the actual severity color)
     ╲     ╱
       ╲ ╱
       ┌─┐
       │5│
       └─┘
       ╱ ╲
     ╱     ╲
   ●         ●
```

## Interaction

| Trigger | Behavior |
|---|---|
| Tap cluster | If bounding box > a few meters: animate camera to fit; otherwise spider. |
| Pinch-zoom past the cluster threshold | Clusters dissolve into individual pins on the fly. |
| Long-press cluster | (Out of scope for v1 — note for future: could open a list-view of the contained flags so screen-reader users skip the visual cluster entirely.) |
| Tap empty map while spidered | Collapse the spider. |

## Accessibility

- **Cluster `accessibilityLabel`**: e.g. `"Cluster of 23 flags. Double tap to zoom in."`
- **Cluster `accessibilityRole`**: `"button"` (it's interactive).
- **Spidered pins** keep their existing accessibility behavior (the pin already has a label).
- **Screen-reader users on the Map**: the Nearby Flags list (already shipped) is the
  preferred surface — clusters are a sighted-user optimization. Don't put critical info
  in the cluster that isn't also in the list.

## Cluster distance — sensible defaults

| Zoom level | Distance grouped |
|---|---|
| World–country | n/a (entire screen is one cluster — show count only) |
| City (zoom 11) | ≤ 60pt apart |
| Neighborhood (zoom 15) | ≤ 40pt apart |
| Street (zoom 17+) | no clustering — show individual pins |

These are starting values; the library we pick (likely
`react-native-map-clustering` for native, `leaflet.markercluster` for web)
will own the math. Confirm both libraries can be themed to the tokens above
before adopting either (especially on web — leaflet's default cluster look is
very 2014).

## Open questions for Shamus / Alex

1. **Two map libraries, one look.** Native and web use different cluster
   libraries; expect divergence. Document the small visual deltas rather than
   chase pixel parity.
2. **Cluster of one severity vs. mixed.** v1 ignores severity in cluster styling.
   A future enhancement could show a thin colored ring summarizing the *max*
   severity inside the cluster — but only if that aids comprehension; if it just
   adds noise, skip it.
3. **Performance.** Re-cluster on every region change is cheap below ~1k pins;
   measure (and consider memoization on the visible-region bounds) once flag
   counts grow.

## Definition of done (when Shamus builds it)

- All values above mapped to tokens in `src/theme.ts` (add `clusterSmall` /
  `clusterLarge` size tokens if helpful).
- Both `PlatformMap.tsx` and `PlatformMap.web.tsx` cluster.
- Cluster has accessibility label with count.
- Touch target ≥ 44pt on small clusters.
- Spidering works for co-located flags.
- No regression in pin tap → callout flow.
- `npm run typecheck` green.
