# Performance Budget

**Established:** 2026-05-29 (Phase 2 Track A)
**Owner:** Gary + Peter
**Review cadence:** re-baseline after any major dependency bump

---

## Web Bundle Size

| Metric | Budget | Baseline (2026-05-29) | Action on breach |
|---|---|---|---|
| Total JS (gzipped) | <= 2 MB | ~1.1 MB | CI blocks the PR |
| Largest single chunk | <= 500 KB | ~380 KB | warn (non-blocking) |

**CI enforcement:** `.github/workflows/ci.yml` -> `perf-budget` job.
Runs `expo export --platform web` and fails if total gzipped JS > 2 MB.

**Measuring the baseline:**
```
npx expo export --platform web
find dist -name "*.js" -exec gzip -c {} \; | wc -c
```
Result on main @ `bc3ff72`: 1,152,431 bytes (~1.1 MB gzipped).

---

## API Latency Targets (documented, not yet CI-enforced)

Monitored manually via Supabase Dashboard. CI enforcement needs
the observability stack (Phase 2 Track B).

| Query | P50 target | P95 target |
|---|---|---|
| `listFlags` (paginated, 20 rows) | < 200 ms | < 500 ms |
| `createFlag` | < 300 ms | < 800 ms |
| `updateFlagStatus` | < 200 ms | < 500 ms |
| `getUserProfile` | < 100 ms | < 300 ms |
| Map initial load | < 500 ms | < 1200 ms |

---

## React Native / iOS Bundle

Not CI-enforced (EAS Build handles this on device).

| Metric | Target |
|---|---|
| JS bundle size | <= 5 MB (Hermes bytecode) |
| App cold start (iOS) | < 2 s to first paint |
| Map render (100 flags) | < 500 ms |

---

## Updating this doc

Re-run the baseline command and update the table after:
- A large new feature merge
- A significant dependency bump
- Intentional bundle growth

The budget bytes in `ci.yml` must be updated in sync with this doc.
