# Proposal — GitHub Actions CI (typecheck + lint + test)

**Status:** PROPOSED — not added yet. Adds a single `.github/workflows`
file. No new npm dependencies; runs whatever scripts are already in
`package.json`.
**Owner to approve:** Sky (skylerhalisky@gmail.com)
**Author:** Gary (safety-net pass, 2026-05-23)
**Estimated effort:** ~3 minutes to drop in the file and push.

---

## Why

Today, the only safety net that runs on a PR is the human reviewing the
diff. CI gives every change a free, consistent check before it lands.

The proposed workflow runs three things:

1. `npm run typecheck` (already exists, already green)
2. `npm run lint` (lands with the lint proposal)
3. `npm test` (lands with the test proposal)

Each runs independently so a failure in one doesn't block the others
from reporting.

---

## Exact steps

```bash
cd ~/AccessMap
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        check: [typecheck, lint, test]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install deps
        run: npm ci --legacy-peer-deps

      - name: Run ${{ matrix.check }}
        run: |
          if [ "${{ matrix.check }}" = "test" ]; then
            npm test -- --ci --coverage
          else
            npm run ${{ matrix.check }}
          fi
```

Commit + push:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions for typecheck + lint + test"
git push origin <your-branch>
```

The first PR will then show three green checks (or red ones if a check
fails — both are useful).

---

## Notes

- The matrix runs the three checks in parallel — a typecheck failure
  doesn't hide a lint failure (`fail-fast: false`).
- `npm ci --legacy-peer-deps` matches the install pattern needed by
  `react-leaflet 5` (see CLAUDE.md "Gotcha #2").
- The `test` matrix entry runs with `--ci --coverage` for stable output
  + a coverage line in the log (no upload yet — that's a later task).
- The workflow is repo-relative — if AccessMap is moved into a GitHub
  org, no changes are needed.

---

## Risk

Low. The workflow ONLY runs on push/PR — it doesn't deploy, doesn't
write to the repo, doesn't touch Supabase. If it fails, the PR is
blocked from auto-merge but anyone can still manually merge.

Reversible by deleting the file.

---

## What this enables, later

Once CI is in place:

- **PR comments** for coverage drops (Codecov, etc.) — free for public
  repos.
- **Required status checks** before a PR can merge — set in GitHub repo
  settings, no code change.
- **Scheduled runs** so the supabase/schema.sql canary stays green over
  time (would need a Supabase test project).
