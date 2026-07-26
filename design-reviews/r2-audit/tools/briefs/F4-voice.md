# F4 — VOICE & MICROCOPY

Read every small copy moment: buttons, empties, errors, banners, confirmations, section headers,
hints, placeholders, AND a11y labels AS PROSE (severityA11y/statusA11y + the ~50 announce
strings + accessibilityHints — a blind user HEARS this voice; is the spoken app as designed as
the visual one?). Method: the `voice/` crop set + `base/` shots for in-context reading + a FULL
inline-strings sweep of the repo (`grep -rn` for quoted strings in screens/components; lib/copy.ts
· a11yText.ts · announce call sites; flags.ts labels/descriptions). The dispersion itself
(shared copy.ts vs inline JSX) is feel-relevant — where does dispersion produce drift?

Is it ONE voice — warm, human, civically serious? Hunt inconsistency axes:
- noun canon: barrier (human) vs flag (system) — S15 picked it; is it now HELD everywhere
  (headers, FAQ, legend, announces, hints)?
- sentence case vs Title Case; "colour" vs "color" (pre-spotted: LegendModal vs HelpModal);
  contractions (does one screen say "can't" and another "cannot"?); terminal periods on
  fragments; em-dash vs hyphen habits.
- time grammar ("29d ago" vs "Jun 2, 2026" vs "2h ago" — B9a uses relativeTime; is the grammar
  one system?).
- register drift: bureaucratic ("submitted successfully") vs the app's own warm register
  ("Report filed — thanks for flagging this barrier").

The privacy-forward trust voice (PROTECT #11: "your identity is not stored" · the k≥3 caveat ·
"your email is never shown publicly") is the ANCHOR REGISTER — judge every other string against
it; proposals correct TOWARD it. The Round-1 copy-observations appendix (report §6) is your
inherited rail — do not re-file what S15/S20/S4 closed; verify their strings landed and judge
whether the NEW strings (retry reason, still-trying, offline age, freshness line, Status block,
submit-moment sentence, heat companion) speak the same voice.

Before/after sketches are allowed INSIDE findings (1–2 lines, clearly marked "sketch — nothing
ships"). You never edit a file.

End with the Copy-observations index (one line each, screen-grouped) — Part 3 builds the copy
appendix from it.
