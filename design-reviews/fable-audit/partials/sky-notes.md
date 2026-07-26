## §Sky-decision notes

Everything the UI audit observed that touches backend / data-logic / privacy-architecture / product-scope — observed and framed, **never prescribed**. These are Sky's calls; several are the load-bearing questions behind the CRITICAL/HIGH findings and cannot be resolved by a UI fix alone.

```
DECISIONS FOR SKY (fenced — backend / data / privacy / scope; observed, not prescribed)

1. PROXIMITY ARCHITECTURE (behind CRITICAL L3-2, HIGH L7-03). The "N flags nearby" pill and
   the whole FIND promise assume a geo-scoped query, but every flag fetch is a global
   most-recent page with NO lat/lng predicate (flags.ts:606-615/:652-671) and no viewport
   re-scope (no onRegionChange on either PlatformMap). This is a DATA-LAYER decision, not a
   copy fix: does AccessMap add bounded/`ST_DWithin`-style spatial queries + a region-change
   fetch, or does the UI stop claiming "nearby" until it can? At 5 flags it is invisible; at
   real scale, pin-absence reads as barrier-absence — the mission's dangerous failure mode.

2. THE POINTS ECONOMY & ITS HONESTY (behind HIGH L3-4). The actor-bonus trigger condition
   `auth.uid() <> NEW.user_id` (schema.sql:163-165) is SQL-NULL, not TRUE, for anonymous flags
   (NEW.user_id IS NULL) — so triaging an anon report awards 0 while the UI flashes "+3/+7".
   The fix is a one-line trigger change (`IS DISTINCT FROM`) — a DB migration, Sky-applied,
   never auto-run — OR a UI suppression. Also: CLAUDE.md's "Database" section still teaches the
   OLD 5/2/10/5 values while the live trigger + UI use 10/3/15/7 (schema.sql:112 carries an
   unresolved "DECISION PENDING (Sky)"); the doc drift invites a future regression of the
   honesty chain even though the shipped UI is currently truthful.

3. THE AUTH WALL & THE GUEST CONTRACT (behind CRITICAL L3-1, HIGH L8-4/L8-4a/L1-2). The product
   ships THREE silently-different guest capability cliffs (no FAB, no photo, no saved places,
   no quick-fill) AND documentation that contradicts the shipped gates (HowToHelp/Help/SignIn
   copy tells guests to use auth-only affordances / implies reporting needs an account while
   anonymous reporting is live). Guests are even shown Verify/Resolve/Reject buttons the RLS
   deterministically refuses, with a fabricated "changed by someone else" error. The
   cross-cutting question is a PRODUCT one: what is the guest contract, and should the web
   build (which IS guest mode) request location and expose a real sign-in path at all? UI fixes
   follow from that decision; they cannot precede it.

4. K-ANONYMITY / HEATMAP POSTURE. The heatmap's k>=3 protection + the user-scoped offline cache
   (a deliberate privacy choice — Jordan Condition 2) are sound; the audit did not undermine
   them. Two observations only: the "Show saved data" banner never states data AGE (L7-02), and
   the k-anonymity caveat copy is honest but terse. Both are copy/UI, but the cache-scope
   decision (guests get no offline resilience) is a privacy-vs-utility call worth a conscious
   ratification, not an accident of implementation.

5. CATEGORY TAXONOMY & VERIFICATION/TRUST MECHANICS (behind HIGH L8-2, L8-3). "Verified" — the
   core trust word — is never defined at any point of decision, never shows a verifier count,
   and the built trust ledger (flag_verifications, flag_status_history, StatusHistoryModal) is
   unreachable from the map. And untrusted content ("BUMBAKLOT · verified · sev 5") wears full
   institutional confidence with no in-place report/flag-as-wrong affordance — moderation lives
   only on an auth-gated tab behind a paid trigger. Surfacing the ledger + a counter-affordance
   is a TRUST-MODEL scope decision (how much verification provenance to expose, and whether
   guests can flag content) with UI consequences, not the reverse.

6. PRODUCT NAME COLLISION (L8-18, text-inferred). "AccessMap" collides with the established UW
   Taskar Center product (accessmap.io) in the very same sidewalk-accessibility niche — a
   naming/brand-strategy call outside this audit's scope but flagged because it affects
   distinctiveness and discoverability.

7. THE ONE EAS TESTFLIGHT BUILD (context, not a request). Every glass wave + this audit converge
   on the same gate: the device-only truths (true blur feel, VoiceOver traversal incl. the
   load-bearing L6-04 flattening check, Reduce Transparency, real Dynamic Type, Apple light
   tiles, EXIF strip) can only be settled on Sky's iPhone. The audit is READ-ONLY and never
   built; the build remains Sky's, as does every merge.
```
