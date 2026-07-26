# Fable Audit — AccessMap — Part 1: Blinded persona baseline reads

Six fresh Fable-5 agents, ZERO project context, blinding fence enforced ("you know nothing
about this product; Read ONLY the exact files listed — no source, no docs, nothing else on
disk"). Each received only capture files from `assets/` (R2: the a11y-tree dumps FIRST).
Their unprimed reactions are first-class evidence — banked verbatim below, one section per
reader, in arrival order. Packets are recorded in each section header; the R5 width cap is
ledgered (01_orientation.md §7 #13). After all six: the adversarial completeness critique +
its top-up record.

---

## R6 — First-time user under cognitive load (arrival #1)
Packet: onboarding slides 1–5 + Home + Map (first-arrival, at-rest, filter-open, pin-callout, legend) + Tasks + report chain (open→ready-submit), light @390 — 17 files, flow-ordered.

### Per-screen first impressions
- **1. Welcome slide:** Dark, calm screen — "see an accessibility barrier, put it on the map so it gets fixed." Got it instantly: pothole-reporting but for ramps and sidewalks. Only nag: fixed *by whom*?
- **2. How it works:** Tap the spot, photo, "rate how bad it is," other people verify. So it's Waze-style crowd stuff, not the city. Fine, moving on.
- **3. Location slide:** Suddenly they're called "flags" instead of barriers — took a beat. The privacy line ("only while the app is open, never stored on our servers") is reassuring. But the only big button is "Allow Location" — I hesitated looking for a "not now"; my only outs are tiny Skip or Back, so it feels like consent is the toll to continue.
- **4. Notifications:** "Stay in the loop," with a clear "Maybe later." Easiest slide — I'd tap Maybe later and feel fine.
- **5. You're all set:** Sparkle, feel-good line, "Open the Map." No confusion, decent send-off.
- **6. Home:** Headline "5 barriers" and a recent list — but the map preview is a near-black square inside a white app; my first thought was "the map failed to load." List says "Minor · open" — I briefly read "open" as open-for-business, not unresolved. And Tasks already has a red 2 badge — do I owe someone work? I just got here.
- **7. Nearby flags list:** I tapped "Open the Map" and got a list instead — small whiplash. Cards are readable (colored number, distance, "Severity 4 · verified"), so number = severity clicks here. But the #1 severe "verified" item is "BUMBAKLOT" and another is "Mean dog" — looks like nobody's minding the store.
- **8. Map at rest:** Pitch-black map again, "5 flags nearby" but I can only see ONE pin — where are the other four? A row of unlabeled icons; "1+" means nothing to me yet. I'd poke the List button because the map itself feels dead.
- **9. Filter panel:** Now "1+" makes sense — minimum severity. But the first thing the panel shows me is "Save current filter" before I've filtered anything, and the STATUS row is cut off mid-chip. Busy, but survivable.
- **10. Pin callout:** Best moment so far: "No ramp — SEVERITY 4 · VERIFIED — wheelchair users have to detour." Plain words. But the bubble floats weirdly far above the pin, and there's nothing to DO with it — no details, no directions, just an X.
- **11. Legend modal:** Oh — THIS explains everything: 1 Minor "inconvenient" through 5 Severe "impassable," plus what the categories mean. Great text, but it was hiding behind a tiny "?" icon; tired me would likely never have found it.
- **12. Tasks:** "Review barriers — verify and resolve reports." So the badge wasn't MY tasks, it's community moderation. I'm shown one-tap Verify / Resolved / Reject buttons for a "Mean dog" I've never seen — can I really verify from my couch? Also the tab badge says 5 but the list says OPEN 2 — numbers don't match and I don't know why.
- **13. Report form:** Title "Report anonymously" — okay, low stakes, I like the "your identity is not stored" banner. But the location is raw coordinates "49.88740, -119.49250" — meaningless; no address, no mini-map to confirm I'm pinning the right corner. And category "No ramp" plus severity 3 appear pre-chosen — I could submit without actually deciding anything.
- **14. Category chosen:** Tapped "Blocked path," chip turns blue. A chip starting with "M…" is cut off at the edge — I guessed there are more if I scroll. Fine.
- **15. Severity chosen:** Picked 4 and the label under the row updated: "Significant — hard or unsafe for most users." This inline explanation is exactly what the rest of the app was missing.
- **16. Description filled:** Typed a note, counter shows 110/2000. No friction.
- **17. Ready to submit:** Blue "Report anonymously" button. I *think* it drops a public pin others can verify… but nothing tells me who sees it, whether the city is involved, or what happens next.

### Task-walk verdict
Yes, I understood the app within the first two slides: crowd-sourced map of wheelchair/accessibility problems, where strangers verify each other's reports. Severity took much longer — Home speaks in words (Minor/Severe), the Nearby list speaks in numbers (4, 5), and the decoder ring is buried behind a "?" legend; it only truly clicked on the report form's inline label ("4 — Significant — hard or unsafe for most users"). Submitting: I believe the blue button posts an anonymous pin at those coordinates for other users to see and verify — but the app never says who receives it, and the onboarding promise "so it gets fixed" is never cashed out; for all I know it goes nowhere official. Quit risks: the location slide (no visible "not now" — I nearly bailed rather than tap Allow), and the black "broken-looking" map on Home — if I weren't being paid to persist, that plus "BUMBAKLOT · Severity 5 · verified" would have ended my session; I'd have concluded the app is unfinished and unmoderated.

### Top-5 frictions
1. **The map looks broken.** Near-black tiles inside a light-mode app on Home and the Map tab, plus "5 flags nearby" with only one visible pin — the core surface of a map app reads as a rendering failure.
2. **Junk content wearing a "verified" badge.** "BUMBAKLOT" at Severity 5 and "Mean dog" as top nearby items torpedo trust in the entire verify system the app is built on.
3. **One thing, four names.** Barriers → flags → reports → tasks across consecutive screens, plus "open" as a status word that reads like business hours. Each rename costs a tired user a re-orientation.
4. **Severity is never explained where you first meet it.** Words-only on Home, numbers-only on the list, cryptic "1+" in the toolbar; the legend that explains it hides behind an unlabeled "?". Only the report form teaches it in place.
5. **The submit is a black box at a nameless spot.** Raw lat/long instead of an address or mini-map, pre-selected category/severity I might submit by accident, and zero statement of who sees the report or what "getting fixed" means.

### Would I trust it?
Cautiously, with my location — the "only while the app is open, never tracked or stored" line is clearer than most apps manage, and anonymous reporting means I'm not handing over an identity. But I would not yet trust it with my effort: the flagship "verified" item near me is gibberish, the map looks half-rendered, and nobody tells me whether my report reaches a human who can fix anything. I'd file one low-stakes report as an experiment and quietly watch whether anything ever happens to it.

## R1 — Wheelchair user planning a route around barriers (arrival #2)
Packet: FIND sequence + map/state shots @390, both themes — 28 files (Home, Map first-arrival/at-rest, filter-open/active, pin-callout, nearby, legend, heatmap-on, zoomed-out-clusters, permission-denied, offline-refresh, empty-filters, Home load-error).

### Per-screen first impressions

- **home / light / at-rest:** Instantly legible — "5 barriers, most recent reports," severity color dots, verified vs open on every row. But no locations or distances on the cards, so I can't tell if any of these are on MY block; and the blue Report button sits on top of the last report in the list, half-hiding it.
- **map / light / first-arrival (auto list):** Landing straight in a "Nearby flags" list with distance, severity number, verified status, and age is exactly what I want — "No ramp at the corner, 297 m, verified" is actionable. Then I hit "BUMBAKLOT, Severity 5, verified" and my stomach drops — that's graffiti wearing a verified badge.
- **map / light / at-rest:** Pill says "5 flags nearby" but I see exactly ONE pin — where are the other four I just read about? Also the zoom +/- buttons are buried underneath the count pill, and half the toolbar icons ("1+", the shapes one) mean nothing to me yet.
- **map / light / filter-open:** The panel leads with "Save current filter" before I've filtered anything, category chips show live counts (No ramp 2 — useful), but the STATUS row is chopped off mid-chip at the panel's edge — looks broken, and I can't tell it scrolls.
- **map / light / filter-active:** "1 of 5 shown" up top is honest and immediate, active filters show as badges in the toolbar, and "WHO DOES THIS AFFECT? Wheelchair, walker, or scooter" is the single most relevant control in the whole app — buried at the bottom of a scroll, with the next chip cut off mid-word.
- **map / light / pin-callout:** "No ramp — SEVERITY 4 — VERIFIED — wheelchair users have to detour" tells me everything except what to DO: no photo, no date, no detour hint, no details button. It's a dead end exactly where I need a next step.
- **map / light / nearby-modal:** Same list as arrival — solid, scannable, distances and freshness on every card; still anchored by a verified severity-5 that reads as a joke ("BUMBAKLOT") and a severity-1 "Mean dog."
- **map / light / legend-modal:** The severity scale in plain language ("5 — Severe. Impassable. Needs a detour.") is genuinely great — I could judge risk from this alone. But it defines only 3 categories while the filters clearly have more (Missing signal, Steep grade, Other) — so half the map's vocabulary is undocumented.
- **map / light / heatmap-on:** The disclosure ("heat zones need 3+ flags, coverage varies") is refreshingly honest — but nothing on the map actually changed, so I can't tell if the layer is on, empty, or broken.
- **map / light / zoomed-out-clusters:** Looks identical to at-rest — one lone pin, no cluster bubble, no count. Five reported barriers and the map still visually claims one.
- **map / light / permission-denied:** This is the one that would strand me: I'm silently dumped on a citywide San Francisco map (I'm not in San Francisco), zero pins, and the pill still says "5 flags nearby" — a flat lie — with no banner telling me location is off or how to fix it.
- **map / light / offline-refresh:** "Loading flags…" with no offline warning, no error, no "last updated" stamp. If I'm in a dead zone mid-trip, this looks exactly like "still working" forever — and an empty map reads as "no barriers," which is the most dangerous possible misreading.
- **map / light / empty-filters:** Best state in the app — "0 of 5 shown," "Your filters are hiding everything," and one-tap surgical fixes (All categories / Any severity / Reset all). This is how every failure state here should behave.
- **home / light / load-error:** The headline is replaced by a blank dark bar and the list is gray skeleton stripes — no error message, no retry button. It's indistinguishable from loading forever; I'd sit there waiting on data that already died.
- **home / dark / at-rest:** Faithful twin; the dark map preview actually matches the theme here (in light mode it looked like a black hole). Same gaps: no locations on cards, Report button still overlaps the last row.
- **map / dark / first-arrival (auto list):** Same strong list, same verified junk entry; contrast holds up fine in the dark.
- **map / dark / at-rest:** Same one-pin-versus-"5 nearby" contradiction; pin still pops nicely against the dark tiles; zoom buttons still trapped under the pill.
- **map / dark / filter-open:** Legible in dark, same cropped STATUS chips at the panel edge.
- **map / dark / filter-active:** Same clear "1 of 5 shown" and toolbar badges; the wheelchair filter chip is readable; bottom chip still amputated.
- **map / dark / pin-callout:** Callout stays white-on-dark — high contrast, easy read; still no photo, date, or next action.
- **map / dark / nearby-modal:** Consistent with light; distances and status read cleanly.
- **map / dark / legend-modal:** Severity colors survive dark mode fine; still only 3 of the app's 6 categories explained.
- **map / dark / heatmap-on:** Same honest tooltip, same invisible result — the light-gray HEAT MAP legend chip floats there explaining colors that appear nowhere.
- **map / dark / zoomed-out-clusters:** Identical to dark at-rest; no visible clustering, no counts.
- **map / dark / permission-denied:** Same silent San Francisco dump, same stale "5 flags nearby," no recovery path — equally stranding in the dark.
- **map / dark / offline-refresh:** Same eternal "Loading flags…" with no offline signal.
- **map / dark / empty-filters:** The recovery card works just as well in dark — still the app's best moment.
- **home / dark / load-error:** Same message-less skeleton graveyard, just darker; nothing tells me anything failed or how to retry.

### Task-walk verdict

Could I plan a safe route with this? Partially — as a pre-trip scouting tool, the core loop is surprisingly strong: I open the map, get an automatic nearby list with distances, severity numbers, verified badges, and ages; the legend translates severity into exactly my terms ("Impassable. Needs a detour."); and the filters let me narrow to "severity 3+, open or verified, affects wheelchair users" — that's a real barrier briefing for the blocks ahead. The flow carries me cleanly from arrival → list → filter → legend, and the empty-filter state even helps me back out of a dead end gracefully.

But it drops me in three places that matter most to someone who can't improvise around a curb. First, the map itself under-reports: "5 flags nearby" renders as one pin, so the visual picture I'd actually navigate by hides four barriers. Second, a pin callout is a cul-de-sac — severity 4, verified, "wheelchair users have to detour," and then nothing: no photo to judge for myself, no detour suggestion, no detail view. This app finds barriers; it never helps me get around them. Third, and worst, the failure states fail silently: deny location and I'm teleported to San Francisco under a stale "5 flags nearby" claim; go offline and it says "Loading…" forever; if home data errors, I get skeletons with no retry. Mid-journey, every one of those silences converts to "map shows nothing" — and for me, an empty map that's actually a broken map is how you end up stuck at an intersection with no curb cut.

### Top-5 frictions

1. **map / permission-denied:** Location denial silently dumps me on a default San Francisco map with zero pins, no explanation, no re-enable prompt — and a stale "5 flags nearby" pill actively lying about it.
2. **map / offline-refresh:** Offline shows an indefinite "Loading flags…" with no offline banner or last-updated timestamp, so a data outage is indistinguishable from "no barriers here."
3. **nearby list (first-arrival / nearby-modal):** A verified, severity-5 report reading "BUMBAKLOT" means the verification badge — the one thing I'd base a detour decision on — can be earned by garbage.
4. **map / at-rest & zoomed-out-clusters:** The map claims "5 flags nearby" but renders a single pin with no cluster counts, so the picture I'd plan from omits most of the known barriers.
5. **home / load-error:** A failed load is just a blank bar plus endless skeletons — no error text, no retry — so I'd wait on dead data without knowing it.

### Would I trust it?

The app's *vocabulary* earns trust — plain-language severity ("Impassable. Needs a detour."), verified-versus-open on every card, honest heatmap caveats, and a wheelchair-specific filter tell me it was designed by people who understand my stakes. But the *data* betrays that design the moment "BUMBAKLOT" shows up verified at severity 5: if that badge is meaningless, so is the severity-4 "no ramp" I was about to detour around. And the *app* fails silently in exactly the situations where I'm most exposed — offline, location denied, load errors — so I'd use it as a helpful pre-trip scouting layer over my own knowledge, but I would not yet bet an outing on it, because betting wrong means sitting at a missing curb cut waiting for help.

## R4 — One-handed / limited-dexterity user (arrival #3)
Packet: size-labeled base + flow shots @375 + @430, both themes — 28 files (Home, Tasks, Map at-rest, filter-open, report ready-submit, tasks select-bulk, drawer).

### Per-screen first impressions

- **Home, light 375:** The Report FAB and tab bar sit right under my thumb — great — but the FAB floats on top of the third "No ramp" row and its chevron, so aiming at that row risks firing Report instead. Hamburger and chat bubble are twin circles in the top-right, a full regrip away; the mini-map's +/− zoom squares are middle-left, cross-screen.
- **Home, light 430:** Same layout stretched taller: the FAB no longer overlaps the list (good), but the top-right hamburger/chat and the search field move even further outside my arc. Top half of this screen is effectively two-handed territory.
- **Tasks, light 375:** Verify is a huge full-width pill low on the card — lovely. But "Select multiple" is upper-right, the category chips are a horizontal-scroll rail ("Blocked path" is cut off mid-word, so I must drag sideways to see more), and the Resolved/Reject/Details row is crowded below the fold.
- **Tasks, light 430:** All four card actions visible: Verify big and blue, then Resolved/Reject/Details as three adjacent pills — tappable height, but close enough together that a wobble hits Reject when I want Details. Chips rail still scrolls horizontally ("Miss…" truncated at the edge).
- **Map, light 375:** The "List" pill bottom-right is exactly where my thumb lives — the one mercy. The Leaflet +/− zoom buttons are top-left AND half-hidden behind the "5 flags nearby" chip, leaving slivers smaller than a fingertip; the 7-icon toolbar (search, help, filter, severity, cluster, refresh, recenter) is a tight top row with no gaps, and recenter — the anti-drag control — is top-right.
- **Map, light 430:** Identical chrome pinned to the top of a much taller screen; the toolbar and the occluded zoom buttons are now genuinely unreachable one-handed. List pill stays bottom-right, still good.
- **Map filter open, light 375/430:** The panel drops from the TOP. Save current filter, category chips, severity — all in the upper half; on 375 the panel cuts off at "Minimum severity," so I must scroll inside it. Dismissal is a tiny chevron beside "Filter flags" or the toolbar icon, both top targets; there is no bottom-anchored Apply/Done. On 430 the extra sections (status, "Who does this affect?") stretch even further from my thumb.
- **Report form, light 375:** Best screen in the app: Cancel and "Report anonymously" are pinned bottom, severity is five discrete buttons (no slider, no pinch), and the selected 4 has a visible check. Frictions: category chips scroll horizontally with the fourth chip a sliver at the edge, and "Sign in" is a small text link.
- **Report form, light 430:** Same bottom-pinned CTAs — reachable even on the big phone. Severity row lands mid-screen (manageable); category rail and the banner's Sign-in link sit in the stretch zone; the underlying Close button is top-right, far.
- **Tasks bulk-select, light 375/430:** The action bar (Verify/Resolve/Watch/Cancel) docks right above the tabs — perfect height. But selecting requires hitting a small empty circle at each card's top-right corner (well under fingertip size for me), on 375 only one card is visible above the bar so it's select-scroll-select-scroll, and Cancel sits flush right — exactly where my thumb lands when I'm aiming for Watch.
- **Drawer, light 375/430:** All five items plus the X live in the top half; the bottom half of the drawer is empty dead space. Rows are tall and full-width (nice), but on 430 even "Sign in," the lowest item, needs a regrip. Also the hamburger that opens this is top-right on Home but top-left on Map — my reach strategy changes per screen.
- **Home/Tasks/Map, dark (both sizes):** Same geometry, same reach math. The dark map toolbar actually adds divider lines between the seven icons — slightly easier to aim — but the zoom buttons stay occluded white slivers under the flags chip. One real defect: on dark Home 375 a stray square lightning-bolt button sits on top of the Home tab, so tapping Home would hit it instead.
- **Map filter + Report form, dark (both sizes):** Layouts identical to light; the report form keeps its bottom-pinned CTAs and buttonized severity, the filter panel keeps everything top-anchored. Nothing gets closer to my thumb in the dark.
- **Tasks bulk-select + Drawer, dark (both sizes):** Same placements; the disabled Verify/Resolve/Watch pills dim into the dark background, so it's harder to tell what's tappable before I spend a press on it — wasted taps cost me more than most people.

### Task-walk verdict

Browsing barriers one-handed: yes, with the escape hatches — the bottom-right "List" pill and the Tasks tab let me read every barrier without a single pinch or drag, which is genuinely rare. But the moment I touch the map itself I lose: zoom buttons are occluded top-left slivers, recenter is top-right, and filtering means operating a top-anchored panel with horizontal chip rails. Finishing the report form one-handed: yes, comfortably — bottom-right FAB to open, button-based severity, submit pinned under my thumb. That flow feels designed for me; the map chrome feels designed for someone else's other hand.

### Top-5 frictions

1. **Map (both sizes, both themes) — the +/− zoom buttons:** the only pinch alternative is in the far top-left AND half-buried under the "5 flags nearby" chip, leaving sub-fingertip slivers. Functionally, zoom has no accessible fallback.
2. **Map filter panel — the whole sheet:** top-anchored controls, in-panel scrolling on 375, dismissal via a tiny chevron or the top toolbar icon, and no bottom Apply/Done. Every filtering decision is an overhead reach.
3. **Tasks bulk-select — the per-card selection circles:** small circles at each card's top-right while the action bar waits at the bottom; on 375 it's one card per screenful, and Cancel sits at my thumb's natural landing spot next to Watch.
4. **Home 375 — the Report FAB overlapping the third Recent row** (I'd mis-fire Report when aiming at the row's chevron), plus the dark-375 lightning button squatting on the Home tab.
5. **Global top chrome — hamburger/chat, Feedback, Close, "Select multiple," and the drawer's top-half-only menu** (with the hamburger swapping corners between Home and Map), all demanding a regrip or second hand on every visit.

### Would I trust it?

Half of it, wholeheartedly: the report flow and the List pill prove someone on this team thinks about hands like mine — big bottom-pinned targets, buttons instead of sliders, no forced gestures on the money path. But the map surface and its filter panel would punish me daily: occluded zoom slivers, top-anchored everything, and small selection circles mean dropped-phone reaches and mis-taps I can't afford. I'd trust it to file a report; I'd brace myself every time I had to touch the map.

## R3 — Low-vision, large-type user (arrival #4)
Packet: DT-proxy shots (zoom 1.3× / 2.0×) + standard-size pairs @390, both themes — 24 files (Tasks, Map, Report, Profile signed-out).

### Per-screen first impressions
- **Tasks · light · standard:** Big bold "Review barriers" is lovely, but the line I actually need — "1.6 km · 19 min walk · 9h ago" — is small faint gray, and the "Blocked path" chip is already clipped at the screen edge. A "VERIFIED" section header is half-buried under the bottom nav.
- **Tasks · light · 1.3×:** Mostly survives — the "Nearest open barrier" banner wraps politely to two lines. Card buttons (Verify/Resolved/Reject/Details) squeeze into touching pills, and filter chips scroll off to "B…".
- **Tasks · light · 2.0×:** Falls apart. Title truncates to "Revi…", subtitle to "Verify and resolve re…", and the three sort controls collapse to "N…", "O…", "S…" — I cannot tell what any sort option is. Zero task cards visible above the fold.
- **Map · light · standard:** The map tiles are near-black even though my phone is in light mode — street names are faint gray on black, invisible to me. The "+" zoom button hides behind the "5 flags nearby" chip, and the toolbar is a row of unlabeled little icons ("1+"?).
- **Map · light · 1.3×:** The locate (crosshair) button clips off the right edge of the toolbar — my most important map control, gone. Chip still sits on the zoom buttons.
- **Map · light · 2.0×:** Header reads "MapFeedback" — title and button literally overlap. Toolbar keeps only search/?/filter with "1+" half-cut; refresh and locate vanish. The flag pin ends up trapped behind a two-line attribution bar. Only the "List" pill stays big and clear.
- **Report · light · open:** Genuinely readable — huge title, chunky category chips, big numbered severity circles with plain words ("Moderate — Hard for many users"). The GPS coordinates and the footer note are small gray, though.
- **Report · light · 1.3×:** Banner wraps to three lines fine; all five severity circles still fit. "Report anonymously" button text wraps to two lines and presses against its pill edges; "Blocked path" chip clips to "Block".
- **Report · light · 2.0×:** Broken. The privacy banner wraps mid-word ("Reporti / ng anonym / ously") into a vertical shard of text, and the "Report anonymously" label spills outside its blue pill toward Cancel — I can't tell where one button ends and the other begins. Category, severity, and description are all pushed below the fold.
- **Profile signed-out · light · standard:** One clear sentence and one big blue Sign in button. Easy. Acres of empty space, but nothing to lose.
- **Profile signed-out · light · 1.3×:** Message wraps to two lines, button grows. Fine.
- **Profile signed-out · light · 2.0×:** Header collides into "ProfiFeedback" — same overlap bug as the Map. The message and Sign in button themselves stay perfectly readable.
- **Tasks · dark · standard:** White-on-near-black main text is actually easier on my eyes than light mode; yellow "1 · Minor" badge pops. But the same faint-gray metadata line, faint "Sort:", and the clipped "VERIFIED" header persist.
- **Tasks · dark · 1.3×:** Same as light 1.3× — banner wraps, buttons crowd, chips scroll off. Nothing dark-specific breaks.
- **Tasks · dark · 2.0×:** Identical collapse: "Revi…", "N… O… S…" sort pills, no cards above the fold. Dark contrast is fine; the labels are simply gone.
- **Map · dark · standard:** Now the chrome matches the dark tiles. Street names are still faint gray on black — the map is a void in both modes. "+" still buried under the flags chip.
- **Map · dark · 1.3×:** Locate button clipped off the toolbar edge again; List pill drifts over street labels.
- **Map · dark · 2.0×:** Same wreck as light: "MapFeedback" overlap, refresh/locate gone, pin behind the attribution bar. The white zoom squares at least stand out against dark tiles.
- **Report · dark · open:** Best-looking screen in the app for me — light-blue banner on navy, white numbers on dark severity circles, strong footer buttons. Coordinates still faint gray mono.
- **Report · dark · 1.3×:** Matches light 1.3× — survivable; submit label wraps to two lines hugging the pill edge.
- **Report · dark · 2.0×:** Same mid-word banner shredding, and the white "Report anonymously" text overflows the blue pill on both sides — on a dark background the button boundary dissolves entirely.
- **Profile signed-out · dark · standard:** White message on near-black, big button — good contrast, better than light mode's gray-on-pale-blue.
- **Profile signed-out · dark · 1.3×:** Fine; everything scales and wraps.
- **Profile signed-out · dark · 2.0×:** "ProfiFeedback" header mash again; content below stays excellent.

### Task-walk verdict
At my text size (the 2× shots are my reality), I could *find* barriers but not comfortably *work* them: the Tasks list still shows readable card titles once I scroll, but the sort controls are reduced to single letters, the screen title is ellipsized, and the distance/age metadata was already too small and faint at standard size. Filling the report form is where I'd fail: at 2× the privacy notice becomes vertically shredded mid-word text, every form field (category, severity, description) is shoved below the fold between a header and a sticky footer, and the submit button's label overflows its pill so far that I genuinely could not tell whether I was about to tap "Report anonymously" or "Cancel." At 1.3× I could complete it; at 2× I would either abandon the report or mis-tap.

### Top-5 frictions
1. **Report modal · 2.0× (light and dark):** Submit button label overflows its pill and bleeds toward Cancel, the banner wraps mid-word into unreadable fragments, and the entire form drops below the fold — the app's core action becomes unsubmittable.
2. **Tasks · 2.0× (both modes):** Sort options collapse to "N…/O…/S…" and the title/subtitle truncate — controls turn into meaningless confetti instead of wrapping or stacking.
3. **Map · 2.0× (both modes):** "Map" title overlaps the Feedback button ("MapFeedback" — also on Profile), and the locate + refresh tools clip off the toolbar with no visible way to reach them; locate is already clipped at 1.3×.
4. **Map · standard, both modes:** The tiles are dark even in light mode, with faint gray street labels I cannot read at any size — plus the "+" zoom button is permanently hidden behind the "5 flags nearby" chip.
5. **Tasks/Report · standard, both modes:** The supporting text I depend on — "1.6 km · 19 min walk · 9h ago," "Sort:", GPS coordinates, the sign-in footnote — is small AND low-contrast gray, a double penalty for my eyes.

### Would I trust it?
Half of this app was clearly built with someone like me in mind — huge headings, chunky pill buttons, plain-language severity labels, text that genuinely respects my size setting, and a dark mode that's actually easier on my eyes. But at the text size I really use, both headline flows degrade into truncated labels and overlapping buttons, and the map — the heart of an accessibility app — is a black rectangle with ghost-gray street names in either theme. I'd trust it enough to browse at 1.3×, but at my full setting I'd stop trusting my own taps, and for an app about accessibility, that stings.

## R2 — Blind, VoiceOver-primary user (arrival #5)
Packet: 7 a11y-tree dumps FIRST (light @390: onboarding, profile-signedout, signin-modal, map-first-arrival, map, tasks, report), then 9 cross-check PNGs light @390.

### Per-screen first impressions

- **onboarding__light__390.txt** — A dialog with no accessible name opens; I hear "Skip the tutorial", then an unlabeled "image", then "1 / 5… Welcome to AccessMap…" — and then, without pressing anything, slides 2, 3, 4, and 5 all read out in sequence. All five carousel cards are in the tree at once, so the "Next. Card 1 of 5." button at the very end contradicts what I just heard (I've already "seen" all five cards). The writing itself is warm and clear, "Back. Disabled on first card." is a genuinely thoughtful disabled-state explanation, but the visual state (one slide at a time, per the screenshot) and my state (everything at once) don't match, and each slide starts with an anonymous "image".
- **profile-signedout__light__390.txt** — Short and honest: menu button, "Profile" heading, "Feedback", one unlabeled "image", then "Sign in to see your stats, badges, and reports." and a well-labeled "Sign in to your account" button. The tab bar says "Profile" is selected — good. The tab named "2 Tasks" makes me wonder: two of what, and is that a count of new things or all things?
- **signin-modal__light__390.txt** — The sign-in dialog is appended after the entire profile screen, which is still fully traversable behind it: I can swipe from "Open navigation menu" through the old "Sign in to your account" button and the tab bar before ever reaching the dialog, and the dialog itself has no name. Inside, it's decent: "Go back without signing in" is a great label, fields are labeled ("Email address", "Password"), and the privacy note is readable. But the logo announces "AccessMap, image" immediately followed by "AccessMap, heading" (double), the tagline text run ends with a glued-on "…more accessible. Email address", and the Password field is exposed as a plain `textbox`, not a secure field.
- **map-first-arrival__light__390.txt** — I land on "Map" and traverse: one lone pin ("No ramp — severity 4"), zoom buttons, then five stops of attribution noise ("Leaflet", "©", "OpenStreetMap", "contributors ©", "CARTO"), then "5 flags nearby", then a well-labeled toolbar (Search by address, Map legend, Toggle filters, Refresh flags, Recenter on me), then a tab bar where NO tab is marked selected — and only after all of that, at the very end of the tree, the auto-opened "Nearby flags" dialog. That list is the best thing in the app: every row announces category, severity, distance, status, and description in one breath. But it says "5 flags nearby" while the map itself exposes exactly one pin, and if focus isn't thrown into the dialog on open, I'd have no idea a list appeared.
- **map__light__390.txt** — Same screen minus the list: now four of the five advertised flags simply do not exist for me; the map surface is one pin plus attribution links. "Open nearby flags list" is my lifeline and it is labeled well. Still no selected tab, still no Report button anywhere on this screen.
- **tasks__light__390.txt** — The very first node I land on is an unlabeled "image", then "TASKS Review barriers" as one mashed text blob that is not a heading. Filter chips announce as bare buttons ("No ramp", "Broken sidewalk"…) with no pressed state and no hint they filter rather than create; sort tabs have no selected state. Section headers announce twice ("Open 2, heading level 1" then "Open, heading level 1"). Cards have good summary names and clearly labeled actions ("Verify this flag", "Mark this flag resolved"), but the action buttons are nested inside a parent button, and the card's name drops the description and distance ("Mean dog", "1.6 km · 19 min walk") that sighted users see. The tab bar now says "5 Tasks" where every other screen said "2 Tasks".
- **report__light__390.txt** — The report form is the third layer of a stack: the whole map screen AND the leftover "Nearby flags" list content are still in the tree above it, so the form starts roughly 60 swipes in. Once there: "Report anonymously" heading, an actual `alert` for the anonymity notice (excellent), superb severity descriptions ("Severity 5: Severe — Impassable. Needs a detour."), a labeled description field, and a clearly named "Submit anonymous flag report" button. But the location is raw coordinates ("at 49.88740, -119.49250") with no way to hear, set, or change where that is; no category or severity button exposes a selected state; and there are two identical "Sign in" links, one dropped mid-sentence.

### Task-walk verdict

**FIND — Can I learn what barriers are near me and how bad? YES, with one road.** The map surface alone is unusable non-visually: one pin ("No ramp — severity 4", missing the status and distance its list twin has), attribution noise, and a "5 flags nearby" count I can't act on. But the "Nearby flags" list rescues the task completely — "No ramp, severity 4, 297 meters away. Status verified. No ramp at the corner — wheelchair users have to detour." tells me everything in one announcement, and the category tabs even carry counts ("Filter by No ramp, 2 flags"). Where I get lost: on first arrival the auto-opened list sits at the very end of the traversal order behind ~20 map-control nodes, the dialog has no accessible name, and after closing it I must remember "Open nearby flags list" exists, because the map gives me back only one of the five flags. Severity arrives as a bare number in the list (the plain-language scale — Minor/Severe — only exists on Tasks and in the report form).

**CONTRIBUTE — Can I fill in and reach submit? THE FORM, YES; STARTING AND PLACING IT, NO.** Fatal problem first: in every map tree I was given there is no Report button at all — the sighted screenshots show a big "+ Report" FAB on Home and a tap-the-map flow, neither of which surfaced in my traversal, so I cannot discover how to begin. If someone opens the form for me: category and severity buttons are beautifully labeled but expose zero selected state — the screenshots prove "No ramp" and severity 3 are pre-selected, and nothing in the tree tells me that; the only trace of my severity choice is an unlabeled `img` (the checkmark) inside the chosen button plus a mashed echo line ("Moderate Hard for many users.") floating after button 5. The location is spoken as raw coordinates I cannot verify or adjust — no "use my current location", no address entry in the form. The description field and "Submit anonymous flag report" button are labeled and reachable, so I can technically arrive at submit — after wading through the entire map screen and the stale list content stacked above the form — but I would be submitting a report whose category, severity, and location I cannot confirm.

### Every unlabeled / ambiguous node

- `img` × 5 (onboarding, one per slide) — unlabeled decorative images, each announced as "image".
- `dialog:` (onboarding) — dialog has no accessible name.
- `text: 1 / 5` … `text: 5 / 5` (onboarding) — all five position markers exposed at once; reads "one slash five".
- `button "Next. Card 1 of 5."` (onboarding) — position claim conflicts with all five cards being simultaneously traversable.
- `img` (profile-signedout, line 5) — unlabeled image before the sign-in prompt.
- `tab "2 Tasks"` (profile-signedout, signin-modal, both map trees, report) vs `tab "5 Tasks" [selected]` (tasks) — the count changes meaning between screens; ambiguous what it counts.
- `dialog:` (signin-modal) — unnamed dialog, and the entire profile screen behind it (from `button "Open navigation menu"` through the `tablist`) remains traversable — no modal containment.
- `img "AccessMap"` + `heading "AccessMap"` (signin-modal) — same word announced twice in a row.
- `text: Spot barriers. Share them. Make your community more accessible. Email address` (signin-modal) — the field label "Email address" is glued onto the tagline text run.
- `textbox "Password"` (signin-modal) — not exposed as a secure/password field.
- `button "No ramp — severity 4"` (map, map-first-arrival, report) — the only map pin; missing the status ("verified") and distance its list counterpart announces; the other 4 of "5 flags nearby" have no map presence at all.
- `link "Leaflet"` / `text: ©` / `link "OpenStreetMap"` / `text: contributors ©` / `link "CARTO"` (all map trees) — five fragments of attribution noise mid-traversal; "contributors ©" reads as a broken phrase.
- `tablist:` with `tab "Home"`, `tab "2 Tasks"`, `tab "Profile"` (map, map-first-arrival, report) — NO tab carries `[selected]` on any map-based screen; I cannot tell where I am. (Also `tab "Home"` lands me on a screen whose heading is "Map".)
- `button "Toggle filters"` (map trees) — no expanded/pressed state.
- `button "Map legend"` (map trees) — no expanded state.
- `dialog:` containing `heading "Nearby flags"` (map-first-arrival) — the dialog wrapper itself is unnamed, is last in traversal order, and the map beneath stays traversable.
- `img` (map-first-arrival line 50; report line 49) — unlabeled image (search icon) inside the Nearby flags panel.
- `tab "Show all categories": All (5)` etc. (map-first-arrival, report) — no `[selected]` on any category tab (screenshot shows "All" visibly selected).
- `img` (tasks, line 1) — the first node on the screen is an unlabeled image.
- `text: TASKS Review barriers` (tasks) — page title is plain mashed text, not a heading; the screen has no h1 of its own.
- `button "Send feedback":` with only `img` (tasks) — named fine, but icon-only and inconsistent with other screens' visible "Feedback".
- `button "Select multiple"` (tasks) — no pressed/expanded state.
- `button "Show all categories": All`, `button "No ramp"`, `button "Broken sidewalk"`, `button "Blocked path"`, `button "Missing signal"`, `button "Steep grade"`, `button "Other"` (tasks) — filter chips with no selected/pressed state and no "filter" context; "No ramp, button" alone is ambiguous (filter? create? category of what?). Screenshot shows "All" selected in blue — invisible to me.
- `tab "Sort by Newest"` / `"Sort by Oldest"` / `"Sort by Severity"` (tasks) — no `[selected]`; screenshot shows Newest active.
- `heading "Open 2" [level=1]` containing `heading "Open" [level=1]` + `text: "2"` (tasks) — nested duplicate headings announce twice; same for `heading "Verified 3"` / `heading "Verified"`.
- `button "Other, severity 1, open. Tap to view on map."` (tasks) — card name omits the visible description ("Mean dog") and distance/walk time; and it CONTAINS `button "Verify this flag"`, `button "Mark this flag resolved"`, `button "Reject this flag"`, `button "View flag details"` — interactive buttons nested inside a button (same for all five cards).
- Report tree lines 47–61 (report) — the entire "Nearby flags" heading, search box, tabs, and all five flag rows remain traversable underneath the report dialog; three UI layers stacked in one tree.
- `dialog:` (report) — unnamed dialog again.
- `img` (report, line 64) — unlabeled image next to the location line.
- `text: at 49.88740, -119.49250` (report) — raw coordinates; no address, no control to hear or change the location.
- `'button "Category: No ramp"'` … `'button "Category: Other"'` (report) — no selected state on any of the six; screenshot shows "No ramp" pre-selected.
- `'button "Severity 3: Moderate — Hard for many users."'` containing bare `img` (report) — the selection checkmark is an unlabeled image; no `[pressed]`/`[selected]` on any severity button.
- `text: Moderate Hard for many users.` (report) — selection echo with missing punctuation, placed after button 5 so its association is unclear.
- `link "Sign in"` twice (report, lines 69 and 90) — identical link names; the second is spliced mid-sentence ("Your anonymous report still counts." / "Sign in" / "to add a photo and help verifiers act faster.").
- Missing node (report entry): no "Report" control exists in any map tree — the sighted "+ Report" FAB (home screenshot) and tap-to-place-pin flow have no accessible counterpart in the trees I walked.

### Top-5 frictions

1. **I cannot start or place a report.** No Report button exists in any map tree, and the form's location is spoken only as raw coordinates with no way to set it to "where I am" or to an address — the one thing this app exists to do is gesture-gated behind tapping a map I cannot see.
2. **Selection state is invisible everywhere.** Report category and severity, Tasks filter chips, sort tabs, list category tabs, and the bottom tab bar on map screens all fail to expose selected/pressed — I can fire the submit button but can never confirm what I'm submitting or which filter is active.
3. **Modals don't contain me.** Sign-in, the nearby list, and the report form are all appended after fully-traversable background screens (the report form sits under ~60 nodes of map and stale list content), and every dialog is unnamed — each layer change is a navigation maze.
4. **The onboarding carousel exposes all five slides at once** while its buttons insist I'm on "Card 1 of 5", and unlabeled bare images pepper every screen — the Tasks screen literally opens on "image".
5. **Tasks screen structure is noisy and unstable:** double-announcing nested h1 section headers, action buttons nested inside card buttons, card names that drop the description and distance sighted users get, a page title that isn't a heading, and a tab badge that says "2 Tasks" everywhere except the Tasks screen, where it says "5 Tasks".

### Would I trust it?

Half of it, and the half I'd trust is real: whoever built the flag list, the severity descriptions, the anonymity alert, and labels like "Back. Disabled on first card." was clearly writing for my ears, and for FINDING barriers I'd genuinely use this over a raw map app. But I can't confirm a single selection I make, can't place a pin, and can't even find the report button — so as a contributor I'd be submitting blind in the worst sense, into an app whose whole promise is that disabled users' reports can be trusted. I'd read it daily and never file from it until the form tells me what it heard me choose.

## R5 — Senior mobile craft reviewer (arrival #6)
Packet: full base set @390 + @834, both themes — 64 files (375/430 omitted as near-dupes of 390 — ledgered cap, 01_orientation.md §7 #13).

### Per-screen first impressions

- **home** — Confident editorial header ("LATEST / 5 barriers") and clean pill language; but the map preview is dark tiles even in light mode, Leaflet attribution (Ukraine flag, blue links, clipped "CARTO") pokes through, and the FAB covers the last row's chevron. Tablet: right ~25% of the map card is empty un-tiled darkness and the lower half of the page is dead space.
- **tasks** — The most designed screen: eyebrow header, chips, sort pills, "nearest barrier" callout, severity chips, status pills. Crack: one action row mixes three secondary-button styles (gray-filled "Resolved", outlined "Reject", blue-text "Details") and a non-parallel verb. Tab badge reads 5 here but 2 everywhere else. Tablet: comically wide pills/buttons, same single column.
- **profile-signedout** — Different app: centered small title, rounded-*square* hamburger (Home/Tasks use circles), Feedback pill. Body is a barren gradient with one line + button; on tablet it's an ocean of nothing, and dark-834 shows a ghost "Tasks" label bleeding under the header.
- **map (at-rest)** — The flagship screen is the least native: raw white Leaflet zoom rectangles (both themes), the "5 flags nearby" chip physically overlapping the + control, icon-only toolbar with a stray "1+" text glyph, full-width gray attribution strip. Light mode = giant dark tile slab sandwiched by white chrome. Tablet: cluster badge clipped in half at screen edge.
- **map (first-arrival-auto-list)** — Solid list; but the "Close" button is a bordered rectangle wearing a web focus ring (unique in the app), the chip row clips mid-word ("Other (2"), time formats mix "29d ago" with "Jun 2, 2026", and demo content includes "BUMBAKLOT". Severity is a numbered circle here vs. colored dot + word on Home — two grammars for the same datum.
- **drawer-open** — Handsome always-dark branded rail, consistent line icons, "Made with ♥ in Canada" footer; genuinely premium in both themes. Casing drifts ("How To Help" vs "About the App").
- **settings** — Best-behaved standard screen; sections, cards, segmented appearance control all read as one system in both themes. Minor: icons appear on only two rows; Tasks badge back to 2.
- **about** — Content and typography are lovely; light-390 sheet is translucent enough that home-screen blocks ghost through the body text (reads as a rendering bug). Close is an X-in-circle — one of three different close affordances in the modal family.
- **howtohelp** — The most flawless screen in the set: tinted squircle icons, perfect card rhythm, warm copy, immaculate dark translation. Tablet just stretches but survives.
- **resources** — Same pattern as How To Help but icon containers switch to blue *circles* and monochrome — sibling pages, different icon grammar. Good disclaimer footer.
- **signin-modal** — The premium moment: pin mark, wordmark, glass card, glowing gradient CTA, privacy microcopy. But it's an island: always dark regardless of theme, the app's only gradient, a "← Back" text link found nowhere else, and tablet stretches the form to ~1240px.
- **feedback-modal** — Emoji category chips (🐛💡❤️💬) break the line-icon system; light-mode sheet ghosts content behind text; disabled "Send" is washed-out low contrast; the REPLY EMAIL field is hidden behind the Cancel/Send row at both widths.
- **help-modal** — Clean FAQ cards, consistent search, good "Didn't find it?" callout (much louder saturated blue in dark). One of the tidier modals.
- **changelog-modal** — Grabber, date pill, tidy bullets; consistent in all four variants. Title says "What's New" while its Settings entry says "What's new."
- **myfeedback-modal** — Fine sheet, but the empty state is a glossy Apple emoji (💬) floating on a dark card, and "My Feedback" vs "My feedback history" naming drift.
- **onboarding-replay** — Classic, calm, correct; but the brand mark is a *different* pin than sign-in's, dark mode swaps to a lighter primary blue, and the tablet Next button is a 1300px-wide slab.

### Task-walk verdict

The core system — editorial headers, pill buttons, chips, 20–24pt card radii, uppercase eyebrows, the blue/amber/red severity palette, and an unusually humane copy voice — is real and mostly holds in both themes; dark mode is clearly first-class. But the app reads as **two kits stitched together**: Home/Tasks live in the editorial family, while Map/Profile/Settings live in a centered-title family with a different hamburger shape, and the map itself imports raw web-widget chrome that no premium native app would ship. **Strongest screen: How To Help** — every element (tinted squircles, rhythm, copy, dark translation) belongs to one voice; sign-in is the most impressive single moment but it breaks theme and introduces one-off materials. **Weakest screen: Map (light mode)** — the product's namesake surface has overlapping controls, untinted Leaflet chrome, a clipped attribution strip, and dark tiles jammed into a light shell.

### Top-5 frictions

1. **Map screen material breakdown** (map, light theme worst, 390 + 834): dark tiles in light mode, white default Leaflet zoom rectangles in dark mode, "5 flags nearby" chip overlapping the + control, full-width web attribution strip — the hero screen feels embedded, not built.
2. **Two navigation architectures** (home/tasks vs map/profile-signedout/settings, all variants): editorial left headers + circular icon buttons vs centered titles + rounded-square hamburger + Feedback pill; same drawer trigger drawn two ways.
3. **Light-mode sheet translucency bug + form footer collision** (about light 390, feedback-modal light 390/834): underlying content ghosts through body text; disabled Send is near-invisible; the reply-email input hides behind the button row.
4. **Tablet is a stretched phone** (tasks 834: ~450px sort pills and ~320px card buttons; home 834: un-tiled map void + dead lower half; signin/onboarding 834: full-width slab CTAs; profile 834: emptiness). Only the Map uses the width honestly.
5. **Icon-language and affordance schism** (feedback + myfeedback emoji vs line icons app-wide; X-in-circle vs bare X vs focus-ringed "Close" across about/howtohelp/map-list; squircle vs circle icon chips between howtohelp and resources; "What's New"/"What's new," badge 2 vs 5, "29d ago" vs absolute dates).

### Would I trust it?

Mostly, yes — the privacy microcopy, the accessibility-first About text, the honest changelog, and the warm consistent voice signal a maker who cares, which buys real trust. But the raw web chrome on the flagship map, see-through modals, and a profanity-adjacent demo string ("BUMBAKLOT") read as a passion project rather than an audited product, so I'd trust it with a sidewalk report but hesitate before assuming institutional-grade rigor. It's one focused polish pass — unify the two header families, theme the map chrome, fix the light-mode sheets — away from genuinely premium.

---

## Adversarial completeness critique (context-free; input = 01_render-index.md + the Stage-3 matrix spec only)

### Verdict
GAPS-FOUND — the matrix's bulk (388 files, internally consistent counts, honest FAILED-supersede chains) is genuinely strong, but at least four spec-named items have neither a capture nor an adequate honesty row.

### Findings
1. **SignIn guest affordance has zero evidence rows.** Spec item 2 names it explicitly ("SignIn incl. the guest affordance"). The only SignIn rows are `base/signin-modal__*` (light+dark × 4 widths) and `a11y-tree/signin-modal__*`, whose note — "modal variant — no guest affordance by design (onClose only)" — itself implies a non-modal SignIn variant exists where the affordance lives. That variant has no capture, no a11y tree, and no unreachable/ledger row. This is a flat spec miss, not an arguable one: the named element is neither shown nor de-scoped.
2. **The signed-in Profile branch is silently absent across four spec items.** Every Profile row in base (×8), DT (×8), glass (×2), and a11y-tree (×2) is `profile-signedout`; the note "web guest = the signed-out Profile branch (ProfileScreen.tsx:812)" explains what *was* captured but never de-scopes the signed-in branch. The only auth-gate honesty rows are scoped to map saved-places (the `saved-places-UNREACHABLE | code-inferred` row) and obliquely to one component (probes note "auth-gated live row (ProfileScreen.tsx:1319)"). Under item 1 ("every reachable screen") plus the closing rule ("never silently skipped"), signed-in Profile needed its own unreachable row; it has none — and the gap propagates into item 4 (DT on "Profile") and item 9 (Profile tree).
3. **The locating state has no successful evidence anywhere, plus a tag/content mismatch.** Item 3 demands "locating + permission-denied"; permission-denied is fully covered (×8). But `states/map__{light,dark}__390__locating-transient.png` are tagged `web-approximated` while their own note admits "transient 'Finding your location' not caught" — banked PNGs whose state column claims content the note says isn't in the image, with no retry row and no code-read pointer to the banner UI (the spec's fallback requires ledger entry + pointer). Consequently item 7's "always-light locating banner over both tile families" has zero evidence of any kind.
4. **Item 7's light-tile family is uncapturable on web and only partially, mis-scopedly ledgered.** Base map notes state "tiles = CartoDB dark_all always on web," so "pins over light tiles," "heat legend over light tiles," and "locating banner over light tiles" were never captured. The lone `NEEDS-SKY-DEVICE` flag for the light-tile family sits inside the chips-over-tiles-closeup notes and is scoped to saved-place chips. Pins and the heat legend over light tiles have neither capture nor their own honesty row — covered only by inference across scattered notes, which I judge inadequate for a three-part spec demand.
5. **RM "sheet presentations" have no row.** Item 5 lists onboarding, sheet presentations, skeleton pulse, press sheen, map camera. The rm/ group covers onboarding (rm-slide2), drawer-open, tasks at-rest (note: skeleton + sheen RM-gated in code), map at-rest (note: fly-to duration 0). Skeleton/sheen/camera are acceptably handled as stills-plus-code-read-notes, but no RM still of the report bottom-sheet (or any Sheet) exists and no note de-scopes it — despite the same surface being cheaply reachable (it was captured ×8 in normal mode).
6. **Parked mandate (item 8) RecentlyViewedRow is delivered thin.** Spec: "both themes × 2 sizes." Delivered: two `lab-mockup` rows (light/dark) at a single width literally recorded as "mock." The auth-gate honesty and code pointers (ProfileScreen.tsx:1319; RecentlyViewedRow.tsx:139,202) are good, but the mandated size axis was silently dropped with no note saying why it doesn't apply to the mockup.
7. **Map-specifics run at 2 of the 4 mandated widths.** heatmap-on, zoomed-out-clusters, and chips-over-tiles-closeup exist only at 390/430; the matrix default is "the four sizes unless stated" and item 7 states no reduction. (locating-transient and first-load-skeleton at 390-only are partially excused by their in-row "best-effort transient" notes.)
8. **Empty-results confirmation never lands.** The `states/map__*__empty-filters` notes read as pre-flight intent — "aiming for zero matches; verify the empty-state card rendered" — and no later row confirms zero matches were actually achieved, so item 3's "filters that produce zero" rests on an unverified instruction-shaped note.
9. **Note/trailer hygiene contradictions.** (a) The VERIFY1 trailer claims "0 failed" while the last rows for the 8 `saved-places-modal` filenames are FAILED; this reconciles only because honesty row 462 explicitly claims those 8 as the de-scoped state — adequate, but the trailer wording fights the header's last-row-wins rule. (b) All 8 `ready-submit` rows carry the copy-pasted "no file chooser fired — captured trigger state" clause alongside "ENABLED submit affordance visible," muddling what the PNG shows (and silently proving the form needs no photo — never stated). (c) The light pin-callout success rows are duplicated verbatim.
10. **Second carousel only shows pane 1.** The index itself identifies `onboarding-replay` as "the 3-card post-sign-in intro," but only at-rest (pane 1) is captured; panes 2–3 have no rows and no note. Low severity — item 2's "every carousel pane" is fully satisfied for the first-launch carousel (5 slides × both themes × 4 widths), and item 1's at-rest is met.

### Suggested top-ups
- Capture the full-screen SignIn variant with the guest affordance (both themes × 4 widths + a11y trees), or add an explicit unreachable row with a code-read pointer to where the affordance lives.
- Add a dedicated honesty row "profile-signedin UNREACHABLE (no auth session) — code-read pointer" explicitly covering the base/DT/glass/tree axes it voids.
- Re-hunt locating via network throttle at 390 both themes; if still uncatchable, re-tag the two locating-transient rows honestly (state not shown) and add a code-read pointer row for the locating banner satisfying both item 3 and item 7.
- Add one ledger row de-scoping the entire light-tile family on web (pins, heat legend, locating banner, chips) as NEEDS-SKY-DEVICE, citing the dark_all-always constraint.
- Capture `rm/report__{light,dark}__390__rm-open.png` (sheet presentation under reduced motion) or add a one-line de-scope note.
- Add a second-width RecentlyViewedRow mockup, or a note stating why the size axis doesn't apply to the lab-mockup.
- Extend heatmap-on / zoomed-out-clusters / chips-over-tiles-closeup to 375 and 834, or append a stated size-reduction note to the index header.
- Append a confirmation note to the empty-filters rows attesting the zero-result empty-state card is actually in frame.
- Fix the ready-submit notes (drop the copy-pasted photo-trigger clause; state plainly that submit enables without a photo), dedupe the repeated pin-callout rows, and reword the VERIFY1 trailer to "0 unsuperseded failures within expected(388); 8 saved-places files de-scoped per ledger row."
- Capture onboarding-replay cards 2–3 (both themes, standard width) or note the de-scope.

### Top-up record (main session, 2026-07-04)
Every actionable finding was executed the same session: F1/F2/F4/F6/F8/F9 honesty + correction + attestation rows appended to the index; F3 solved with REAL deterministic captures (`states/map__*__390__locating-hang.png` — slow-GPS emulation via a never-resolving getCurrentPosition stub) plus correction rows on the two missed-transient files; F5 `rm/report__*__390__rm-open.png` captured; F7 map specifics extended to all four widths (+12 files); F10 replay panes 2–3 captured (+4 files). Final reconciliation: **VERIFY1 PASS — expected(410) == on-disk == indexed, 0 missing / 0 failed / 0 orphan. CRITIQUE PASS.**
