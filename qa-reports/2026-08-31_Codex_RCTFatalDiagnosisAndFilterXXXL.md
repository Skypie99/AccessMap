# RCTFatal Diagnosis and Filter XXXL Acceptance

Date: 2026-08-31

Worktree: `/Users/skypie/AccessMap-codex/final-polish-consolidation-20260831`

Branch: `codex/final-polish-consolidation-20260831`

Runtime receipt before diagnosis: `c283f1f2eb12383e4ce7ea9c1cf4c7878570ece4`

Source repair under test: `76ee3559fb8fad03f52ec3609c0fe5fbd33b2f0b`

## Outcome

**RCTFATAL ROOT CAUSE:** The temporary `node_modules` symlink pointed into another worktree. Expo therefore loaded `AppEntry.js` from that other worktree and resolved its relative `../../App` import against the wrong checkout. Metro's actionable error was:

```text
Unable to resolve "../../App" from "../final-ui-stabilization-build32/node_modules/expo/AppEntry.js"
```

The candidate's `package.json` and `package-lock.json` hashes exactly matched the dependency worktree. Replacing the cross-worktree symlink with a lockfile-exact local installation fixed the startup failure. A clean Metro launch then bundled from this candidate's own `node_modules/expo/AppEntry.js` and the app loaded normally.

| Classification | Result |
| --- | --- |
| Source defect | NO |
| Runtime/dev-client defect | YES — local Metro/dependency-path attribution |
| Source changed | NO |

## Focused Runtime Acceptance

| Check | Result |
| --- | --- |
| Filter & Sort at Accessibility XXXL | PASS |
| Reports controls readable | PASS |
| Category controls readable | PASS |
| Sort controls readable | PASS |
| Clipping, overlap, or hidden bottom row | NONE |
| Dynamic Type restored to Large | PASS — slider returned from 100% to its original 27% position |

At Accessibility XXXL, the expanded Filter & Sort sheet rendered every Reports, Category, and Sort control on screen. Labels wrapped and reflowed without collision or truncation, and the full Sort row remained reachable. The content fit the available height on the tested iPhone 17 Pro simulator, so no overflow scroll was required.

## Runtime Repair

- Removed only the temporary cross-worktree `node_modules` symlink.
- Ran `npm ci --legacy-peer-deps --offline`: 1,142 packages installed from the existing cache; 0 vulnerabilities reported.
- Started the exact candidate with `npm start -- --dev-client --localhost --port 8086 --clear`.
- Stopped both temporary Metro instances after acceptance.
- Did not read, print, copy, or modify environment values.

## Gates

| Gate | Result |
| --- | --- |
| Actionable Metro exception captured | PASS |
| Candidate source attribution after repair | PASS |
| Candidate startup | PASS |
| Filter & Sort Accessibility XXXL | PASS |
| Dynamic Type restoration | PASS |
| Product-source diff | CLEAN |
| Broad tests | Not re-run by request |
| EAS | Not launched |
| Supabase/production | Untouched |

## What Changed

- Added this QA receipt only.
- Product source and configuration are unchanged.

## What's Left

Nothing for the user-authorized Filter & Sort XXXL check. This narrowed confirmation did not re-run the other runtime surfaces from the broader acceptance request.

## DECISIONS FOR SKY

None. The startup failure was local runtime attribution, the requested XXXL check passed, and the Simulator setting was restored to Large.
