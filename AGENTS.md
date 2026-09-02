# Flagstone — repo rules for Codex

Project context (stack, file map, database, conventions) lives in `CLAUDE.md`; read it too.
Your global rules (`~/.codex/AGENTS.md`) still apply: no merge/push of `main`, no production
changes, no external sends, no secrets. Claude Code follows the same release policy below —
the two drivers must agree.

## Release source rule (HIGH PRIORITY)

Before any EAS build, App Store task, release work, production web deployment, web-demo repair
meant to match the current app, or main/release convergence task, read:

- `release/current.json` — the ONE machine-readable release control plane
- `docs/RELEASE_IDENTITY.md` — the practical policy (commands + invariants)

Then:

1. Never infer release source from branch or worktree recency, `main`, the newest commit, or
   "the branch that looks right". The manifest names the exact SHAs and trees.
2. Run `npm run release:preflight` first. It prints the real Git identity of the checkout.
   A dirty tracked tree is not a build source.
3. `eas.json` uses `appVersionSource: "remote"`: `app.json` `ios.buildNumber` is diagnostic
   only. The submitted build number comes from EAS build details / verified evidence.
4. The EAS-built source SHA must equal the intended app source SHA. `release:finalize`
   enforces it; `npm run release:verify` must pass before and after any control-plane change.
5. Web defaults to the app source (mode `exact`). Web-only divergence requires an approved
   `web-only-descendant` overlay recorded in the manifest with a receipt.
6. Vercel Branch Tracking never proves the serving deployment. Verify the serving deployment
   ID, its SHA, and every production domain independently.
7. Never repair the current web UX from stale `main`.
8. Source identity PASS and recruiter/product acceptance are separate gates.
9. Sky retains final authority for `main` merge/push, tag push, production deployment, and
   EAS / App Store submission.

If the required identity is unavailable, report `RELEASE SOURCE IDENTITY: UNPROVEN` and STOP.
Current production is intentionally served from the frozen Build 33 web branch; `main`
release-code convergence is DEFERRED and is not yours to resolve.
