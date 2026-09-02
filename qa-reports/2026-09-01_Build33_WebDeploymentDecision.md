# Flagstone Build 33 Web Deployment Decision

Decision date: 2026-09-01 (America/Vancouver)
Execution evidence completed: 2026-09-02 UTC

## Decision

Deploy the public Flagstone web demo from the frozen, approved Build 33 web release branch while deferring canonical `main` release-code convergence to a separate audited decision.

## Release identity

- iOS version: 4.1.1
- iOS build: 33
- iOS source: `f5594171e75bc5ec92a87d0392c361601ddedfba`
- iOS tree: `a4a5e70c1a413d39e457f5254af1bba91f08d7ed`
- web source: `ebf091c21066d39898160b1357bde0aa35bdb8bf`
- web tree: `6cb842e3be0f4c3bfec569307829ad240d3f270a`
- web relationship: APPROVED WEB-ONLY DESCENDANT
- ancestry: PASS
- accepted web delta: OpenFreeMap provider repair
- durable frozen web branch: `release/web-4.1.1-build33-openfreemap`

## Main

- main pre-documentation SHA: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`
- main release-code integration: DEFERRED — SEPARATE RELEASE DECISION

This documentation-only release record does not constitute release-code convergence.

The documentation commit SHA is intentionally recorded by Git history and the execution receipt rather than embedded into this file.

## Vercel production state

- Vercel project: `access-map` (`skypie99s-projects`)
- connected repository: `Skypie99/AccessMap`
- Production Branch before: `main`
- Production Branch after: `release/web-4.1.1-build33-openfreemap`
- production deployment before: `8xwqMtYrg8GvieZgseLUfofVYoGx`
- production SHA before: `a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`
- production deployment after: `HMszH26wADRRDd1CqH4UkJ8kAugQ`
- production SHA after: `ebf091c21066d39898160b1357bde0aa35bdb8bf`
- deployment status: Ready · Production · Current
- deployment method: Vercel supported Promote to Production action on the existing exact-SHA Preview deployment.
- production domain: `flagstone.skypistudio.com`

- Environment variables changed: NO
- Build settings changed: NO
- Domain settings changed: NO
- Source/Git modified during Vercel phase: NO

## Recruiter-path acceptance

Result: LIVE WEB ACCEPTANCE — PASS WITH NOTES

Portfolio → Flagstone case study → `LIVE MAP ↗` → `flagstone.skypistudio.com`: PASS

### Basemap

- `API KEY REQUIRED`: ABSENT
- CARTO attribution: ABSENT
- CARTO requests observed: 0
- OpenFreeMap attribution: PRESENT
- dark map: PASS
- light/positron map: PASS

### Build 33 UI

- Build 33-era map UI: PASS
- compact warning: PASS
- compact Legend: PASS
- Legend open/scroll/close: PASS
- exactly one heat-map treatment: PASS
- legacy empty-state card: ABSENT
- legacy expanded heat legend: ABSENT

### Production data

- real flags loaded: 13
- expected snapshot: approximately 13
- data functionality: PASS

### Core interactions

- desktop pan: PASS
- wheel zoom: PASS
- zoom +: PASS
- zoom −: PASS
- marker selection: PASS
- marker popup: PASS
- Open details: PASS
- Nearby/Recent list: PASS
- return/navigation: PASS

### Recruiter quality

- Recruiter first impression: PASS
- Blocking recruiter-facing issues: NONE

## Explicitly unverified / partially verified

Testing was intentionally stopped after the critical recruiter-facing release gates passed.

- hard reload: UNVERIFIED
- repeat portfolio-path reload: UNVERIFIED
- responsive check: UNVERIFIED
- console: PASS (partial)
- network: PASS (partial)

Multiple fresh direct `/flag` navigations loaded correctly with the basemap and 13 flags.

Deployment output contains `sw.js`, so future release acceptance should include explicit cache/service-worker resilience testing.

## Non-blocking polish observations

1. Attribution begins with `Leaflet |` although the current renderer is MapLibre.
2. Heat map On showed no tinted neighbourhood zones in the tested viewport; web behavior remains unverified for the current data density.
3. `/Settings` deep link redirects to `/Home`; Settings remains reachable through the menu.
4. Accessibility tree exposes duplicate `Close legend` controls; the visible close control works.

These do not justify rollback and belong to a separate prioritized polish pass.

## Rollback

- Rollback required: NO
- Rollback performed: NO
- Recorded rollback deployment: `8xwqMtYrg8GvieZgseLUfofVYoGx`
- Recorded rollback source: `main @ a0bf4d04d0d2e11e6e56d1cd3546175d5759fb50`

Rollback is a Vercel production-source/deployment operation only.
It does not authorize Git history rewrites.

## Exit condition

Retire this temporary main ↔ web split only when:

1. `main` is deliberately audited and approved to converge to the shipped release lineage.
2. `main` contains the accepted web source or an explicitly approved successor.
3. Vercel Production Branch is returned to `main`.
4. The live custom-domain demo is re-verified.
5. The production-branch exception is explicitly retired.

## Final judgment

1. Exact approved WEB_SHA serving custom production domain: YES
2. Recruiter following portfolio path reaches intended Flagstone demo: YES
3. Stale CARTO/API-key problem removed: YES
4. Approved Build 33-era experience represented: YES
5. Primary map interactions functional: YES
6. Material recruiter-confidence issue currently visible: NO
7. Production safe to leave on frozen web branch: YES
