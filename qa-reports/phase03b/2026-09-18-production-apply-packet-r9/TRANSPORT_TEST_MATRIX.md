# R9 transport regression matrix

The executable truth is `LOCAL_R9_CONTROL_VALIDATION.json`; all 19 cases returned `true`.

| Case | Expected |
|---|---|
| Exact one-row array | Accept |
| Empty array | Reject |
| Two-row array | Reject |
| Scalar | Reject |
| Null | Reject |
| Array row with unknown key | Reject |
| Array row missing required key | Reject |
| Legacy row alias | Reject |
| Snapshot with unknown top-level key | Reject |
| Snapshot with nested unknown key | Reject |
| Contradictory snapshot discriminator | Reject |
| Bare keyed object | Reject |
| Malformed bare object | Reject |
| Exact `boundary`/`rows`/`warning` wrapper | Accept |
| Current wrapper with unknown top-level key | Reject |
| Current wrapper missing a top-level key | Reject |
| Current wrapper row with unknown key | Reject |
| Current wrapper boundary/warning mismatch | Reject |
| Invalid raw transport before classification | Reject with zero classifier calls |
