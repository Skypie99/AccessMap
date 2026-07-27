# SHIP-READY Phase 1 — DECISIONS

Records every Sky pick + every audit-level judgment call (with rationale). Sky writes her picks in §SKY.

## §J Judgment calls made by the audit (execution-level, reversible, all read-only)

- **J-1 (2026-07-26)** Simulator evidence tier SKIPPED this train: local sim builds fail on untouched main (fmt pod vs Xcode 26.6 — fix lives on in-flight `fix/fmt-xcode26-local-sim-2026-07-25`, SEAM) and sim-MCP attach is broken. Evidence = web (static export) + code-inferred + NEEDS-SKY-DEVICE; binary-launch honesty stated top-line in 05.
- **J-2 (2026-07-26)** Brink protocol: live walks never click terminal mutating controls — the export talks to production Supabase. Submission efficacy is code+jest evidence. (An audit that inserts prod rows isn't read-only.)
- **J-3 (2026-07-26)** Live-DB drift check: only read-only Supabase MCP calls (`list_migrations`/`list_tables`/`get_advisors`) and only if the connected MCP project provably resolves to AccessMap; otherwise skipped and all SQL findings tagged `repo-inferred`. No SQL executed against the live DB in any case beyond those listed read-only calls.
- **J-4 (2026-07-26)** Reports are left UNTRACKED (repo convention: design-reviews/** is working-tree governance, untracked-by-design; R2/device-tune precedent). Sky may commit them like she did prior trains' docs — her call, noted for visibility.
- **J-5 (2026-07-26)** Evidence-tag vocabulary aligned with the established render-index set (`verified/web-approximated/code-inferred/NEEDS-SKY-DEVICE`), with `web-verified` reserved for functional truths the web build CAN prove. Rationale: consistency with device-tune/R2 index conventions.

- **J-6 (2026-07-26, recovery window)** Window-death recovery method: the original session died at 18:32 with three cluster walkers mid-run and the finished SQL sweep unbanked. Recovery = transcript mining (the SQL report banked VERBATIM as `04b_…RECOVERED.md` — zero transcription risk beats re-derivation), then three fresh agents each given their predecessor's transcript + original brief verbatim, instructed to mine-first/complete-gaps-only, with `[recovered]`/`[fresh]` provenance tags and §NOT-VERIFIED sections. No banked work was re-run; two predecessor FAILs were retracted as probe artifacts with evidence. Provenance: Fable 5 both windows.
- **J-7 (2026-07-26)** Traffic law held through recovery: the visual sweep launched only after a cluster walker completed (≤2 concurrent live walkers at all times); the surviving :8082 serve + export from the dead session were reused rather than rebuilt (same commit `512494a` — verified before reuse).
- **J-8 (2026-07-26)** SR-104/SR-105 (web SR-proxy + dropped map fit) graded HIGH **web-cohort**, not submission-blocking: the App Store artifact is the native binary, where SR-104's API is real and SR-105/107's native twins are unconfirmed (device rows). They remain HIGH because the web build is both the audit's guest-evidence proxy and a potentially user-facing surface; 05 R-13 carries the grading rationale.

## §SKY Sky's picks (empty — Phase 1 produces decisions, Sky makes them here or in 05's checklists)

_(picks recorded 2026-07-26 — see below)_

### §SKY — Ship-Ready Phase 1 picks (2026-07-26)

- **SQL slate:** APPLY ALL (post 04b §E queries 1+9 check) — rollbacks in hand
- **B-5 iPad:** IPHONE-ONLY (deliberate; iPad = future project if demand)
- **B-1 report-content:** BUILD W1 (auth-gated, F10 no-user-id shape, per fork briefs)
- **R-11 crash reporter:** ADD — crashes only, no analytics; disclosed in privacy rewrite
- **R-15 dead tables:** KEEP — flag_verifications reserved for C1 (documented)
- **SR-111 entry surface:** RATIFIED as-is

- **RLS pre-check** (04b §E q1+q9, 2026-07-26): **PASS** — `flags_user_scoped` is `ALL`/`{PUBLIC}` but owner-scoped (`USING`/`WITH CHECK` = `user_id = auth.uid()`), **not** `auth.uid() IS NOT NULL`; §F-1's CRITICAL hypothesis is falsified and non-owner DELETE of any flag is closed. q9 confirms `flags_close_nonowner_delete_and_fix_triage_20260601` (20260602060359) applied **after** `restore_flags_auth_user_only_triage_unblock_20260601` (20260602053522). SQL-slate precondition discharged.

---

## §J2 Judgment calls made during Phase 2 (execution-level, all reversible)

- **J2-1** The escape prop goes on the **containment node, not `<Modal>`** — RN 0.81.5 forwards an explicit
  allowlist and drops it. 03's G1 as written would have shipped zero behaviour with every proposed guard
  green. This supersedes 03 §2.1(B) and §3 G1's placement instruction; everything else in 03 stands.
- **J2-2** The escape pass was split into **six commits**, not one. J2-1 turns G1 from a mechanical prop
  insertion into a per-surface "identify the containment node" edit, and one commit would have put the
  PRESERVE-VERBATIM drawer and the behavioural guards inside the same revert.
- **J2-3** `flag_comments` uses one shared `COMMENT_SELECT` constant rather than two literals. Fixing one site
  and not the other is exactly how B-7 shipped as two identical bugs.
- **J2-4** `isTableMissingError` gained a PGRST200/201/202 early-out. Its loose `"does not exist"` match could
  swallow a relationship error and show "Comments coming soon" — a worse lie than an honest failure.
- **J2-5** G6's cap moves to the node whose **parent** is definite, which is the KAV on FeedbackModal (one
  extra layer) and `cardShadow` on `ui/Sheet` (a fifth surface 03 did not name). 03's suggested
  `flexShrink` on the card body could not have worked: About and Help already had it and still overflowed.
- **J2-6** B-4's icon flatten was treated as agent-buildable because the transform is deterministic and
  machine-provable (0 of 1,003,245 opaque pixels changed RGB). The **upload** remains unproven — only an EAS
  build closes ITMS-90717.
- **J2-7** R-11's crash reporter was **not** added despite Sky's ADD pick: it is a native module plus a DSN
  credential, and no agent handles credentials. Only the false comment was fixed.
- **J2-8** `expo-media-library`'s removal **required** deleting its two dead `jest.mock()` blocks in the same
  commit — a factory does not bypass module resolution. Confirmed empirically (both suites failed at load).
- **J2-9** W1 ships behind an explicit `DISPUTE_ENABLED = false` constant rather than a capability probe: the
  probe pattern selects the column, and `dispute_requests` does not exist, so it would 42703 the whole flag
  fetch and take the map down.
- **J2-10** The hide list is keyed on **content id, not author id** — most AccessMap content has no author
  (anonymous flags are `user_id IS NULL`), so "block this author" would hide every anonymous report.
- **J2-11** Exactly **one** new visible string shipped (the privacy-link label), as a PROPOSED constant in
  `copy.ts` per Sky's ratified approach, registered as a new BP16 row. `SettingsRow` gained an optional
  `subtitle` so the new row ships title-only rather than inventing a second line.
- **J2-12** G3 grabbers were **not built**. 03's "reuse the pill verbatim" is not buildable: `borderStrong` is
  undeclared in all 20 stacks manifests and lands ≈1.01–1.23 over chrome glass against a 3.0 floor. Arbiter
  first, then a mockup gate, then code — "the contrast script decides, not the eye".
- **J2-13** Read-only Supabase MCP calls were used to settle the B-7 constraint name and the applied-migration
  ledger, after confirming the connected project resolves to AccessMap (per J-3). No SQL was executed beyond
  catalog reads; no migration was applied.

## §SKY-2 Decisions Sky made for Phase 2 (2026-07-26)

- **B-1 scope:** W1 inert + the client-side block/hide list (rather than W1 alone).
- **New strings:** ship as PROPOSED constants in `copy.ts` (the `RETRY_VERB` precedent), registered as BP16 rows.
- **Focus-return:** the hook + 4 adoptions, with the remainder a counted residue — never a false green.
  *(Not delivered this phase — see `07_PHASE2_REPORT.md §3`.)*
