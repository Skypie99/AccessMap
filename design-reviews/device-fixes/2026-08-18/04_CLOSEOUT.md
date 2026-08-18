# 04 — CLOSE-OUT (Phase B, Opus, 2026-08-18)

**Branch:** `fix/device-keyboard-admin-2026-08-18` (off `main` @ `68fce6b`) — 3 commits, **not merged. Sky merges.**
**One-writer:** confirmed clear by Sky before the first commit; no `src/` churn, no tracked edits, no git op in flight.
**DB:** zero agent-applied migrations, zero live writes. Every live query was a read. The two statements Sky applies are in `03_SQL_ARTIFACTS.md`.

| Commit | What |
|---|---|
| `6e5e7c3` | the keyboard sweep + the class guard |
| `256c361` | the admin gate stops failing silently |
| `4e884de` | a refused delete no longer reports success |

---

## Gate numbers

| Gate | Baseline (`68fce6b`) | Final | Green at every commit |
|---|---|---|---|
| Tests | 204 suites · 2972 pass · 32 todo · **3004** | 205 suites · 3000 pass · 32 todo · **3032** | ✅ |
| Typecheck | clean | clean | ✅ |
| Lint | **0 errors**, 74 warnings | **0 errors**, 74 warnings | ✅ |

Net +28 tests: +22 class guard, +6 admin gate, +3 delete refusal, −3 retired with `keyboardAvoidance.guard.test.ts`.
Diff: 18 files, +654 / −97.

---

## BUG B — the verdict, plainly

**World (b). Owner-delete is broken in production for every authenticated user — it is not an ownership mix-up.**

The `admin delete any flag` policy on `flags` subselects `public.users.is_admin`.
RLS quals evaluate with the **caller's** privileges, and `authenticated` has no
SELECT grant on that column: the 2026-05-27 email-privacy migration replaced
table-wide SELECT with an explicit column list written three days before
`is_admin` existed, and nothing extended it when admin_role went live. Postgres
includes every applicable permissive policy's qual in the plan — there is no
short-circuit once `flags delete own` matches — so **every** authenticated
`DELETE FROM flags` errors `42501 permission denied for table users` before
ownership is ever evaluated. `errorMessage()` maps 42501 to exactly the copy Sky
saw. Confirmed independently against the live catalog by Phase B.

**The BUMBAKLOT detail, and why it is a side fact.** That flag belongs to
`ranchin2023@gmail.com` (`7fe628a7…`), not to `skylerhalisky@gmail.com`
(`8f99f7e0…`). But "Reported by: You" is plain uid equality
(`FlagDetailModal.tsx:513`) with no display-side fallback — so the device was
signed in as ranchin2023, which genuinely **is** that flag's owner. She was the
owner, and the delete failed anyway. Both things are true; only the second one
is the bug.

**Blast radius of the same missing grant:** owner flag delete, admin flag
delete, owner photo delete, admin photo delete, and `useIsAdmin()` — which is
why the Admin tab renders for nobody, and why granting `is_admin = true` without
A1 would have changed nothing visible.

**Fix:** artifact **A1**, one `grant`. Not a code change — which is why no
commit here claims to fix it.

---

## BUG A — the census, before and after

House pattern = **Recipe F**, the FeedbackModal `d2a0991` stack (KAV with iOS
padding + **the percentage cap ON the KAV** + keyboard-up inset reclaim +
scrollable middle between pinned header and actions). **Recipe S** =
`automaticallyAdjustKeyboardInsets` on the body scroller, for pageSheet /
full-height surfaces where a KAV fights the layout (FlagDetailModal precedent).

17 input-hosting surfaces across 16 files. 7 passed, **10 failed**, 2 of those
confirmed by Sky's device screenshots.

| # | Surface | Before | After |
|---|---|---|---|
| 1 | FeedbackModal | PASS (reference) | untouched |
| 2 | ReportContentModal | PASS | untouched |
| 3 | ReportFlagModal | PASS | untouched |
| 4 | FlagDetailModal | PASS | untouched |
| 5 | SignInScreen | PASS | untouched |
| 6 | MapScreen "Name this preset" | PASS by census — but KAV uncapped over a card with **no** maxHeight | cap added on KAV (`nameKav`), card shrinks |
| 7 | MapScreen "Name this filter" | same | same |
| 8 | **AddressSearchModal** | **FAIL — device screenshot.** KAV present, no cap; card's 85% inert | cap on KAV + shrink chain + reclaim |
| 9 | SavedPlacesModal | FAIL (latent) — same shape | cap on KAV + shrink chain + reclaim |
| 10 | FilterPresetsModal | FAIL (latent) — same shape | cap on KAV + shrink chain + reclaim |
| 11 | **MyWatchedModal** | **FAIL — device screenshot.** No mechanism at all | full Recipe F + reclaim + `persistTaps` on the list |
| 12 | MyReportsModal | FAIL — no mechanism | full Recipe F + reclaim + `persistTaps` |
| 13 | MyFeedbackModal | FAIL — cap present, no keyboard mechanism | KAV added, **cap relocated** onto it + reclaim + `persistTaps` |
| 14 | HelpModal | FAIL — cap present, no keyboard mechanism | KAV added, **cap relocated** onto it + `persistTaps` |
| 15 | NearbyFlagsModal | FAIL — pageSheet, nothing | Recipe S on the FlatList + `persistTaps` |
| 16 | TasksScreen | FAIL — rows under the keyboard unreachable | Recipe S on the SectionList + `persistTaps` |
| 17 | ProfileScreen | FAIL — display-name field low on the scroll | Recipe S on the body ScrollView + `persistTaps` |

