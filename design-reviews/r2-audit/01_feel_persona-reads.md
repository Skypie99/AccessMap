# Fable Audit ROUND 2 — Part 1: Blinded persona reads

**Method.** Seven fresh parallel agents (Claude Fable 5, max effort), ZERO project context, each
given ONLY its capture files (flow-ordered) plus the blinding fence: *"you know nothing about
this product; do not read source, docs, or anything else on disk."* Their unprimed reactions are
first-class evidence — banked verbatim below, one section per reader, exactly as returned. The
shared question all seven answer: does this feel CARED FOR — designed, warm, one hand — or
utilitarian-bare? Packets are enumerated per reader (paths relative to `assets/`); the full brief
texts live in `tools/briefs/persona-R{1..7}.md`.

**Honesty caveats on the packets:**
- All captures are `web-approximated` (static export :8082, Chromium DPR-2) — the readers were
  not told the platform; their reads describe the web-rendered app.
- **R7's packet is the C-lite / engineered-material capture set** — the closest web-renderable
  analog of the iOS Reduce-Transparency designed state (RT itself is an iOS-only API,
  code-/test-inferred; GLASS.md §6). R7's verdict therefore reads on the ENGINEERED material
  family; the true RT states remain NEEDS-SKY-DEVICE.
- R2's packet is the RN-web-emitted ARIA tree — real for the web app as shipped; native
  VoiceOver truth stays NEEDS-SKY-DEVICE (Round-1 ledger caveat #10 applies: some tree artifacts
  are RN-web translation, not app intent).
- R4's "pressed" frames are pointer-held screenshots; haptic acknowledgment is invisible to the
  web (native-only) — R4 judges the visual channel only.

---

*(Reads appended verbatim as each lands; completeness critique + PASS at the end.)*

---

## R1 — wheelchair user, route-planning

# Cold read — cross-town trip planning

## 1. Cared for, or bare?

Cared for, mostly — and by one hand. The tell is the severity grammar: a numbered color dot, a word, and a status, repeated identically everywhere I looked. Home list says "Severity 3 · Moderate · Open." The nearby list says "Severity 4 of 5 · Significant · Verified · Jun 4, 2026." The legend, the detail badge, the heat-map key — same dots, same words, same order. Somebody decided how this app talks about danger and then never wavered. That consistency is what lets me stop decoding and start deciding.

The legend modal is the warmest screen in the app, and not because it's pretty — because it's written in consequences. "5 — Severe: Impassable. Needs a detour." "2 — Mild: Doable with effort or help." That's my language. It even explains the double-ring anonymous marker and the resolved checkmark. Compare that to a hundred map apps that make me guess what an orange dot means.

Where the care slips: the pin callout screen has the callout's own text ("SEVERITY 4 OF 5 · SIGNIFICANT · VERIFIED") bleeding through *underneath* the floating toolbar — two layers fighting, ghost text showing through. That's the one screen where I can see the seams. And dark mode is nearly a black hole; the pin pops, but street names are close to invisible, which matters when the streets are the whole point.

## 2. Does the craft help me decide?

Mostly yes, and that's rare. Things that are load-bearing, not decorative:

- **Distance on every nearby card** ("297 m," "1.5 km") in a consistent spot. First thing I scan.
- **Freshness everywhere** — "3d ago," "Jun 4, 2026." A "no ramp" report from last year is worthless to me; this app never hides the date.
- **The heat-map caveat**: "Heat zones only appear where at least 3 flags have been reported. Based on community reports — coverage varies by area." That's the app telling me the limits of its own data. Absence of a flag is not absence of a barrier, and this is the only crowdsourced map I've seen say so out loud.
- **Filter chips with counts**, including "Broken sidewalk 0" — showing me the zero tells me what *hasn't* been reported, which is itself information.
- The detail sheet's monospace coordinates with a copy button, and a real **Directions** button. Someone imagined me actually leaving the house.

Bolted-on: the "Save current filter" pitch taking the top slot of the filter panel before I've ever wanted one, and the big display typography on Home ("9 barriers") which is handsome but tells me a citywide count I can't act on.

## 3. The degraded states

This is where the app is at its best *and* worst.

**Best:** the empty-filter state. "0 of 9 shown" in the corner chip — an honest fraction, not a blank map I might misread as a barrier-free city. Then: "Your filters are hiding everything. Clear just the one in the way, or reset them all," with a button for the *specific* offending filter and a reset. That's surgical. Someone walked this dead end themselves.

**Good:** the locate-failure banner — "Location is off, so the map shows the most recent flags, not ones near you." It tells me what I'm looking at *instead*, which is exactly what stops a wrong bet. The "Still trying — check your signal" pill with a Retry button is honest too, though it sits sloppily on top of the header text.

