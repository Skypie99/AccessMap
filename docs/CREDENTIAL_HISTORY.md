# Credential History — dead literals in published Git history

**Status:** current as of 2026-09-03 (Flagstone PHASE-01, TASK 00B).
**Scope:** repository hygiene. **This is not an open security incident.**

This file exists because the honest answer to "are there credentials in this repo's history?"
is *yes* — and the honest follow-up is *they are dead, and the history cannot be rewritten*.
Both halves matter. Anyone who finds a credential-shaped string in an old commit should land
here rather than re-raising a resolved incident or, worse, reusing the value.

**No value is reproduced in this file.** Carriers are named by path and shape only.

---

## 1. The two historical literals

| # | What | Where it entered | Live today? | Rotation needed? |
|---|---|---|---|---|
| (a) | Supabase notify-webhook secret (64 lowercase-hex) | `supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql` | **No** | **No** |
| (b) | App Store reviewer demo-account password (14 chars) | originally `docs/APP_STORE_REVIEWER_NOTES.md` + a migration comment | **No** | **No** |

### Why each is dead — the evidence

**(a) Webhook secret.** Rotated into Supabase Vault on 2026-06-03, and the trigger that consumed
it was dropped on the live project. Re-verified 2026-09-03 against the live project
(`kldlwszpfkdmsjrjhjym`): the Vault `webhook_secret` **does not match** the committed literal.
The historical value therefore authenticates nothing.

**(b) Reviewer password.** The literal sat in HEAD of a public remote for roughly 62 days from
2026-05-31. Two redactions (`c51c46a`, `f8aa4f6`) cleaned the primary carriers, and the account
was rotated out-of-band on 2026-08-13. Re-verified 2026-09-03: the reviewer-pattern address that
matched the leaked value has **zero rows** in `auth.users`; the reviewer account actually in use
was created 2026-09-01 and has signed in successfully. The literal is not the live reviewer
credential, and it was not reused.

> **Owner decision, 2026-09-03: do NOT rotate either credential.** Rotating the reviewer account
> mid-review would disturb the submitted Build 33 App Store review for no security benefit.
> Reopening either of these as a live incident requires *fresh direct evidence* that the value is
> live or has been reused — not simply rediscovering it in history.

---

## 2. What is — and is not — cleaned

**Cleaned (working tree).** As of 2026-09-03 the canonical tree carries **no** free-standing copy
of literal (b). The last tracked carrier,
`design-reviews/sim-walk/2026-08-19/PROMPT_AUTHED_PASS.md`, was redacted in TASK 00B.

**Deliberately NOT cleaned (one file).**
`supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql` still contains literal
(a), on purpose. See §3.

**NOT cleaned, and NOT authorized to be cleaned: published Git history.** Both literals remain
reachable in old commits, on this repository's public remote. A census on 2026-09-03 found the
webhook literal on **10 refs, 3 of them public**.

**Rewriting that history is not authorized.** It would require a force-push over published refs,
would break every existing clone, worktree, and recorded SHA — including the release control
plane's own pinned identities in `release/current.json` — and would buy nothing, because the
values are already dead and already public. Any proposal to rewrite history is a separate,
explicit owner decision.

**So:** treat every credential-shaped string in this repository's history as **public and dead**.
The correct response to finding one is to confirm it against this file, not to rotate anything and
not to rewrite anything.

**The one hard rule:** *no current or future active configuration may reuse either historical
value.* They are burned. Generate new ones.

---

## 3. The immutable historical carrier

`supabase/migrations/20260529181141_notify_flag_status_webhook_trigger.sql` is **not ordinary
source** and must not be edited to satisfy a scanner.

Its own header records what it is: reconstructed verbatim from the hosted Supabase migration
ledger (`supabase_migrations.schema_migrations`, version `20260529181141`, hosted name
`notify_flag_status_webhook_trigger`) during the 2026-08-28 migration-history truth repair.
`qa-reports/2026-08-28_MigrationMapRepair_Evidence.md` books it as `RECONSTRUCTED` within the
69/69 hosted-parity set.

Editing it would falsify a file that documents itself as verbatim, and would break the
hosted↔local migration parity that repair deliberately established. **Migration reproducibility
outranks cosmetic scanner cleanliness.**

It is therefore classified as an **immutable historical carrier of a dead credential** and carries
a single, argued entry in the `ALLOWED` array of
`src/__tests__/noCredentialsInTree.guard.test.ts`. That entry is anchored on the HTTP **header
name** on the offending line, never on the value. Test `D` fails if the entry ever stops matching
a live finding, so the exemption cannot rot into a silent blanket pass.

Canonical treatment of migration history is deferred to **PHASE-02**.

---

## 4. What the guard now catches (and what it does not)

`src/__tests__/noCredentialsInTree.guard.test.ts` runs in CI via `npm run test:ci`. Before
2026-09-03 it was **green-but-blind**: it reported 0 findings while both literals sat in the tree.

Two structural gaps caused that, both now closed:

1. **The topic gate skipped whole files.** A file was scanned only if it contained review/demo
   *account* language, which put the entire non-login secret class — webhook secrets, API keys,
   bearer tokens, service-role keys — outside the guard by construction. That gate now scopes the
   two *login* detectors only.
2. **Every hex token was excused as a digest.** `^[0-9a-f]{7,64}$` returned "not a credential" —
   which is exactly the shape `openssl rand -hex 32` produces, the shape this repo's own webhook
   README tells you to generate. A new **Detector 3** matches non-login secret labels and opts
   into long hex (≥ 32 chars; shorter hex is still treated as a SHA prefix).

Detector 3 was measured across all 1,783 tracked files: **1 finding, 0 false positives** — the
immutable carrier in §3, and nothing else.

**Known limitation, deliberately accepted.** The guard still cannot see a credential mentioned in
*prose* — inline code in a sentence, with no `label: value` pair. That is the shape literal (b)
had. A prose/inline-code detector was built and measured during TASK 00B and **rejected**: across
the tracked tree it produced 16 findings of which only 1 was real, the other 15 being ordinary
code identifiers (`secureTextEntry`, `textContentType`, `autoComplete`) and a non-secret App Store
Connect Key ID. Shipping it would have meant either a red CI or an allowlist large enough to
defeat the point. Prose carriers remain a **review** responsibility, not an automated one.

**Neither gate discloses what it catches.** The Jest guard reports `path:line → shape` only. The
`.husky/pre-commit` hook used to `echo "$MATCHES"`, printing up to five raw offending lines — the
secret itself — into the developer's scrollback and any log capturing it. As of 2026-09-03 it
prints a length-and-character-class shape instead, matching the Jest guard's discipline: a real
catch never leaks the thing it caught.

---

## 5. If you find a credential-shaped string

1. **Is it in this file's §1?** Then it is a known dead literal. Do nothing. Do not rotate. Do not
   rewrite history.
2. **Is it in the working tree and not §1?** Treat it as live until proven otherwise and follow
   `docs/SECURITY_INCIDENT_RESPONSE.md`.
3. **Never paste the value** into an issue, a report, a commit message, or a chat. Reference it by
   path, line, and shape — the same discipline both gates follow.

---

*Related:* `docs/SECURITY_INCIDENT_RESPONSE.md` · `docs/SUPABASE_SECURITY.md` ·
`src/__tests__/noCredentialsInTree.guard.test.ts` · `.husky/pre-commit` ·
`qa-reports/2026-09-03_Phase01_SourceConvergence.md`
