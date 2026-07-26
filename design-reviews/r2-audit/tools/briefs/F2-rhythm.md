# F2 — RHYTHM & OPTICAL ALIGNMENT

The spacing scale in practice: token discipline (`spacing` 4pt grid, DESIGN.md §3) vs ad-hoc
numbers per screen — grep for raw paddings/margins/gaps in the screens and judge whether drift is
perceptible in the captures (a token nit that renders invisible is POLISH; a broken rhythm a
reader can see is higher). Walk the vertical rhythm down each scroll (base/ group, both themes,
mid-scroll states): section header → card → gap cadence on Home, Tasks, Profile, Settings; does
the eye get a beat, or does density fight the editorial read?

Optical alignment: icon-to-text baselines (Lucide 2px icons beside AppText — B2's fresh swaps are
prime territory: Feedback chips, AddressSearch states, drawer rows); badge/disc centering — GRID
THE SEVERITY DISC/BADGE EVERYWHERE IT APPEARS (Nearby rows, Legend, Report severity buttons,
Tasks cards, Home recent rows, callout, detail modal — the S2 ink flip means the digit sits on
the disc: is it optically centered, consistently sized, consistently spaced from the word?);
chip rows (filter panel, category chips, status chips — equal heights? consistent padding?);
card grids and the new HeaderActions circles vs the editorial eyebrow (S8 — do five screens now
truly share ONE header rhythm, or do Profile/Settings/Map wear it at different weights/offsets?).

Breathing room as the ethos' restraint: where is the app generous, where cramped? The 375 shots
are the stress row. Judge the map overlay stack (pill + chip row + action bar + zoom column +
attribution hairline — S6/S7/S8 added chrome; does the overlay still breathe or is it crowding
the tiles?). Dark-mode rhythm: luminosity-led edges — do hairlines carry the rhythm in dark as
shadows do in light?

Your asset groups: `base/` (all), `states/` (zoom130/zoom200 proxies for rhythm under stress),
`voice/` crops (micro-alignment in close-up). Repo: the screens + ui/ primitives.
