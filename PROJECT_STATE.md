---
# AccessMap — Project State
*Last updated: 2026-05-30 by Morgan*

---

## Phase 4 — COMPLETE ✅ (on main)

All Phase 4 work is merged to main and shipped.

| Feature | Status |
|---|---|
| Multi-photo gallery | ✅ merged |
| Flag comments | ✅ merged |
| Flag reopen | ✅ merged |
| Rate limiting (anon + auth) | ✅ merged |
| Accessibility fixes (a11y) | ✅ merged |
| Test coverage (unit + integration) | ✅ merged |
| Security audit (Steve gate) | ✅ passed |

---

## Phase 5 — IN PROGRESS 🔄

**Target:** App Store submission readiness.

| Feature | Status | Branch |
|---|---|---|
| Onboarding carousel (5 slides) | ✅ merged to main | — |
| Disability category filtering | ✅ merged to main | — |
| Anonymous viewing (migration live) | ✅ live | — |
| Anonymous reporting (migration live) | ✅ built, pending merge | feat/phase5-anon-reporting |
| Admin moderation MVP | ✅ built, pending merge | (on feat/phase5-anon-reporting) |
| Sentry removed (crash fix) | ✅ built, needs EAS rebuild | pending |
| Community trust score | 🔄 Shamus building | feat/phase5-trust-score |
| Android push notifications | ❌ blocked | google-services.json not in EAS |

### Open Decisions — Phase 5
- **Trust score thresholds:** Approved → Bronze 0 pts, Silver 100, Gold 500, Diamond 1500
- **Anon reporting global cap:** Approved — live in migration
- **Push notification tone:** Approved — Option B (warm community copy)

---

## Phase 6 — IN PROGRESS 🔄

**Target:** App Store submission.

| Item | Status | Notes |
|---|---|---|
| Privacy policy | ✅ live | https://skypie99.github.io/AccessMap/privacy/ |
| App Store listing copy | ✅ written | docs/APP_STORE_LISTING.md |
| Full visual polish | ✅ merged | Dani phase 5 + 6 polish |
| Pre-launch WCAG audit | ✅ merged | Alex Phase 6 sign-off |
| Push notification copy | ✅ approved | Option B warm tone |
| Release workflow (RELEASING.md) | ✅ written | 2-command TestFlight process |
| App Store screenshots | ❌ needed | 6 required; plan in docs/APP_STORE_SCREENSHOTS.md |
| Test account for App Store reviewer | ❌ needed | Sky to create a demo account |
| Privacy policy URL in App Store Connect | ❌ needed | Add https://skypie99.github.io/AccessMap/privacy/ |

---

## What Needs to Ship Before Submission

1. **Merge feat/phase5-anon-reporting** → gets anon reporting + admin moderation onto main
2. **Rebuild EAS** after Sentry removal (pending google-services.json for Android push)
3. **Trust score** — Shamus completes, QA gate, merge
4. **App Store screenshots** — 6 screenshots (plan ready in docs/)
5. **Test account** — Sky creates a reviewer demo account
6. **App Store Connect** — enter privacy policy URL

---

## EAS / TestFlight State (as of 2026-05-30)

- Apple Dev Team: S78F8ZA8QU
- Provider: 128969691
- Build 2e91ae9b installed on iPhone — sign-in ✅, map ✅
- ReportFlagModal layout fix: committed dfb9af7
- SQL function `net.http_post` — missing on Supabase free tier; push webhook blocked until resolved
- ASC App ID: still needed in eas.json before automated TestFlight submit

---

## Branches Pending Merge (as of 2026-05-30)

| Branch | Contains | Gate |
|---|---|---|
| feat/phase5-anon-reporting | Anon reporting + admin moderation | QA pass ✅ → merge |
| feat/phase5-trust-score | Community trust score | Shamus building 🔄 |

---

## Team Roles

| Role | Agent | Domain |
|---|---|---|
| PM / Status | Morgan | This file, decisions, routing |
| Feature build | Shamus | New screens, UI, functionality |
| Design + polish | Dani | Design system, visual QA |
| Backend / DB | Dana | Schema, migrations, RLS |
| DevOps | Rory | EAS, CI/CD, release pipeline |
| QA | Gary | Tests, lint, CI safety |
| Accessibility | Alex | WCAG 2.2 AA, UX polish |
| Performance | Peter | Speed, query, render |
| Security | Steve | Auth, RLS, hardening |
| Privacy / Legal | Jordan | PIPEDA, data practices |
| Docs | Will | READMEs, CLAUDE.md, guides |

---
