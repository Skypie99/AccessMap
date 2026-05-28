# Daily Checkin Format

**For:** Shamus, Dani, Steve  
**Frequency:** Every work day EOD (asynchronously)  
**Where:** Post to Cowork or Slack in #accessmap-team  
**Time commitment:** 30 seconds  

---

## Format (3 lines)

```
✅ [What you shipped/completed today or current status]
🔴 [Any blockers that are stopping forward progress]
🟡 [What you're starting tomorrow or blocked on]
```

---

## Examples

### Shamus (Feature Builder)

```
✅ Marker clustering code done, passed Gary's tests.
🔴 Blocking: D1 (flag_edit_rls migration) — once Sky applies, merge immediately.
🟡 Ready to merge feat-clustering once D1 lands. Next: feat-notify-flag-status code review.
```

### Dani (Design & Tokens)

```
✅ Creative polish design comps 90% done. Token residuals audit complete.
🔴 Blocking: waiting on D5 decision (heatmap severity colors) to finalize palette.
🟡 Can finish design comps once D5 lands. Statushistory code review with Shamus in progress.
```

### Steve (Security & RLS)

```
✅ RLS hardening wave 2 audit 70% complete. D3 trigger logic reviewed, safe to apply.
🔴 None — audit runs in parallel, can land anytime.
🟡 Finishing RLS audit Friday, will propose ALTER POLICY statements for Sky review.
```

---

## What *not* to include

- Long prose updates (that's what qa-reports are for)
- Implementation details or code snippets
- Feature descriptions (saved in task queue)
- Meeting notes or sync-up outcomes

This is **blockers + current status**, not a narrative.

---

## Morgan reads these to

- **Daily (30 sec):** Spot any `🔴 Blocking` that needs a decision gate applied
- **Friday summary:** Understand which tasks moved, which are stuck, what unblocks them

**Example:** If Shamus says "Blocking: D1", Morgan checks if Sky has applied D1 yet. If not, message Sky: "D1 blocks marker-clustering. Ready to apply?"

---

## Timeline

- **Today (2026-05-28 EOD):** First daily checkins from Shamus/Dani/Steve
- **Tomorrow (2026-05-29 EOD):** First weekly digests (separate format, see WORKFLOW_INSTRUCTIONS.md)
- **Ongoing:** One per role per work day
