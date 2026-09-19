# R10 call graph

## R9 before

`parse` -> `transport validate` -> `extract` -> `classifyEntryState` -> comparator predicate/dispatch -> `classifyServerState` -> `statePolicy` -> build envelope -> strict snapshot/envelope validation.

## R10 after

`parse` -> `transport validate` -> `extract` -> `validateServerStateSnapshot` -> `VALIDATED_R10` -> `classifyEntryState` -> optional comparator -> `classifyServerState` -> `statePolicy` -> build envelope -> final envelope validation.

The final validation is retained, but it is no longer the first validation seen by snapshot-driven consumers.