**Worst:** the Home load-error. The headline collapses to a black dash, the list sits as gray skeletons, and — nothing. No message, no retry. It is pixel-for-pixel indistinguishable from "still loading." I'd sit there thirty seconds before realizing the app had failed me. The offline refresh is nearly as bad: a chip says "Updating…" over yesterday's flags with no hint I'm offline or that the data is stale. Stale barrier data presented as current is precisely how I end up stranded at a curb. And the permission-denied map claims "Showing 9 flags" over a citywide view where I can see zero of them — technically true, functionally misleading.

## 4. Three to praise, three that cost trust

**Praise:**
1. The severity grammar — one vocabulary of dots, numbers, and consequence-words, held everywhere without exception.
2. The empty-filter recovery — "clear just the one in the way" is the most considered dead-end I've seen in a map app.
3. The honesty microcopy — the heat-map coverage caveat and the location-off "here's what you're seeing instead" banner.

**Trust-reducers:**
1. **"BUMBAKLOT" — Severity 5 · Severe · Verified.** A nonsense word, rubber-stamped as verified at maximum severity, sitting beside real reports. One glance and I now discount every "Verified" badge in the app. This is the single most damaging pixel in the whole set.
2. The silent Home load-error — a failure state indistinguishable from loading, right next to a "still trying" state that proves the team knows how to do it right.
3. The callout/toolbar z-index collision — text bleeding through layers. Cosmetic, but on the exact screen where I'm judging whether a report is trustworthy, sloppiness reads as "maybe the data is sloppy too."

Net: I'd use it — the vocabulary is honest, the dead ends mostly catch me. But fix the verification rubber-stamp and the silent error before I bet an intersection on it.

---

## R2 — blind, VoiceOver-primary (a11y-tree read)

# Listening to this app with my eyes closed

## First impressions of the traversal

Someone here has actually written sentences for me. On Home, a card doesn't say "noramp_card_3" — it says **"No ramp, severity 3 of 5, Moderate, status Open."** In the Nearby list it gets even better: **"No ramp, severity 4, 297 meters away. Status verified. No ramp at the corner — wheelchair users have to detour."** Units are spelled out ("meters," "kilometers"), status is a spoken clause, and the human description is folded into the same breath. That is prose, not a control dump. The Report form is the high point of the whole app: each severity button teaches me the scale as I arrow across it — **"Severity 5: Severe — Impassable. Needs a detour."** — and the moment the sheet opens, an alert tells me **"Reporting anonymously — your identity is not stored."** The onboarding even bakes state into the label: **"Back. Disabled on first card."** and **"Next. Card 1 of 5."** Settings buttons carry their own explanations ("Export my data — Copy your flags and feedback to your clipboard as plain text"). Summary announcements like **"9 flags nearby. Sorted by distance."** give me a rhythm: I know the shape of a screen before I dig in.

But the rhythm breaks in three recurring ways.

**Double-speak.** Cards announce their accessible label, then their visible text repeats it in a different dialect: "No ramp, severity 3, open. Tap to view on map." followed by "3 · Moderate No ramp Open." I hear every flag twice, slightly differently, on Home, Tasks, and the Nearby list.

**Orphaned context.** On Tasks, the card button ends at "Tap to view on map" — but the distance ("639 m · 8 min walk · 3d ago") and the description ("Mean dog," "Curb") are loose text *after* the button, outside it. Then come four action buttons. If I navigate by button — which I do — I hear **"Verify this flag"** six times in a row with no idea *which* flag each belongs to. Order is my only clue, and order is fragile.

**Everything is a level-1 heading.** Home, sections, modals — the rotor gives me a flat wall of h1s, including the bizarre nested stutter "heading 'Open 6'" containing another heading "Open." I can't skim structure by heading level because there is no level.

## Where the spoken app is bluntest

- **Map legend** (`legend`). Sighted people get a groomed five-row scale with colour chips. I get one unbroken blob with stuttered numbers: *"1 1 — Minor Inconvenient but usable. 2 2 — Mild Doable with effort or help. 3 3 — Moderate…"* — the badge digit and the text digit both speak. Status and categories are similar run-ons.
- **Flag details** (`flagdetail`). The screenshotless equivalent of a nicely fielded card collapses into: *"No photos Severity 4 Verified Description No ramp at the corner — wheelchair users have to detour. Reported by Another community member Date Jun 4, 2026, 6:34 PM Location 49.88998, -119.49354"* — one sentence-shaped landslide, no pauses, no field structure.
- **The map itself** (`map-at-rest`). "Showing 9 flags," but only **one** pin exists for me: "No ramp — severity 4." The other eight are pixels. The List sheet redeems this — it truly is my map — but before I find it, the first things I traverse are "Leaflet," a bare **"©"**, "OpenStreetMap," another "©," "CARTO." Attribution before content, on every map screen.
- **Denied location** (`denied-map`). The screen supposedly reflects a denied permission, and *nothing in the tree says so*. It ends with the cheerful "9 flags. Showing the most recent first." A sighted user presumably sees something changed; I hear business as usual.
- **Selection state on chips.** Report form: "Category: No ramp," "Severity 3: Moderate…" — no `selected` announced anywhere. The checkmark is an unlabeled `img`. Sighted users see the filled blue pill and the orange circle; I have to infer my choice from a loose "Moderate Hard for many users" floating below. The tab-styled filters elsewhere *do* announce `[selected]`, so the app knows how — it just forgot here.
- Small leaks: a stray **"Step 1 of 3"** dangling at the bottom of Settings; the Tasks tab badge saying "6 Tasks" on one screen and "9 Tasks" on another; a disabled "Push notifications" switch that never tells me *why* it's disabled.

