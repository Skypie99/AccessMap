# ADR 001 — Heatmap: gradient display vs. density dots

**Date:** 2026-05-29  
**Status:** Accepted  
**Deciders:** Sky (owner)

---

## Context

The heatmap feature (flag: `HEATMAP_ENABLED`) needs to visualize the spatial
density of accessibility barriers on the map. Two display approaches were
evaluated before implementation began.

---

## Options Considered

1. **Gradient display** — smooth colour-field overlay (red/yellow/green) that
   interpolates flag density across the map surface. Implemented via a weighted
   kernel (Gaussian or inverse-distance) applied to the flag coordinate set.

2. **Density dots** — discrete circles rendered at each flag location, scaled
   by the count of nearby flags (radius ∝ density). No interpolation; each
   cluster has a visible centroid.

---

## Decision

**Gradient display** (Option 1) was chosen.

Reasons:
- **Accessibility barrier geography is continuous, not point-based.** A broken
  sidewalk affects an entire block, not just the pin location. Gradient
  interpolation communicates this naturally; dots do not.
- **Gradient is better for low-density areas.** When flags are sparse, density
  dots vanish or become meaninglessly tiny. A gradient fades gracefully to the
  cool end of the scale.
- **Consistent with user expectations.** Map users familiar with traffic,
  weather, or air-quality overlays expect a smooth heatmap. Dots look like a
  second marker layer and create visual confusion with the existing pin markers.
- **Future-friendly.** The gradient approach can be parameterised (bandwidth,
  colour scheme, weight by severity) without a visual paradigm shift. Adding
  severity weighting to dots would require a completely different visual encoding.

---

## Consequences

- **Positive:** Intuitive visual for route-planning — users can see "hot" zones
  at a glance and plan accessible paths around them.
- **Positive:** Visually distinct from the existing pin-marker layer (no
  confusion between "heatmap" and "individual flags").
- **Negative / trade-off:** Gradient rendering is more CPU-intensive on low-end
  devices. A canvas or SVG path must be redrawn on pan/zoom. Performance must
  be validated before enabling `HEATMAP_ENABLED` by default (see Phase 2 perf
  budget targets in `docs/perf-budget.md` once created).
- **Negative / trade-off:** Interpolation can visually overstate density in
  sparse areas — a single flag with a wide kernel looks like a significant
  hotspot. Kernel bandwidth must be tuned (or capped) during implementation.
- **Neutral:** The `HEATMAP_ENABLED` feature flag keeps gradient rendering off
  by default until performance is validated and the visual is finalized.
