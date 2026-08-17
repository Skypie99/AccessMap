# 05 · APP STORE CONNECT METADATA — FLAGSTONE
**Paste-ready. 2026-08-17.** Nothing here has been submitted, uploaded, or sent. Zero em dashes throughout, per the run's copy law.

Sources: subtitle and keywords from `../../store-dossier/2026-08-05/dossier/02_subtitle-keywords.md`, description from `dossier/01_description.md`, both unchanged except the name. Character counts below are exact ASCII counts, re-measured today.

---

## 1 · Name field
```
Flagstone
```
**9 characters.** Renders whole under the icon at every tested size. Store-clear on both the CA and US storefronts as of the 2026-08-16 probes (`../2026-08-16/03_VETTING.md`, raw API JSON in `../2026-08-16/evidence/`).

## 2 · Subtitle field
```
Map accessibility barriers
```
**26 characters** of the 30 allowed. This is dossier 02's REC, unchanged.

One note the rename creates: under the old name, "map" was indexed twice (name plus subtitle). Under Flagstone the subtitle is now the only place "map" appears, which makes keeping this subtitle more load-bearing than it was, not less. The tradeoff dossier 02 flagged (repeating the name-token "map") has simply disappeared.

## 3 · Keyword field
```
wheelchair,disability,mobility,ramp,curb,sidewalk,crossing,slope,washroom,blind,deaf,anonymous
```
**94 characters** of the 100 allowed. No spaces after commas, per Apple's documented budget rule. Unchanged from dossier 02 as instructed.

> ⚠ **Read BQ-6 in `03_banked_questions.md` before pasting this one.** Dossier 02 excluded `access` and `map` from the keyword field with the reason "already indexed from the name." That reason was true of AccessMap and is no longer true of Flagstone. The subtitle still carries `map`, `accessibility`, and `barriers`, so the only token the rename actually drops is `access`. The string is presented unchanged here because the run said unchanged; the 6 spare characters and the one-word fix are laid out in BQ-6 for Sky.

## 4 · Description field
Dossier 01's draft, with the name swapped in the single place it appears. ~2,050 of 4,000 characters. The first paragraph is built to stand alone above the "more" fold.

```
Flagstone is a community map of accessibility barriers. See the steps, broken sidewalks, and blocked paths other people have flagged, and add the ones you find, so the next person knows before they arrive.

EVERY BARRIER, RATED FOR REAL IMPACT
Every flag carries a severity from 1, inconvenient but usable, to 5, impassable and needing a detour. "Not accessible" stops being a guess. Six plain categories cover the streetscape: no ramp, broken sidewalk, blocked path, missing signal, steep grade, and other.

REPORT IN UNDER A MINUTE, NO ACCOUNT NEEDED
Saw a barrier? Pick a category, rate how bad it is, add a note if you want, done. You can report completely anonymously; your identity is not stored. Signed-in reporters can attach photos, and location data is stripped from every photo before it is uploaded.

CHECKED BY THE COMMUNITY, TENDED BY A PERSON
Reports start as Open. Community members verify them on the spot, or mark them resolved once the barrier is fixed, so the map reflects what is actually there. Anything reported as inappropriate is reviewed by a real person within 24 hours.

PRIVATE BY DESIGN
No ads. No analytics. No tracking. Location is used only while the app is open, to centre the map and place your reports, and browsing works with location off. The full plain-language privacy policy is right inside the app.

AN ACCESSIBILITY APP THAT WORKS LIKE ONE
Designed against WCAG 2.2 AA: screen-reader labels on every control, colour always paired with numbers and words, large touch targets, dark mode, and a map legend that explains every pin in plain language.

WHO MAKES THIS
I'm Sky, and I built it and run it on my own so that disabled people get better information about the places they move through. The first barriers are mapped in Kelowna, British Columbia. Every city's map starts with one neighbour who flags one thing, and the barrier data belongs to the people who report it.
```

**Read aloud once, as required.** It carries. Two things worth knowing before you paste:

1. **The opening line is the ratified mission sentence, and it is the one line here that is fenced.** Terms §1 sentence one is `Flagstone is a community map of accessibility barriers.` only if Sky ratifies **BQ-1**. Today the in-app copy still reads AccessMap. The mission is not reworded by this rename, the subject noun is simply the product's name; but the store description and the in-app terms should say the same thing on the day you submit. Ratify BQ-1 first and they match.
2. **Spelling stays Canadian** (centre, colour, neighbour), matching the app's in-app voice. Dossier 01's banked Q3 still applies: if the primary storefront locale is set to English (U.S.), Sky may want the US variant.

## 5 · Promotional text (170-char field, editable without a new binary)
```
Every barrier on the map is rated 1 to 5 for real impact, and you can flag one in under a minute without an account. Checked by neighbours.
```
**141 characters.** No name inside it, so the rename left it untouched.

## 6 · What's New (not required for a first release; drafted for the first update slot)
```
First public release: the barrier map, severity ratings, anonymous reporting, and the legend.
```
**92 characters.** No name inside it.

## 7 · URL fields
| Field | Value | Status |
|---|---|---|
| Privacy Policy URL | `https://skypie99.github.io/AccessMap/privacy/` | live and verified today; the page's visible text now says Flagstone on this branch, the URL deliberately does not move |
| Support URL | `https://skypie99.github.io/AccessMap/support` | **verify before pasting.** `docs/support.html` is the page and its brand text is renamed on this branch, but `docs/github-pages-setup.md` documents a different host and path than the one the app actually uses. See BQ-5. |

Both URLs keep `AccessMap` in the path on purpose. A user sees the page title, not the path, and moving the privacy URL would break the pin between `app.json` and `src/lib/links.ts` that `privacyLink.guard.test.ts` enforces.

## 8 · If Connect rejects the name
The evidence says it will not: zero Flagstone apps on either storefront, fetched 2026-08-16. If it happens anyway, do not improvise a name. The banked runners-up are **Even Ground** and **Goable**, and the decision returns to Sky. Full vetting for both is already in `../2026-08-16/03_VETTING.md`.

## 9 · Pitfalls checklist, re-confirmed against these exact strings
- No competitor names anywhere (Wheelmap, AccessNow, WheelMate, Sociability, AXS Map).
- No "best", "#1", or "free" in name, subtitle, or keywords.
- No pricing words, no superlatives, no comparative phrasing.
- Zero em dashes in any field above.
- Limits are enforced in UTF-16 code units; every string above is plain ASCII, so the counts are exact.

---

**Not done by this run, by fence:** no submission, no upload, no screenshot regeneration, no Connect form filled. The screenshot set will show the new home-screen label the next time the capture factory runs; that is listed as a follow-up in `CLOSE-OUT.md`, not done here.