## Five best spoken strings

1. "No ramp, severity 4, 297 meters away. Status verified. No ramp at the corner — wheelchair users have to detour."
2. "Severity 5: Severe — Impassable. Needs a detour."
3. "Back. Disabled on first card."
4. "Review the nearest open barrier, No ramp, 639 meters away"
5. "Reporting anonymously — your identity is not stored."

## Five worst spoken strings

1. "1 1 — Minor Inconvenient but usable. 2 2 — Mild Doable with effort or help. 3 3 — Moderate Hard for many users. 4 4 — Significant Hard or unsafe for most users. 5 5 — Severe Impassable. Needs a detour."
2. "No photos Severity 4 Verified Description No ramp at the corner — wheelchair users have to detour. Reported by Another community member Date Jun 4, 2026, 6:34 PM Location 49.88998, -119.49354"
3. "Verify this flag" (six identical times, no flag named)
4. "©" (a bare text node, spoken as "copyright," twice per map screen)
5. "Step 1 of 3" (orphaned at the end of Settings, referring to nothing)

## Verdict

Mostly, yes — someone listened. The vocabulary of this app was written to be *spoken*: severity is taught in sentences, statuses are clauses, buttons are verbs, summaries announce themselves. That's rarer than it should be. But they listened screen-by-screen, not journey-by-journey: the modals that matter most (legend, flag details) collapse into blobs, actions detach from their subjects, selection state goes silent exactly where I'm making a decision, and a denied permission passes without a word. It feels like an app whose makers closed their eyes for the labels — and opened them again for the layout.

---

## R3 — low-vision, large-type

# Zoom Read — a low-vision user at 130% and 200%

I live at large text sizes. Here's what happened when this app met my settings.

## Does the craft survive magnification?

**Home, 130%:** Mostly, yes — and gracefully. The search field, the "Use my location" pill, and the list rows all grow and reflow instead of shrinking to fit. But the floating "+ Report" button drifts up and parks itself **on top of the list**, swallowing the tail of a row ("Severity 1 · Minor · Op—"). At 100% it already grazes the "Other" row; magnification makes the collision worse, not better.

**Home, 200%:** This is where the headline breaks its promise. "9 barriers" becomes **"9 b…"** — the single most important number on the screen truncates into gibberish because the two round header buttons refuse to yield. The count survives only if I already know what it said. Meanwhile the Report button now floats over the map preview, and the list is pushed entirely off-screen. The tab bar, to its credit, is beautiful at 200%: Home / Tasks / Profile all scale with labels intact, badge and all.

**Tasks, 130%:** The "Nearest open barrier" pill wraps to two lines with dignity — that's how it should be done. The severity chip ("3 · Moderate") grows cleanly. But the four-button action row shreds: **"Resolved" overflows its own button**, its text wider than its grey pill, and "Reject" and "Details" compress into tight circles with letters kissing the edges. Labels escaping their buttons is exactly the damage I fear.

**Map, 130%:** The toolbar grows — and quietly **drops the locate-me crosshair off the right edge**. Seven tools become six. For someone like me, "center on where I am" is a lifeline, and magnification stole it. The map tiles themselves don't rescale (street names stay small), which I forgive on a map, but losing a button I don't.

**Nearby flags, 200%:** The best survivor in the whole set. Cards reflow vertically: the big numbered disc stays put, "No ramp" wraps to two lines, the meta line ("Severity 4 of 5 · Significant · Verified · Jun 4, 2026") wraps to three and stays readable. "297 m" breaks awkwardly with "m" orphaned on its own line, and the description ellipsizes ("wheelch…"), but nothing collides. This screen was clearly built to bend.

**Report form, 200%:** Also mostly planned. Title wraps, the anonymity banner grows tall and honest, the footer stays pinned with Cancel and Submit reachable. "Submit report" wraps to two lines inside its button — cramped, but *inside*. One irritation: the sheet is translucent and the list behind it **ghosts through** — faded chips and discs bleed into the form. At my zoom, that ghosting reads as extra text I have to disprove.

## The numbered discs

The Nearby list and the severity picker are the app at its best for me. Discs carry a **number**, a **color**, and a **word** ("Severity 4 of 5 · Significant") — three redundant channels. At 200% the discs are enormous and the dark numeral on yellow/orange/red holds up. The severity picker's selected state is fill **plus** a ring **plus** a checkmark **plus** a text sentence ("Significant — Hard or unsafe for most users"). Nothing here is color-only.

