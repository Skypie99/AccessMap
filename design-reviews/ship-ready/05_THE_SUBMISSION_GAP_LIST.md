# SHIP-READY Phase 1 — 05 · THE SUBMISSION GAP LIST

Repo @ `512494a` · 2026-07-26 · synthesized from the banked 00–04 files (per rails — no transcript reads). Detail lives in the cited file:§; rows here are the action view. Provenance: Fable 5 max effort; original window died 18:32 with ~85% banked; this list was completed by the Fable 5 recovery window from banked state + recovered agent transcripts (ledger in HANDOFF).

> ## ⚠ TOP-LINE HONESTY STATEMENT (SR-021)
> **Binary-launch evidence this train: NONE.** The simulator tier was down (fmt pod vs Xcode 26.6 — fix lives on the in-flight branch, SEAM) and no store build exists. Everything below is web-verified (static export = the guest cohort), code-inferred (+ jest 158/2227/0 green baseline), or NEEDS-SKY-DEVICE — tagged per row in the source files. **The first proof the app launches on iOS is Sky's next EAS build.** The 10-line TestFlight smoke script is §6 below — run it before anything else on the device list.

---

## §1 BLOCKING — must fix to submit (7)

| # | Gap | SR | Fix shape · owner | Detail |
|---|---|---|---|---|
| B-1 | **UGC moderation absent (Guideline 1.2)** — 0 of the 3 in-app requirements exist (filter · report mechanism · block/hide); contact info plausibly present via the mailto modal | SR-001 | Phase-2 build, **mechanism choice = SKY DECISION routed through fork-brief W1's existing option set** (auth-gated dispute is the pre-specced candidate); DB half pre-specced (admin comment-delete, 04b §C-8); **Sky words ALL text** (ToS, community guidelines, report categories — honesty fence held: no copy authored anywhere in this audit) | 04 §A-1, §C-0b; live prod evidence: an anonymous sev-5 "Verified" nonsense flag sits on the public map (01 §M ROUTED) |
| B-2 | **Privacy policy not linked in-app** (5.1.1(i) requires in-app + metadata) | SR-002 | Phase-2: visible link rows in Settings + About + near sign-up | 04 §A-2, B-17 |
| B-3 | **Privacy policy content drifted 6 ways** vs the shipped app (claims Sentry + analytics that don't ship; promises full deletion the app doesn't do; omits anon reporting + push tokens; implies account required) | — | **SKY WORDS IT** — truth-pass before the nutrition labels lock (reviewers cross-read policy vs labels); the rewrite checklist is 04 §A-14 | 04 §A-14 |
| B-4 | **App icon has an alpha channel** — ITMS-90717 upload-failure shape | SR-011 | Asset re-export (flatten onto brand blue), Phase-2 buildable | 04 §B-1 |
| B-5 | **iPad orientation config** — portrait + `supportsTablet:true` + no `requireFullScreen` = ITMS-90474 upload failure | SR-012 | One-line app.json patch after a **SKY pick**: rec `supportsTablet:false` for v1 (sidesteps the iPadOS-26 windowing debt AND the 02 §T tablet-polish debt); alt `ios.requireFullScreen:true` | 04 §A-7, §B-2; 02 §T |
| B-6 | **Reviewer demo account is dead credentials** (PROPOSE-ONLY migration, never applied) — 2.1(a) requires working creds; guest browsing does not exempt login-gated features | SR-017 | **SKY-SIDE**: provision in Auth dashboard, apply migration, verify login, put creds + "Browse without an account" line in review notes | 04 §A-9, §B-14; 00 §9 |
| B-7 | **Comments are dead in production for every cohort** — every flag detail shows a perpetual "Couldn't load comments"+Retry (PGRST201 ambiguous embed since `comment_votes` was applied); reviewer-visible broken core feature (2.1 bug-free) | SR-092 | **One-line client fix**: `users!flag_comments_user_id_fkey(display_name)` at `comments.ts:68` + `:94`; Phase-2 buildable; pair with the SR-098 table disposition | 01 §T |

## §2 RECOMMENDED — should fix, with why (ordered by leverage)

