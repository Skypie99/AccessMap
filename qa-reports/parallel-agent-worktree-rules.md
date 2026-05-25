# Parallel-agent worktree rules — for the next runner

When the continuous-build orchestrator spawns multiple agents in parallel,
each one should work in its own `git worktree` so the trees stay isolated.
That part already works.

What doesn't work yet, and the rule the next runner needs to follow:

---

## The footgun

`git worktree add` creates an isolated working tree at a new path. The
**absolute path** `/Users/skypie/AccessMap/` always resolves to the
*primary* worktree (the original checkout), not the agent's added one.

If an agent is told to work in `/Users/skypie/AccessMap/.claude/worktrees/agent-a/`
but then uses absolute paths like `/Users/skypie/AccessMap/src/lib/...`,
its writes go into the **primary** checkout — not its own worktree.

Two parallel agents doing this simultaneously create the exact race we
saw on 2026-05-23: one agent's spec commit landed on the other agent's
branch because both were writing to the same primary tree.

That race resolved cleanly that time (same SHA, common ancestor handled
the merge). It won't always.

---

## The rule

For each parallel agent the orchestrator spawns:

1. Spawn it with `cwd: <worktree-path>` — the **absolute** path to the
   agent's worktree, not the project root.
2. Inside the agent, **never write absolute paths to `/Users/skypie/AccessMap/...`**.
   Use relative paths (`src/lib/...`) or paths that start with the
   agent's worktree path.
3. Read or run commands? Same rule. `git`, `npm`, file reads — all from
   the worktree path, not the project root.

---

## How to verify before any write

If you're an agent and you're about to write, run:

```bash
git rev-parse --show-toplevel
```

That prints the worktree you'll actually write into. If it's the
primary checkout and you're supposed to be in a worktree, **stop** and
ask the orchestrator to re-spawn you with the correct `cwd`.

You can also confirm the current branch makes sense for your role:

```bash
git status
git branch --show-current
```

If the branch is `main` and you're supposed to be on `feat/your-thing`,
you're in the primary checkout, not your worktree. Same fix.

---

## What the orchestrator should do longer-term

(Not in this repo, but logged here for whichever Morgan ends up touching
the orchestrator code.)

The orchestrator could resolve relative paths against the agent's `cwd`
automatically — i.e., reject any tool call that uses an absolute path
outside the worktree. That makes the rule above unviolatable.

Until then: the worktree path is the contract. Use it.

---

## Reversibility

Doc-only. Delete this file if the rule above becomes baked into the
orchestrator.

— Shamus + Morgan, 2026-05-23