The Home screen's Recent list is weaker: its severity indicators are tiny **unnumbered dots**. The adjacent text spells out the severity, so no information is lost — but the dot itself is pure color, and at a glance I can't tell orange-3 from red-5. Put the numbers in those dots too.

## Dark vs light

For the lists and forms, **dark mode is kinder**: white text on near-black, and the severity dots glow. My eyes fatigue less. But dark mode **loses the map** — the preview on Home becomes an undifferentiated black rectangle, and the full Map screen's street names are dark grey on black, essentially invisible to me. Light mode's map is genuinely readable. So I'd live in dark and be forced to light every time I navigate — an uncomfortable trade.

## Verdict

- **Planned for me:** Nearby cards' reflow, the three-channel severity grammar, the pinned form footer, the scaling tab bar, wrapped pills, the character counter.
- **Damage under magnification:** the "9 b…" headline, the Report button squatting on content, "Resolved" bursting its button, the vanished locate crosshair, dark mode's dead map, ghosting behind the report sheet.

The bones respect me. The edges — headline, FAB, action row, toolbar overflow — were only ever tested at 100%.

---

## R4 — one-handed / limited-dexterity

# One thumb, one tremor: my read

## 1. Do presses acknowledge?

Mostly, no — and that's the thing that would make me return this app.

I compared every rest/pressed pair on top of each other, and almost all of them are the same picture. Tab bar pressed vs rest: identical. Map zoom "+" pressed: identical. Map action bar pressed: identical. Category chip pressed in the report sheet: identical. Severity circle pressed: identical. Tasks card pressed: identical. Tasks card *hover*: identical. Even the big blue **Verify** button — the most consequential tap in the app — shows nothing while my finger is on it. The reduce-motion pressed shot is also identical, which is consistent at least: there's nothing to reduce.

The one honest control is the **drawer row** — "Resources" clearly lightens under the finger. So somebody on this team knows how to do it; it just didn't get done anywhere else.

The "Use my location" pill's pressed/hover shots show a change so faint I had to flip back and forth three times to convince myself it grew a hair. That is not feedback, that's a rumor.

Why this matters for me specifically: with a tremor I frequently don't know if my touch *landed*. When nothing changes under my finger, my reflex is to press again — and a double-tap on Verify, or on a tab, or on a card that navigates, does real things twice or takes me somewhere I didn't ask to go. The *selected* states are actually great (chips go solid blue, severity 3 goes orange with a check, the filter icon lights up) — but selection tells me what happened *after*. It's the during that's dead.

## 2. Thumb reach

The bottom half of this app is genuinely good to me: tab bar with big labeled targets, the Report FAB at bottom-right, map zoom and **List** stacked in the lower-right corner, Cancel/Submit pinned to the bottom of the report sheet. At 375 and 390 I can live in the bottom third. At 430 everything stretches further but the important stuff stays low.

The top is another country. The Map screen puts its entire tool rail — search, help, filters, severity, layers, refresh, locate — in one skinny strip *at the very top*, seven small icons shoulder-to-shoulder. That's the row I'd use constantly (filter, re-center, refresh) and it lives exactly where my thumb can't go without regripping the phone, which for me means setting it down or dropping it. The menu and feedback buttons in the top-right corners, "Select multiple" top-right on Tasks, "Close" top-right on the sheet, and the little "Clear" link at the top of the filter panel — all in the dead zone.

## 3. Targets: generous or mean?

Mixed, trending generous — with three scary spots:

- **Reject sits directly between Resolved and Details** on every Tasks card, all four pills the same size in one row at 390. Reaching for Details with a wobble, I hit Reject — and a mis-tap there potentially throws out someone's real barrier report. Destructive and neutral actions should not be shoulder-to-shoulder at equal weight.
- **The Report FAB floats on top of tappable list rows.** At 375/390 it literally covers the "Other" row's chevron. If I miss the FAB low or left, I don't get nothing — I get navigated into a random barrier. Misses that *do something else* are worse than misses that do nothing.
- **Severity circles 1–5** are decent-sized but adjacent with no gap to spare; a wobble files a 4 instead of a 3. The map's seven-icon rail is the meanest targets in the app — small icons, thin dividers, and refresh (which dumps my view) right next to locate.

Also: chip rows scroll horizontally and get clipped at the edge ("Blocked path" at 375, "M…" in the sheet). Horizontal drags and taps blur together for my hand. And the keyboard-focus ring on the category chip only draws its left and right edges — it looks broken.

## 4. Verdict

Designed for someone else's *steadier* hand. The bones are right — bottom-anchored actions, huge Verify button, honest selected states, a beautiful focus ring on search — but the moment-of-touch layer is missing almost everywhere, and that's the layer I live in.

**Three fixes I'd beg for:**

