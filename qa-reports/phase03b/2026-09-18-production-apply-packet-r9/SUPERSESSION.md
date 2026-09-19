# Phase 03B production-apply packet lineage

- R1 through R6: historical, superseded packets; not apply-ready.
- R7 packet (`4dd4ebd7ae6295c8ebb204583f42932db7fb4c95`): independently accepted by `f39e126f7573d8e218e0fbbf49326c395cb301e2`, then stopped before mutation when the owner read-only preflight exposed R8-D1.
- R8 packet (`d2632f1dcf9b21f67f95c27fa37794d84dc96391`): snapshot-schema repair held by independent review `f7d62d482372ae062b58d1bd240cdc5cc5e229bb` for R9-D1 transport exactness.
- R9: non-applying repair of R9-D1 only. It requires genuinely fresh independent review before any owner execution decision.

The frozen candidate and exact two migration files are unchanged. No historical packet or review artifact was modified or erased. R9 carries no production-apply authority.
