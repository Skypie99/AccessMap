# FDA-028 — coordinated rollout constraint

**This task does not solve the constraint. It identifies the exact downstream dependency and the safest sequencing.** No minimum-version gate is introduced and no forced app update is proposed here — both are explicitly out of scope for this task and would be separate owner decisions.

## The four facts, verified

**1. Build 33 clients depend on the pre-limiter guest-ingest path.**

`release/current.json` pins the shipped app at version **4.1.1 / iOS build 33**, source `f5594171e75bc5ec92a87d0392c361601ddedfba`. In that source the guest flow is `ReportFlagModal.tsx:655` → `checkAnonRateLimit()` (AsyncStorage) → `:680` `createAnonFlag()` → `:687` `recordAnonSubmit()`, and `createAnonFlag` performs a **direct `INSERT` into `public.flags`** (`src/lib/flags.ts:1773`). Guest feedback does the same at `src/lib/feedbackStore.ts:83`. Those inserts are admitted today by `"flags anon insert"` and `feedback_insert_self_or_anon`.

**2. Revoking direct anonymous INSERT before a compatible client ships breaks guest reporting.**

Nothing in the shipped client calls an Edge Function or an RPC for guest submission. The moment `anon` loses `INSERT`, every Build 33 install fails at the point of submission. Guest reporting is not a peripheral feature — it is the path an App Store reviewer reaches first, and the app is currently **`appStore.status: submitted_for_review`**.

**3. Retaining direct INSERT leaves the enforcement bypass open.**

While the permissive policies stand, any caller holding the public anon key can insert straight into `public.flags` / `public.feedback` and never touch the limiter. A limiter that can be walked around is not enforcement. Only the existing global caps (100/h flags, 30/h feedback) still apply, and those are the shared denial-of-service lever FDA-028 exists to replace.

**4. Therefore production closure requires a coordinated backend/client cutover, or another evidence-backed compatibility mechanism.** There is no database-only sequence that both closes the bypass and preserves Build 33 guest reporting. This is a structural constraint, not an implementation detail.

## Correction to an earlier claim in this generation

The v1 and v2 documents state that **"web always loads the current bundle and is unaffected."** That is **wrong for Flagstone** and is corrected here.

`release/current.json` shows web is a `web-only-descendant` overlay: production branch `release/web-4.1.1-build33-openfreemap`, pinned Vercel deployment `HMszH26wADRRDd1CqH4UkJ8kAugQ`, deployed commit `ebf091c21066d39898160b1357bde0aa35bdb8bf`, serving `flagstone.skypistudio.com` and `accessmap.skypistudio.com`. It is a **frozen Build 33 descendant**, not a rolling deployment. It does not pick up new client code on its own, and updating it is a production web deployment reserved to Sky under the release-source rules.

**Consequence: web is a legacy client too.** The cutover population is native installs *and* the pinned web deployment. Web is easier to update than an App Store binary, but it is not automatic and it is not this task's to change.

## The exact downstream dependency

> **A client release whose guest flag and guest feedback paths call the admission route instead of inserting directly — shipped to native (App Store) and to the pinned web deployment — is a hard prerequisite for revoking `anon` INSERT.**

Sub-dependencies, each currently absent:

| Dependency | State | Owner |
|---|---|---|
| Client calls admission route for guest flags | **Absent** — `flags.ts:1773` inserts directly | Phase 04 client work |
| Client calls admission route for guest feedback | **Absent** — `feedbackStore.ts:83` inserts directly | Phase 04 client work |
| Client stores and replays the opaque grant | **Absent** | Phase 04 client work |
| Native release carrying the above | **Not built** — Build 33 is under review | Sky (EAS + App Store) |
| Web deployment carrying the above | **Not deployed** — pinned to `ebf091c2` | Sky (release authority) |
| Adoption signal to decide when the tail is small enough | **Absent** — no telemetry distinguishes ingest channels | Undecided |
| Behaviour for un-updated clients after cutover | **Undecided** — no minimum-version gate, no remote config (`src/lib/featureFlags.ts` is a compile-time in-memory store) | **Sky — out of scope here** |

## Safest sequencing

Each stage is separately reversible and separately approvable. Nothing below is authorized by this document.

- **S0 — resolve F28-A.** Without a proven trusted input there is nothing worth shipping. *(Currently HOLD.)*
- **S1 — local implementation only.** Migrations plus the admission function, proven against disposable Postgres. No hosted contact. Bypass still open, unchanged from today.
- **S2 — staging proof.** Two-client isolation, reset continuity, concurrency, forgery, every alternate path, restoration. Disposable branch only.
- **S3 — deploy the admission route to production, limiter ACTIVE, direct INSERT still permitted.** The route becomes real and starts limiting clients that use it. **The bypass remains open by design** — this is an additive, non-breaking change with a config kill switch, and it breaks no installed client. It is the last stage reachable without a client release.
- **S4 — ship the client** that uses the route (native + web). Sky's release authority; requires the EAS/App Store cycle to clear, and Build 33 is currently mid-review.
- **S5 — measure adoption** until direct-insert volume is acceptably small.
- **S6 — revoke `anon` INSERT and drop the two permissive policies.** The only stage that actually closes FDA-028, and the only one that can break an un-updated client. Paired restoration migration ready.

**S3 is the honest limit of backend-only work.** Everything through S3 is reversible without touching a client; S4 onward is a coordinated release.

## What this means for the finding

FDA-028 cannot be closed by Phase 03A, by Phase 03B, or by any backend-only work, because its closure condition (S6) has a client-release prerequisite (S4) that neither phase owns. Phase 03A can deliver the **mechanism**; it cannot deliver the **closure**. Any claim that FDA-028 is closed before S6 would be false, and any plan that reaches S6 without S4 would break guest reporting for real users.

## Alternatives to a forced update — recorded, not recommended, not decided

Listed so the option space is visible to Sky. None is adopted here and each needs its own evidence.

1. **Indefinite dual path** — never revoke; accept a permanent bypass. Honest, safe for users, but FDA-028 never closes.
2. **Tighten the legacy path instead of closing it** — leave direct INSERT but lower the global caps over time. Reduces blast radius without a client release; degrades the shared-lever problem rather than fixing it, and still denies service collectively.
3. **Server-side deprecation window** — announce, then revoke on a published date. Needs a user-facing channel the app does not have.
4. **Grandfather by client capability** — requires distinguishing clients at the database, which needs a caller-supplied signal, which is forgeable. Likely a dead end; recorded so it is not re-proposed.

**No recommendation is made between these.** It is a product and release decision, not an architecture one.
