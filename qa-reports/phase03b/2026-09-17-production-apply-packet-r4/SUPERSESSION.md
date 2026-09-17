# Phase 03B production-apply packet lineage

- R1 (`b5f5afb558fafcaa492d103781fc7e943ab75c2b`): `SUPERSEDED_NOT_APPLY_READY`
- R2 (`3c9aa3b7cdb36a4bdfda5bdfcbb028371a9a691d`): `SUPERSEDED_NOT_APPLY_READY`
- R3 (`88e6fce5f262b2385571a09f7084821ceb980244`): `SUPERSEDED_NOT_APPLY_READY`
- Independent R3 review (`f77555b2b4a3ce7e1939ad63ae1a9bef4e82890c`): `HOLD`; source of exactly three R4 executable repairs.
- R4: non-applying packet-repair candidate only. It is not production-apply authority and requires a genuinely fresh independent review plus a later separate owner authorization before any production mutation.

R1, R2, R3, and their review evidence remain preserved in Git history. R4 changes no application or frozen migration byte.