### Two findings worth reading

**The relocation trap (13, 14).** MyFeedback and Help already had a *working*
cap on `cardWrap` — it resolved because cardWrap was the backdrop's direct
child. Wrapping a KAV around it would have quietly demoted that cap to inert and
regressed the unbounded-card defect it was added to fix (measured then: close ✕
at y=-53, no pointer path to dismiss on touch web). The cap moved onto the KAV
instead.

**Why 6 and 7 were hardened despite scoring PASS.** Their KAV had no cap and
`nameCard` has no `maxHeight` at all. Fine at normal type; at large Dynamic Type
on a small phone the *centered* card can grow past both screen edges, pushing
its own title and input off the top with no scroll to reach them. Capping them
also let the class guard ship with **zero exemptions**, which matters — a guard
that hand-exempts the exact shape that failed before is the hole rebuilt.

### The class guard — `src/__tests__/keyboardClass.guard.test.ts`

Source-derived census in the `dismissalStandard.guard` idiom, not an allowlist.
Closes both holes that let this ship three times:

- **Presence ≠ geometry.** The old guard asked only whether a `<KeyboardAvoidingView>` existed. AddressSearch *had* one — it was even cited as the recipe source — and still failed on hardware. The new guard resolves the KAV's `style` (inline literal or `styles.NAME` looked up in the file) and requires a percentage cap.
- **Indirect inputs.** Counts `<TextInput>`, `<SearchInputRow>` and `<Input>` alike, so MyWatchedModal — invisible to a `TextInput` scan — is now a census row.

Input-hosting **screens** get a declared-mechanism table; a new one that is not
listed fails loudly. Exemptions list is **empty**.

**Non-vacuity proven:** reverting AddressSearchModal to the exact naked-KAV
shape that shipped → `✕ components/AddressSearchModal.tsx`, 1 failed / 21
passed. Restored → 22/22 green.

`keyboardAvoidance.guard.test.ts` retired into it; its three pins are census
rows now, held to the stronger rule. `feedbackKeyboard.guard.test.ts` kept — it
pins the reference implementation deeper than a census can.

### What was deliberately not touched
The four PASS modals, every `autoFocus`, the SheetPull dismiss-vs-scroll gate
(`useKeyboardVisible` + `keyboardDismissMode="on-drag"`), and all user-visible
copy. `dismissalStandard.guard`, `Sheet.dismissal` and `feedbackKeyboard.guard`
stayed green at every commit — the escape law survives on all ten surfaces.

---

## The admin chain

`admin.ts:27` was **never** a code bug — the select shape is correct and always
was. The tab renders for nobody because the read is *refused* (the A1 grant).
What was wrong in code: the hook destructured only `data` and dropped `error`,
so a refused read and a genuine non-admin were indistinguishable. That is why a
gate broken since ~June never emitted one signal. It now warns, then still
degrades to false — deliberately; a permission gate that fails **open** would be
the worse bug.

Guarded both halves: the hook (true / false / refused→false+warn / signed-out
without querying) and the navigator's registration site, pinned to strict
`isAdmin === true` so a loosening to `isAdmin &&` — which would flash an admin
surface at every user during the null loading window — fails the build.

---

## The extra fix (item 4's hardening — taken, not deferred)

RLS does not raise on a denied DELETE; it filters and reports success over zero
rows. `deleteFlag` checked only `error`, so a non-owner delete resolved cleanly,
`onDeleted()` fired, and the UI hid a flag still sitting in the table.

Reachable the moment A1 lands — so fixing it first stops the grant from trading
one wrong outcome for another. `deleteFlag` now asks for `.select('id')` and
treats zero rows as a refusal, throwing 42501 → existing copy, no new strings.

---

## DEVICE ROWS — add to the checklist (small phone; do 4 and 5 after Sky applies A1/A2)

1. **Watched Flags** — open, tap the search field, type. The field **and** the rows stay visible and tappable above the keyboard; pull-to-refresh still works; ✕ still closes.
2. **Search by address** — open (it autofocuses). The whole input clears the keyboard; results are tappable with the keyboard up; ✕ reachable.
3. **Saved Places** (the census pick) — tap Add; the name field and Save/Cancel are all visible above the keyboard.
4. **After A1** — delete one of your own junk flags → the row disappears, no error. *(This is the MUST-1 cleanup unblock.)*
5. **After A1 + A2**, signed in as skylerhalisky, relaunch — Admin appears in the drawer → Remove the BUMBAKLOT flag end to end (row gone; on a flag with photos, the photos go too).
6. **Worth one pass:** Profile → edit display name with the keyboard up (the field sits low on the scroll), and Tasks → search with the keyboard up (rows under it must be reachable).

---

## STOP

Three commits on `fix/device-keyboard-admin-2026-08-18`. Gates green. Nothing
merged, nothing pushed, no DB touched. Sky applies `03_SQL_ARTIFACTS.md` (A1
then A2, per-statement) and merges the branch.
