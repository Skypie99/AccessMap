# Independent INT acceptance — Phase 03A blocker fix

**`PHASE_03A_INT_GATE: PASS`. No mandatory changes.**

Same reviewer who held the CODE at round 1 and passed it at round 2, so the code
surface was already known to them; this round judged the *integration*.

## What they proved, beyond what was claimed

| Claim | How they went further |
|---|---|
| four repair path-trees are the same tree objects | also intersected BOTH parents' changed-path sets and found it **empty** — the rigorous proof that the merge invented nothing, since every resulting blob traces to exactly one parent |
| integration parent is `c7dab37` | traced the real parent `17c3b43` and confirmed its tree is byte-identical to `c7dab37`'s — a pure write-ahead marker, so the shorthand is accurate in substance |
| candidate delta from reviewed is receipt-only | `git diff 3ac416e2 6d5beb0d --stat` → one file, 42 insertions. "The code I reviewed and passed in Round 2 is exactly what got merged." |
| the receipt describes this tree | diffed merge→HEAD: only `INT_OPERATION.json` added. Not a stale artifact. |
| no history rewrite | read the branch **reflog** — a clean linear sequence back to creation, no `reset`, `rebase` or `-f` entries anywhere |
| composed pgTAP 254/254 | re-verified both pinned hashes against the committed contract, confirmed `source.sha === de3ac082` so the run was against real HEAD, and tallied raw TAP rather than any summary field |

## The baseline question, attacked hardest

They built their own detached probe at `c7dab37`, ran the full suite fresh, and
then — beyond the brief — extracted the JSON reporter's `assertionResults` from
both runs and diffed the failing test **names**:

```
only in baseline (fixed by merge):            set()
only in head (new failures introduced):       set()
exact name match:                             True
```

Verdict: **SOUND, not a goalpost move.** Their reasoning: the two lineages carry
genuinely different `state.json` files (306 vs 429 lines), so the CODE branch's
14 was never a valid population to compare an *integration* against. The right
question for an INT gate is whether the merge changed what was already failing on
the branch being merged into. Proven name-for-name from two independently-run live
executions: it did not.

## The credential guard

Confirmed a false positive, and confirmed it predates the merge. Their added
detail: the guard's allowlist is deliberately hard to use — the file's own comment
says an entry "is a decision to keep a credential-shaped string in a tracked file
— it should stay hard, visible, and argued in review." It holds exactly one entry
today, for an unrelated historical migration.

Their disposition: **acceptable to defer.** Fixing it inline would mean touching
either `state.json` (outside the frozen reviewed candidate) or a test file (a
source change needing its own argued review) — "either move would be scope creep
into an INT operation whose entire value proposition is that nothing outside the
reviewed candidate changed."

It still needs fixing. A permanently red credential guard cannot distinguish a
real credential from this noise, and the noise is my own finding-ID convention.

## Missed by the prior acceptance

None. They went looking for the exact shape that caught me last time — a gate
nobody runs — and audited every `npm run` script against what was exercised. The
three unrun ones are each explainable: `format:check` is a deliberately removed
gate in this project (it breaks source-pinning guard tests), and `db:mod1r-proof`
covers an unrelated prior feature with zero references in the phase03a tree.
