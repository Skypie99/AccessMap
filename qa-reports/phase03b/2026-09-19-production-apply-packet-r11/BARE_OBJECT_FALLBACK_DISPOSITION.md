# Bare-object fallback disposition

Disposition: **REMOVED**.

The source R8 review found no independent producer or current runtime path for `{ "<receipt key>": <snapshot> }`. The retained owner evidence proves the array transport, and the current linked production CLI evidence proves the exact `boundary`/`rows`/`warning` transport. A bare-object fallback is therefore not runtime-necessary and could bypass container guarantees.

R9 rejects both an otherwise valid bare keyed object and a malformed bare object. No compatibility fallback remains.