| # | Gap | SR | Why | Detail |
|---|---|---|---|---|
| R-1 | **Account-deletion Storage residue** — the avatar (a face photo) + all flag photos stay publicly fetchable forever after deletion and become permanently un-deletable; contradicts the dialog's promise, the policy, and 5.1.1(v)'s framing. **Blocking-adjacent**: graded RECOMMENDED only because the mechanism exists and Apple's letter-of-law is the mechanism | SR-049 (+SR-061 old avatars, SR-051 dialog re-tap, SR-062 dead support line, SR-059/060 doc gaps) | A deletion that leaves face photos public is the complaint shape that becomes a 5.1.1 re-review; fix = edge-function Storage sweep (Dana/Phase-2) | 01 §P; 04 §A-2/§D |
| R-2 | **The guest reviewer-path honesty cluster** — the reviewer walks cold as guest FIRST: triage buttons fire real (RLS-denied) prod writes then show a FALSE "This flag changed" dialog (SR-093); reopen form submits into silence (SR-094); history claims "not yet enabled" (SR-095); Home's "Use my location" goes permanently dead after denial (SR-041) | SR-093/094/095/041 | These four define the reviewer's first minutes; each is a small client gate/copy fix; SR-093 additionally violates the brink between cohort and prod | 01 §T, §H |
| R-3 | **Server-side anon throttle is a NULL-collapse no-op** — the only anonymous-write cap is user-clearable AsyncStorage; `feedback` is a second wholly-uncapped anon surface. **Blocking-adjacent**: not a written Apple rule, but it is the abuse surface 1.2 moderation presupposes, and it's a one-file Sky-applied fix | SR-007, SR-087 | Artifacts ready: 04b §C-5 option (a) global sliding window (recommended; option (b) per-IP explicitly NOT-VERIFIED as designable) + §C-7 feedback throttle | 04 §C-1; 04b |
| R-4 | **Read `flags_user_scoped` before trusting any RLS conclusion** — an un-versioned ALL-verbs live policy on `flags` with zero repo text; the repo is a lower bound on live permissions until its body is read; worst hypothesis re-opens non-owner DELETE | SR-039 | **SKY-SIDE, 2 minutes**: 04b §E queries 1+9 paste-block; then Phase 2 commits-or-drops it. Gates the whole §C artifact slate | 04 §C-0a; 04b §F-1 |
| R-5 | **The SQL null-safety artifact slate** — 7 defects, 11 pre-specced Sky-applied artifacts with rollbacks; includes the points-trigger NULL trap (LIVE in prod: anon-flag triage awards 0 points while the UI flashes "+3/+7"), the `context_tags` open column, status-history revival | SR-008/086/088/090 + | Apply-order law recorded (Fork-2/OA body must fold in the history INSERT — one CREATE OR REPLACE, never two); **the anti-finding is load-bearing: do NOT null-harden the delete-account early-out** | 04 §C-1; 04b §C |
| R-6 | **Sheet-overflow class** — About/Help X renders above the viewport; on touch web there is NO pointer path to dismiss; latent in Feedback/MyFeedback. Native truth = device row; **if a real device reproduces it, this row upgrades to BLOCKING** | SR-099 (mechanism for SR-064) | The G6-class fix (bound the wrapper, `flexShrink` the card) covers 4 surfaces in one shape | 01 §S; 03 §4/§6 |
| R-7 | **Password reset absent** — no `resetPasswordForEmail` anywhere; re-signup shows anti-enumeration success copy = indistinguishable dead end; a reviewer who typos a password hits a wall | SR-052 | Minimum: email reset flow; pairs with the SKY-SIDE "is Confirm email ON?" dashboard check (01 §P device list 6) | 01 §P; 04 §A-8 |
| R-8 | **Durable privacy manifest + honest purpose strings + dead dep** — app.json `ios.privacyManifests` block (survives prebuild), plugin-prop overrides killing 4 boilerplate strings (incl. microphone for a nonexistent feature), remove `expo-media-library` | SR-003/004/005/016 | Artifacts B-α + B-β are paste-ready; B-6 removal kills the add-photos string at the root; SKY-SIDE finish = Xcode Generate Privacy Report on a real archive | 04 §B |
| R-9 | **The dismissal-spec mechanical pass** — `onAccessibilityEscape` is absent on all 32 modals (VoiceOver scrub-escape does nothing app-wide); AVM missing on the 2 Name-this dialogs; 3 pageSheets lack grabbers; focus-return exists only on the drawer | SR-063/065/066/067/069/070 | 03 §3's G1–G9 are buildable verbatim (G1 is mechanical ×32 with the four guards enumerated; ReportFlagModal needs the `!submitting` guard it currently lacks — SR-068) | 03 |
| R-10 | **Points client-writable** — any signed-in user can `PATCH` their own `points`/`streak_days` (leaderboard/tier forgery); the 05-30 migration recognized the class and closed only `is_admin` | SR-048 | Column-guard fix joins the SQL slate; attaches as new context to Fork-2's option set (write-authorization axis) | 01 §P |
| R-11 | **Crash reporting decision** — nothing ships; post-submit you are blind to reviewer crashes; stale comment claims otherwise | SR-006 | Re-add a reporter or knowingly accept blindness (**SKY DECISION**); fix the `App.tsx:207-208` comment either way | 04 §B-11 |
| R-12 | **Ship-command mismatch** — `deploy:testflight` targets a submit profile that doesn't exist | SR-015 | Add `submit.testflight` or point at production; 1-line eas.json | 04 §B-7 |
| R-13 | **Web-cohort HIGH pair** (matters if the web build is ever user-facing; otherwise evidence-hygiene): every web user treated as a screen-reader user (Nearby auto-opens; list-select never recenters) + the dropped fit-to-flags race stranding no-location guests on San Francisco | SR-104/105 (+SR-100/106/107 MEDs) | Native likely unaffected (real API / spiderfy ON / ref race) — **device rows confirm**; fix shapes pinned in 01 §M open questions | 01 §M, §S |
| R-14 | **Duplicate webhook triggers** — predicted double push notification per status change; also the SR-018 `tgargs` secret residue lives in the dashboard twin | SR-089 | 04b §E query 4 settles in one read; fix = delete the dashboard webhook (SKY-SIDE) | 04 §C-1; 04b §A4-2 |
| R-15 | **Dead-table disposition ×4** — `flag_verifications`, `comment_votes` (already broke comments once), `flag_edit_history`, `notification_preferences`: all 0 rows, no app writers, live RLS surfaces | SR-009/084/098/020 | **SKY-DECISION**: keep-and-fix (artifacts ready) or drop before review (rec where trust-scoring isn't roadmapped) | 04b §F-4; 01 §T/§S |

## §3 SKY-SIDE — only she can do these

**Dashboard / Supabase (minutes each):** ① `flags_user_scoped` + full policy read — 04b §E paste-block (R-4). ② Leaked-password protection toggle (advisor WARN). ③ Webhook secret rotation + delete the dashboard DB-webhook (pairs R-14). ④ "Is **Confirm email** ON?" — decides whether the sign-up copy is truthful (SR-054 companion). ⑤ Apply the reviewer-account migration + Auth-dashboard step (B-6). ⑥ (with R-5) apply the chosen SQL artifacts in the recorded order.

**App Store Connect:** ⑦ Privacy nutrition labels — enter §A-Sheet-A **after** the B-3 policy truth-pass. ⑧ Age rating — §A-Sheet-B (expect 13+; **submitting before Sept 2026 avoids the mandatory social-media questions**). ⑨ Accessibility Nutrition Labels — declare only device-verified rows (map at 02 §D → D-A1…A13) after the device gate. ⑩ EU DSA trader declaration (or deselect EU for v1). ⑪ Metadata: name/subtitle, primary category, keywords, support URL, **screenshots (iPhone 6.9″/6.5″; +13″ iPad ONLY if B-5 keeps `supportsTablet:true`)**, review notes (demo creds + "Browse without an account" walkthrough line — Sky words them).

**Build chain:** ⑫ Confirm the next EAS build resolves an **Xcode 26** image (2026-04-28 upload floor; eas.json pins none — B-8). ⑬ APNs credentials state on the store profile (B-12). ⑭ Confirm the What's-New/changelog date + bullets before release (01 §S, S20).

**Wording (honesty fence — nothing was authored for you):** ⑮ B-3 policy rewrite · ⑯ B-1 ToS/guidelines/report-category text · ⑰ purpose-string final review (B-α) · ⑱ the coordinates-become-public disclosure line near Submit (04 §A-12) · ⑲ review-notes text.

## §4 ROUTED — belongs to an in-flight train (per 00 §7; not re-litigated here)

| Destination | What routed |
|---|---|
| **BP16 copy-gate** | All drawer-surface strings; "Unknown error" refresh fallback copy (SR-109 mechanism stays in 01 §M); push-row disabled-reason subtitle; guest Sign-out row copy; any new dismissal-spec strings (header-X label); HelpModal k≥3 caveat |
| **Fork briefs (Sky)** | Fork-2/OA points-trigger body (+ the §C-9(ii) history-INSERT fold + SR-048 write-authorization context) · W1 report-mechanism option set (+ Apple 1.2 context, B-1) · Fork-1 proximity (SF fallback region — SR-105's native twin bears on it) · Fork-5 trust surfaces (SR-009 fix-or-drop) |
| **Device-tune** | F-20 Home banner (rec stands: leave alone) |
| **F-22 (parked)** | RN-web a11y-prop no-op residue (126 bare sites; `decorativeProps` fix pattern); background-scene ARIA presence; dup "Use my location" nodes under modals |
| **`fix/fmt-xcode26-local-sim` branch** | Local sim build failure (the reason this train has no sim tier) |
| **R1/R2/device-tune CLOSED ledgers** | Zero re-finds registered — the conservation check (§7) greps it |

## §5 IMPROVEMENT SLATE (honest, tagged, no quotas — none block submission)

**Trust/product coherence:** SR-053 dual streak systems (UI reads local visit-streak; server writes contribution streak — unify) · SR-096 Mine-scope false "All caught up" celebration · SR-095/094 copy siblings beyond R-2's minimum · SR-043 Home count/CLOSEST page-1 window math (latent at 9 flags) · SR-044 Home never revalidates.
**A11y polish (02 §D):** SR-074 rotor custom-actions on Tasks cards (~5× cheaper VO traversal; PROTECT-adjacent — Dani/Sky judgment) · SR-075 three SeverityDisc uncapped sites · SR-076 bulk-label web ellipsis · SR-078 tab-bar middle-path at AX sizes · SR-079 Settings announce voice · SR-080 photo alt text (data-model limit) · SR-081 badge shrink interplay · SR-091 two unpaired shrink floors · SR-058 live-region retention · SR-072 Legend unlabeled shell (test gap confirmed) · SR-073 two raw backdropFilter sites (RT bypass shape).
**Dismissal beyond R-9:** G4 focus-on-open ×17 · G5 `useSurfaceTrigger()` generalization · G7 Nearby focus-return · G8 bulk-bar BackHandler · the 3 mockup-gate candidates (03 §7: grabber styling · ReportFlagModal header-X · SignIn Back placement).
**Code hygiene:** SR-097 + SR-110 dead styles (≈30 keys) + HeatmapLayer orphan · SR-019/SR-060 stale docs/docblocks · SR-036/037 anon-limit key + silent write · SR-102/103 straggler raw Alerts · SR-101 guest Sign-out row gate · SR-013 dark splash · SR-014 Android adaptive icon.
**Engineering guards:** SR-038 E2E harness (Detox/Maestro — the un-mocked-Supabase gap SR-092 exposed is the argument) · SR-034 automated 44pt guard · SR-033's single-guard box-none coverage · SR-082 FlashBanner RM test · a contract test pinning PostgREST embeds against the live schema (SR-092's class) · 04b §F-3 regenerate schema.sql from `pg_dump` · C-11 initplan perf artifact.
**Visual sweep additions (02 §S — landed; the sweep's headline is POSITIVE: dark mode complete on every surface, PROTECT grammar + honesty overlays unregressed both themes, all reached loading/empty/error moments read designed):** SR-111 entry-surfaces-are-brand-dark pattern in light mode (**Sky taste-ratify** — consistent + deliberate, or ask for a light variant) · SR-112 two-primary-blues divergence in dark (pre-glass `brand`+white vs glass ctaFill — **ROUTED→Phase 2 arbiter**, no token change proposed) · SR-113 uneven disabled-dim on the bulk trio (dark, polish) · SR-114 Leaflet attribution stays light over dark tiles (web engine only) · three BP16-owned copy drifts live-confirmed (Resolved/Resolve · Colour/colors · My Feedback casing — already in BP16's gated §A picks).

## §6 THE 10-LINE TESTFLIGHT SMOKE SCRIPT (SR-021 — run FIRST on the store build)

1. Cold-launch in **airplane mode**: wall (or guest fork) reachable, no splash hang (SR-035 native leg).
2. Relaunch online → onboarding 5 cards → **deny location** → Home: does "Use my location" recover or die (SR-041)? → Map: framed on Kelowna flags or stranded (SR-105 native twin)?
3. "Browse without an account" → Map: tap the coincident downtown cluster — does it **spiral** (SR-107 native)? Nearby: auto-open behavior + row-select → recenter (SR-104 native)?
4. Anonymous report end-to-end — **the first true submission-efficacy proof** — then check the 5/day counter message.
5. Sign in (demo account) → verify + resolve a flag → points flash matches trigger values; StatusHistory shows the transition **only if** R-5's C-9 was applied (else "No history yet" is expected — SR-088).
6. Report WITH photo → confirm EXIF/GPS strip (existing checklist §7) + photo renders in detail.
7. Open About + Help sheets: is the X on-screen (SR-099 native truth — **upgrades R-6 to BLOCKING if clipped**)?
8. VoiceOver: two-finger-Z scrub on any modal (expect nothing pre-Phase-2 — SR-063 baseline), then the Name-this dialogs' focus containment (SR-065).
9. Dynamic Type at AX5: Home → Tasks → Profile → Report walk (02 §D D-A1; photograph clipping).
10. Delete account → signed out; then fetch the old avatar URL from another device (SR-049 evidence — expect it still serves until R-1 lands).

## §7 CONSOLIDATED NEEDS-SKY-DEVICE (one list; references, not duplicates)

The **standing device-tune 20-item list** (device-tune/DECISIONS §A) remains open and is NOT repeated here. This train adds, grouped by session (SR refs point at the full rows):
- **Session A — cold guest walk:** §6 script lines 1–4 + 7 (covers SR-035/041/104/105/107/099 native legs + submission efficacy).
- **Session B — signed-in flows:** §6 lines 5–6, 10 + SR-054 (type a real email — does autocorrect mangle it?), SR-051 dialog states at large type, sign-in modal Back reachability, avatar HEIC/denied-permission copy (01 §P list).
- **Session C — assistive tech:** 02 §D's D-A1…D-A13 (the Accessibility-Nutrition-Label unlock map: Larger Text, VoiceOver, RM camera-jump, RT opacity, Differentiate-Without-Color) + 03 §6's 8 rows (pageSheet swipes, AVM truth, modal-over-modal stacking, drawer contract intact post-G1).
- **Session D — physical-world:** share sheet (01 §T), airplane-mode refresh vs the 12s/30s ladder (01 §M), triage haptics (BP3 contract), photo-bearing flag pass (needs a seeded photo flag — 01 §T device 3).

## §8 Registry disposition proof (conservation)

All SR-001…039 registry items dispose exactly once across 01–04 (finding · ROUTED · closed-with-evidence); the close-out grep in HANDOFF is the machine check. New findings this audit: SR-040…110 (+ next free SR-111). Zero re-finds of R1/R2/device-tune CLOSED ledger items were registered by any agent (each brief carried the ledgers; spot-grep at close-out).

**STOP.** Phase 1 is read-only; nothing was committed. Sky reads this file top-down, records picks in `DECISIONS.md §SKY`, and fires Phase 2.
