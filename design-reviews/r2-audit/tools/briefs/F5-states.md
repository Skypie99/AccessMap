# F5 — STATES AS DESIGNED MOMENTS

Census every empty/loading/error/offline/success state per surface against the PROTECT-2 bar —
the empty-filters recovery card (MapScreen.tsx:2161: explains + offers the one-tap fix + stays
honest; R1 called it "the app's best moment"). For each state: does it meet the bar, or is it a
bare spinner/dead end? Build the census as a TABLE (surface · state · what renders · meets-bar?
· evidence) before writing findings.

The state inventory to walk (states/ group + code-read the rest): empty filters (the bar itself
— has it survived the uplift intact?) · Tasks empty-search · Nearby empty · Help empty-search
(B4b re-inked) · MyFeedback empties (B2-i icons) · AddressSearch no-matches/error/recents ·
Home load-error (blockSupabase) + the B9b refresh-fail-with-data notice (code-read — web capture
infeasible) · Map offline-refresh + offline-age banner (B9a) · permission-denied arrival (S4) ·
locating-hang (PROTECT-6 watch) · locate-failure with Retry (B10) · skeletons (slowdata; static
under RM — the rm-skeletons shot; C-lite/RT static by law — test-inferred) · still-trying (S11,
12s escalation) + 30s ceiling fallback (code-read) · loading-cold vs Updating split (S11 —
'Updating…' half code-read) · heat no-zones companion (B7a) · ready-submit boundary + slow-submit
overlay (S11 write half — code-read past the fence) · success: "Report filed" beat (S10 —
code-read; the LiveStatusRegion mechanism + FlashBanner tones) · points flash (auth — code-read;
B1/Fork-2 honesty gap is KNOWN — cite, don't re-find).

Waiting moments: does the app hold your hand (skeleton shape, "still trying", honest ages) or
leave you hanging (unbounded spinners, blank panes)? Success moments: do they land as designed
beats (visible + spoken + timed) or administrative afterthoughts? Failure states are design
surfaces, not plumbing — judge their MATERIAL too (do error banners ride the design system or
raw defaults?).

Skeleton coverage: which loading surfaces have content-shaped skeletons vs spinners vs nothing
(census by grep for Skeleton/ActivityIndicator per screen). Honesty: skeleton static under
RM/RT/C-lite (test-inferred via B5's net; the rm-skeletons capture).

Your asset groups: `states/` (all), `voice/` crops (state copy in close-up), `base/`
(select-bulk, heatmap-on). Repo: LiveStatusRegion.tsx, FlashBanner.tsx, ui/Skeleton.tsx,
flagsStore.tsx (timeout ladder), copy.ts, errors.ts.