1. **Give every control a real pressed state** — an unmistakable darken/tint the instant my finger lands (the drawer row already proves the pattern), preserved under reduce motion.
2. **Bring the map tool rail down** — bottom sheet, FAB cluster, anything in the lower third — or at minimum duplicate filter/locate/refresh down there.
3. **Protect me from expensive mis-taps:** put space or a confirm behind Reject, and move the FAB out of the list's tap zone so a near-miss costs nothing.

---

## R5 — senior mobile craft reviewer

# Cold read — 45 frames, 390pt, light/dark/transitions/states

## 1. Rhythm, type, spacing — where it sings, where it cracks

The editorial header system is the best thing here. Small-caps eyebrow, giant grotesque numeral, quiet subtitle — "LATEST / 9 barriers / Most recent barriers" on Home, "TASKS / Review barriers / Verify and resolve reports" on Tasks. That's a real hierarchy with a real point of view, and it survives dark mode byte-for-byte. The legend modal is the single most crafted screen in the set: five severity rows, perfect baseline rhythm, each with a plain-language clause ("5 — Severe / Impassable. Needs a detour."). Someone designed that screen twice and it shows.

Now the cracks, with coordinates:

- **Light Home is rendering a fallback serif.** Compare `home__light` to `home__dark`: "No ramp," "Steep grade," "Use my location," and the LATEST/RECENT eyebrows are serif in light, the brand grotesque in dark. Same screen, same strings, two typefaces. That's a font-loading race caught on camera, and it means the light capture shipped to this reviewer un-QA'd.
- **The pin callout composites over the toolbar** (`map__light__pin-callout`): the callout's metadata line ghosts *through* the search/filter pill — you can read "SEVERITY 4 OF 5 · VERIFIED" bleeding under seven toolbar icons, and "No ramp" collides with the "Showing 9 flags" chip. Worst frame in the pack.
- **Occlusion is a pattern, not an incident.** Home's Report FAB sits on top of the sixth list row; the "Still trying" toast decapitates the "9 barriers" headline; the bulk-select bar on Tasks floats over a half-visible "very steep grade" card. Nothing reserves space for anything.
- **Settings eyebrow reads "SETTINGS / Settings."** The eyebrow system only works when the two lines say different things; here it stutters.

Spacing inside cards is genuinely good — the Tasks card's chip/title/meta/actions stack is confident, and severity chips ("3 · Moderate") align optically with the title baseline.

## 2. Material + motion

The material system mostly reads as one thing: soft white/near-black panes, generous radii, the same pane grammar on filter panel, sheets, legend, drawer. Dark mode is true parity, not an inversion filter — the dark map tiles under the dark filter panel (`map__dark__filter-open`) are the strongest material moment in the set. Onboarding commits to a deep-navy glass world in *both* themes; I'll allow it as a brand moment, but it's a decision someone should be able to defend out loud.

Motion, though — the transition frames are an empty folder wearing a trench coat. `report opening-t150`, `t400`, and `open-settled` are pixel-identical. Drawer at t120: fully open, fully opaque. Detail at t150: settled. Either everything animates in under 150ms (a cut, not a transition) or the tween isn't there. The one genuine mid-state captured is `drawer subswap-t120`: a **blank white page with a lonely spinner** between drawer and Settings. That's the motion story: instant everywhere except the one place you get a white flash. Credit where due: the reduced-motion frame matches the standard one, so the RM path is honest.

## 3. Voice

Mostly one voice, and it's a good one — plainspoken, warm, slightly protective: "Put it on the map so others know, and so it gets fixed." / "It's only used while the app is open — never tracked or stored on our servers." / "Still trying — check your signal." / "Your filters are hiding everything. Clear just the one in the way, or reset them all." That last line is the most distinctive sentence in the app. The severity descriptors ("Hard for many users") repeat verbatim from legend to report form — that's system discipline, not luck.

Three slips: Settings goes corporate ("Choose which flag status changes surface in the in-app updates banner" — nobody who wrote "check your signal" wrote that); the Tasks card says **"Resolved"** where the bulk bar says **"Resolve"** — one's a state, one's a verb, pick one; and "BUMBAKLOT" is live seed data in the Nearby list of a portfolio capture set. Also "How To Help" vs "About the App" — title-case drift in a five-item drawer.

## 4. Distinctiveness

Cover the logo and yes, I can identify it — from the severity grammar. The numbered chip in a yellow→red ramp is the same object on the Home list dots, the Nearby badges, the report form's selector (selected "3" gets an ink outline and a checkmark — lovely), the detail pill, the legend. **Signature in one sentence: a civic reporting tool whose brand is its severity scale — a typographic 1–5 color grammar that means the same thing on every surface.** That, plus the eyebrow/headline system and "your filters are hiding everything," is a real identity. The purple "Watch" button in the bulk bar is the one place a foreign accent color wanders in from another app.

Would this get an interview? Yes — the legend, the report form, and the copy show taste and system thinking that stock kits don't produce. I'd spend the interview asking why the transition frames are empty.

## 5. Score

**7/10 for craft.** The system thinking is 8+; the execution hygiene is 5.

The one pass I'd demand before calling it premium: **an occlusion-and-loading pass** — nothing composites over anything it shouldn't (callout vs toolbar, FAB vs last row, toast vs headline, bulk bar vs cards), the light-theme font race is fixed, and the drawer→Settings white-spinner flash is replaced with the pane it's about to become. Every one of those is a seam where the material illusion tears; sew them and this reads premium.

---

## R6 — first-time user under cognitive load

## Three minutes on the bus

**The slides.** First screen: "Welcome to AccessMap. See an accessibility barrier — a missing ramp, a broken sidewalk, a blocked path? Put it on the map so others know, and so it gets fixed." Okay — I get the whole app in one sentence, before I've tapped anything. That almost never happens. Slide two explains the loop (report, rate, others verify or resolve) and quietly admits photos need an account, in parentheses, like it's embarrassed — fine, honest. Slide three asks for location and says "It's only used while the app is open — never tracked or stored on our servers." I actually read that one, because it answered my suspicion before I formed it. Slide four, notifications: "Totally optional — you can turn this on later in Settings." No dark pattern, no begging. Then I tap Continue and… the same "Stay in the loop" screen shows again, still saying 4/5. One stutter. I assumed I fat-fingered it. Small, but it's the first moment the app feels less careful than it talks.

**Home.** "LATEST — 9 barriers." Big number, a search box, a little map postcard, a recent list with colored dots and plain words: "Severity 3 · Moderate · Open." I understand every row without being taught, which I appreciate at this hour. Two hesitations: the Tasks tab already has a red "6" on it — I've been here forty seconds and I apparently owe this app six things — and the postcard map doesn't look like the streets the full map later shows me. Feels like a picture of Somewhere Else.

**The map.** Cold open says "Loading flags…" in a pill — good, it tells me it's working instead of freezing. Then a "Nearby flags" list slides up on its own, which is actually what I wanted before I knew I wanted it: distances ("297 m"), real descriptions ("No ramp at the corner — wheelchair users have to detour"), statuses. Then I hit the third card: "Other · BUMBAKLOT · Severity 5 of 5 · Severe · Verified." Someone typed nonsense and the system stamped it *Verified*. That one card cost the word "Verified" most of its meaning for me. Also, closing the list: the pill says "Showing 9 flags" and I can see exactly one pin. Where are the other eight? I stare, feel stupid, assume they're off-screen, move on. The toolbar icons — "1+", some geometric thing — I'd never guess without tapping.

**Filing a report.** This is the best part. The sheet says "Report anonymously" — it didn't wall me behind sign-up. The blue banner: "Reporting anonymously — your identity is not stored." Severity buttons come with translations: "Significant — Hard or unsafe for most users," so my 4 means the same as everyone's 4. And then the footer, the line that decided the whole app for me: "Your report appears on the map right away for everyone; neighbours can verify it. AccessMap doesn't notify the city — see Resources." An app volunteering what it *can't* do, right above the Submit button where I'd feel most heroic. I trust that sentence more than everything on the slides combined.

**Voice.** It welcomes me almost everywhere: "so it gets fixed," "Totally optional," "Your anonymous report still counts." Where it processes me: the unexplained red "6" badge, "Review barriers — Verify and resolve reports" (I'm on a bus, I'm not staff), and icons that expect me to already know them.

**The bad moments.** "Still trying — check your signal" with a Retry button is exactly right — it's alive, it blames the network not me, it gives me a verb. The empty search ("Nothing matches… Try a different keyword or clear the search") is polite and clear. The load-error home is weaker — the headline just becomes a black smudge over gray skeletons, no words at all; that's the one screen I'd call "maybe broken." And when I denied location, the map silently dropped me in San Francisco with "Showing 9 flags" — no "we can't see where you are, so here's a default." I don't live in San Francisco. Just say so.

**Verdict.** I keep it. The deciding moment is that report footer — "AccessMap doesn't notify the city" — because an app honest about its limits is an app I'll believe about everything else. The moment that nearly undid it: BUMBAKLOT, Severity 5, Verified.

---

## R7 — Reduce Transparency user (engineered-material packet)

# My read of this app, as someone who lives in reduced-transparency mode

## First impression

This mostly feels like an app, not an apology. The Tasks screen is the best thing here: solid white cards on a quiet blue-tinted field, big honest type, and severity badges that say **"3 · Moderate"** in words and numbers, not just a colored dot I'd have to decode. Buttons are real buttons — filled Verify, outlined Reject, clear Details. Dark mode is the same app, same layout, same weight, just dark. Nothing about this screen whispers "fallback." It reads like someone's primary design.

The map legend is the other place I felt genuinely considered. Five severity levels, each with a number *inside* the dot, a name, and a plain-language sentence ("Impassable. Needs a detour."). Anonymous reports get a double ring, resolved gets a checkmark — meaning carried by shape, not shimmer. The loading state is a calm, static set of skeleton cards that match the real card layout exactly. No pulsing, no sliding sheen. It just sits there and tells me the shape of what's coming. That is exactly what I want from a loading screen and almost nobody gives it to me.

## Where it reads as the budget edition

1. **The report sheet leaks.** "Report anonymously" sits on a surface that is *almost* solid — but I can see ghosts of the list underneath: a smeared red blob near the severity picker, faint yellow smudges behind the fine print, highlighted stripes bleeding through around the description field. I turned transparency off precisely so content wouldn't float behind other content. This sheet didn't get the memo. It's the most visually noisy moment in the whole set, and it's the screen where I'm trying to fill in a form.

2. **The map filter panel does the same thing, quieter.** Street names ("Harvey Avenue") and a red pin ghost faintly through the panel in both light and dark. It's subtle, but it's the tell of a translucent surface that was dimmed rather than replaced.

3. **The dark map panel changes typeface.** In dark mode, "Showing 9 flags," "Save current filter," and the category chips render in what looks like a serif fallback font while the headings stay in the app's normal sans. Light mode is consistent. This is the single loudest "nobody looked at this version" signal here — mismatched fonts inside one panel makes the whole surface feel unowned.

4. **Pressing a card does nothing I can see.** The "press held" capture is pixel-for-pixel the resting screen. If the animation was removed for people like me, fine — but it should have been replaced with a solid state change (a fill, a border, anything). Right now I get no confirmation my finger landed. That's not "reduced motion," that's removed feedback.

5. **Small trust wobbles.** The Tasks tab badge says 9 while the list header says Open · 6 — which number do I believe? The light filter panel clips the third category chip at the screen edge with no hint there's more. And the signed-out Profile is one sentence and a button floating in a huge gradient void — calm, yes, but it's the one screen that feels unfurnished rather than minimal.

## Where it feels designed for me

- The entire Tasks screen, light and dark: solid, legible, hierarchical, complete.
- The severity grammar — number + word + color, everywhere, consistently.
- The legend's plain-language explanations and shape-coded statuses.
- The static skeleton loader that matches real content.
- The pinned Cancel / Submit bar on the report sheet: solid, high-contrast, unmissable.
- The anonymity notice ("your identity is not stored") in a solid tinted band — clear without being loud.

## Verdict

Yes — mostly first-class. Maybe 85% of this app was clearly designed as *the* app, not derived from something flashier. The core loop — read a list, judge severity, act — is solid and calm in a way I rarely get.

**The one change:** make every sheet and panel genuinely opaque. The report form and the filter panel both let ghosted content bleed through underneath, and that low-level visual static is the exact thing I turned transparency off to escape. Kill the bleed-through (and while you're in there, give my finger a visible pressed state), and this stops being "very good for my settings" and becomes just very good.

---

## Adversarial completeness critique (context-free; index + matrix spec only)

Cross-checked all 8 manifests (136 expanded captures) against the 151-row index. VERIFY1 arithmetic is honest: every manifest row is banked, all 4 FAILED rows have later successes. The gaps are versus the SPEC, not the manifests — the manifests themselves under-promise.

---

## (1) MISSING vs spec

**Screens that exist but were never banked (spec: "every reachable screen and sheet at rest"):**
- **Sign-in screen** — reachable without an account (Profile signed-out HeaderActions), zero captures in any group, either theme. The entrance to the account system is unbanked.
- **Resources drawer sub-screen** — proven to exist by `press:drawer-row` (pressHold "Resources"), never captured at rest in either theme.

**Dark theme absent on material-bearing surfaces whose own notes declare glass (spec: light+dark for material-bearing):**
- `address-search` (note: "B4c bulk glass") — light only.
- `feedback-modal` (B2-i chips) — light only.
- `changelog-modal` (note: "B4a **first glass Sheet consumer**") — light only.
- `myfeedback-modal` ("B4b bulk glass") — light only.
- Onboarding slides 2–5 and `onboarding-replay` — light only; **slide3-consent (S19, the consent moment) has no dark frame.**

**Glassmode (spec: "one sheet, both themes"):** `gm:report:clite` is light-only; `gm:legend:clite` light-only. The sheet-in-dark half of the requirement is unbanked.

**Transitions (spec: before/during/after + RM pass for EACH):**
- RM variants exist for only 3 of 8 transition subjects. Missing RM: report **closing**, drawer **opening**, legend opening, **detail opening (the S3 "trust transition")**, tabswitch.
- No "after" frame for nearby, legend, or detail (single t150 frame each). No post-close settled frame after report closing-t150. No drawer dismissal at all.
- `tabswitch t100` is a single frame — cannot "confirm the silence" without a before/after pair.

**A11y-tree (spec: every surface a blind reader would need):** no tree for the **filter panel open** (chips + min-severity + Clear), **onboarding slide3-consent**, help-modal/FAQ, tasks select-bulk mode, nearby-modal reopened variant (only the auto-list variant exists — acceptable twin, noted).

**States:** no offline state for home or tasks (only map refresh-failure). No dark for: offline-refresh, ready-submit (the submit-enabled boundary), locating-hang, still-trying, locate-failure, loading-cold. No success-register moment banked at all (spec lists success; the guest-reachable candidate is feedback-modal submit, unattempted).

**Widths:** report sheet and tasks never captured at 430 (severity pills and card rows are layout-sensitive; manifests only promised 390/375).

## (2) THIN

- **`voice/empty-filters__light__390__crop.png` almost certainly shows the wrong thing.** It uses the min-severity-5 recipe; the later CORRECTION rows (index lines 140–141) establish that recipe no longer empties the map (3 sev-5 flags live). The crop was banked *before* the correction and never re-shot with the Broken-sidewalk recipe — its note claims "the PROTECT-2 card copy," which is likely false.
- `heat-caveat` crop: note hedges "B7a companion line **if it fires**" — no confirmation it fired; fixed clip y500/h344 may have missed the line entirely.
- Press group is near-monochrome: only tasks-card has a dark pressed frame; the **signature severity control** pressed exists light-only, no RM variant.
- `clear-all` pressed has no rest twin — no banked frame anywhere shows the Clear button visible-but-unpressed (base filter-open has no active filter, so Clear is absent from every rest frame).
- Focus-visible: only 2 captures (home tab3, report tab2). Nothing for map controls (zoom, action bar) or tasks cards.
- Onboarding slide4's note admits a skip ("optional 'Not now' not visible").

## (3) CONTRADICTIONS

- **`states/map__{light,dark}__390__empty-filters.png` — filename lies.** Last-row-wins CORRECTION notes say "filters active but NOT empty." Two files sit on disk under a state name they do not depict; anyone pulling by filename gets counterfeit evidence. The true state lives in `empty-filters-true`, so the *coverage* survives but the *naming* is contradictory.
- **slide5 ≡ slide4.** Slide5's note admits all three distinguishing steps were skipped ("Not now" / "Maybe later" / "Next" not visible), so its nav collapses to slide4's nav — two files, one UI state; the true onboarding tail is uncaptured.
- `press/tasks-verify` note contains an unresolved question in its own text ("never released into a mutation? release happens on ctx close…") — the fence claim is asserted as a guess, not a verification.
- Every a11y-tree row has state = literal `undefined` (index hygiene bug, 15 rows).
- FAILED rows: PASS — all 4 (clear-all, changelog, map-auto-list tree, legend tree) closed by later successes.

## (4) TOP-UP LIST (prioritized)

1. **Re-shoot `voice/empty-filters` crop** — light 390; map → Toggle filters → "Filter by Broken sidewalk" → close panel → crop ~y180/h480 of the real PROTECT-2 card.
2. **Rename or re-shoot the two mislabeled `empty-filters` frames** to `filters-active-nonempty` (or overwrite via the true 0-count recipe) — one honest name per file, both themes.
3. `base/signin__light+dark__390__at-rest` — Profile tab → Sign in header action, wait 1400.
4. `base/resources__light+dark__390__at-rest` — Open navigation menu → click "Resources" → wait 900 (past the 220ms gate).
5. Dark quartet: re-run address-search / feedback-modal / changelog-modal / myfeedback-modal navs with theme=dark, 390.
6. `glassmode/report__dark__390__clite` (+ legend clite dark) — glassLite + dark, "Report a barrier" nav.
7. `base/onboarding__dark__390__slide3-consent` — clearOnboarded, Next ×2, dark; and instrument slide4/5 with the on-screen slide indicator to bank the true tail.
8. RM transition completion: detail rm-opening-t150 (callout → "Open details", reducedMotion, settle 150), report rm-closing-t150, drawer rm-opening-t120, tabswitch rm-t100.
9. Settled after-frames: nearby / legend / detail `open-settled` (same navs, settle 900) + tabswitch t0/t400 pair to prove the no-animation claim.
10. A11y trees: filter-open (map → Toggle filters), onboarding-slide3-consent (clearOnboarded + Next ×2), help-modal.
11. `states/map__dark__390__offline-refresh` + `states/report__dark__390__ready-submit` — same recipes, dark.
12. `press/clear-all__light__390__rest` — map → Toggle filters → "Filter by Blocked path" → screenshot without hold (the missing rest twin).

**PASS areas:** manifest-vs-disk integrity (136/136, VERIFY1 arithmetic independently re-derived and correct); FAILED-row closure; base coverage of the manifest's own promises incl. 375/430 on home+map; states light-theme breadth (empty/loading/error/offline/denied/hang/skeleton/boundary all present); voice breadth (10 F4 moments); core-screen a11y trees; drawer subswap transition trio; press rest-pairing via base for all controls except clear-all.
