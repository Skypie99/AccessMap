# 01 — SCREEN GRAPH FROM CODE (the checklist)

**Source of truth:** `App.tsx` (gates) + `src/navigation/RootNavigator.tsx` (tabs, hidden routes, shared-modal pool, drawer host) + import census of every `<Modal>`-bearing file in `src/screens` + `src/components`, at main @ `bc91789`.
**Coverage law:** N nodes below = the denominator. Every node ends BANKED / GATED-explained / UNREACHABLE-explained. FlagDetailModal etc. are counted ONCE as nodes; extra parents are listed as entry points to exercise.

## Architecture (one paragraph)
`App` → fonts gate → `ErrorBoundary` → `FirstLaunchGate` (AsyncStorage `@accessmap/onboarded_v1` → **OnboardingCards** on fresh install) → `Gate` (Supabase session): session → SignedInArea(RootNavigator @ saved default tab); no session + native → **SignInScreen** (`onGuest` latch → guest RootNavigator @ Home). Tabs: Home · Tasks · Profile visible; FullMap/Settings/Admin hidden routes (drawer/nav-ref). Root-level siblings: DrawerHost (BEFORE) then SharedModalsHost (LAST — modal-over-modal ordering is load-bearing, see RootNavigator comment). Any surface that is itself a Modal mounts its own legal sheets via `useLegalSheets()` (About, ReportFlag, FlagDetail, ReportContent) because iOS can't present the root pool over a presented modal.

## A. Top-level surfaces (11)
| # | Node | Entry | Auth reality |
|---|------|-------|--------------|
| A1 | OnboardingCards | fresh install (device gate, pre-auth) | walkable |
| A2 | SignInScreen | post-onboarding signed-out; also sign-in sheet hosted on Profile | **EDGE ONLY** (fill/validation; never authenticate — credential prohibition). Has Terms/Privacy links (Apple 1.2 consent line ~`:339`) |
| A3 | Home tab (editorial) | initial route | guest OK |
| A4 | Tasks tab (+ badge) | tab bar | guest: read; actions may gate |
| A5 | Profile tab — GuestProfile variant | tab bar while guest | guest OK |
| A5b | Profile tab — signed-in variant | requires session | **SKY-QUEUE** (password-only auth; agent cannot sign in) |
| A6 | FullMap (params: focusFlag/flagId/openReport) | Home "Open full map" · task row focus · `accessmap://flag/{id}` | guest OK |
| A7 | SettingsScreen (lazy) | drawer | expect guest OK (verify) |
| A8 | AdminScreen (lazy) | drawer, only `is_admin===true` | **GATED** — not registered for guest; census-complete, walk N/A |
| A9 | HamburgerDrawer | menu button (Home/Tasks/Profile/FullMap headers) | guest OK |
| A10 | ErrorBoundary fallbacks (app-level + per-screen "Try again") | induced by render crash only | **INDUCED-ONLY** — bank as DEVICE-ONLY unless a crash occurs naturally |

## B. Shared modal pool at root (6)
| # | Node | Entry points |
|---|------|--------------|
| B1 | HelpModal | (find live entry — Profile/Settings/drawer) |
| B2 | ChangelogModal | (find live entry — About/Settings) |
| B3 | FeedbackModal | "Feedback" header button on every headered surface |
| B4 | MyFeedbackModal | Profile/Settings |
| B5 | TermsScreen (pooled modal) | About · ReportFlag consent · SignIn |
| B6 | PrivacyScreen (pooled modal) | About · SignIn cover |

## C. Screen-owned modals (unique nodes, 17)
| # | Node | Parents |
|---|------|---------|
| C1 | AddressSearchModal | MapScreen, HomeScreen |
| C2 | FilterPresetsModal | MapScreen |
| C3 | FlagDetailModal | MapScreen, TasksScreen, ProfileScreen |
| C4 | SavedPlacesModal | MapScreen |
| C5 | LegendModal | MapScreen |
| C6 | NearbyFlagsModal | MapScreen |
| C7 | ReportFlagModal (lazy) | MapScreen (also via Home "Report" pill → FullMap openReport) — **anon write TO THE EDGE** |
| C8 | PhotoLightboxModal | TasksScreen |
| C9 | AchievementsModal | ProfileScreen (likely authed → SKY-QUEUE if gated) |
| C10 | ActivityFeedModal | ProfileScreen (authed?) |
| C11 | MyReportsModal | ProfileScreen (authed?) |
| C12 | MyWatchedModal | ProfileScreen (authed?) |
| C13 | NotificationPrefsModal | ProfileScreen, SettingsScreen |
| C14 | LeaderboardScreen (modal) | ProfileScreen |
| C15 | AboutScreen (modal) | ProfileScreen, SettingsScreen, Drawer |
| C16 | HowToHelpScreen (modal) | Drawer |
| C17 | ResourcesScreen (modal) | Drawer |

## D. Settings-owned (3)
| # | Node | Parents |
|---|------|---------|
| D1 | HiddenCommentsModal | SettingsScreen |
| D2 | OnboardingModal (replay) | SettingsScreen |
| D3 | NotificationPreferencesScreen | SettingsScreen |

## E. Nested in FlagDetailModal (3)
| # | Node | Parent |
|---|------|--------|
| E1 | PhotoGallery | FlagDetailModal, ReportFlagModal |
| E2 | ReportContentModal | FlagDetailModal |
| E3 | StatusHistoryModal | FlagDetailModal |

## F. In-modal legal-sheet copies (states, not nodes — must each be exercised)
- F1 About→Terms/Privacy (own copy) · F2 ReportFlag→Terms (own copy) · F3 FlagDetail→(copy) · F4 ReportContent→(copy) — **today's `bc91789` merge fixed exactly this class; regression-verify all four.**

## G. System-dialog nodes (walk where inducible)
- G1 Location permission prompt (user-initiated only — privacy gate: NO auto-prompt on mount; verify it does NOT appear un-asked)
- G2 Photo library picker (sim supports; camera = DEVICE-ONLY)
- G3 Notification permission (from prefs surfaces)
- G4 Destructive `confirm()` dialogs (Alert 2-button: delete/sign-out/reset — cancel path only where row is real data)

**NODE TOTAL: 40** (11 A + 6 B + 17 C + 3 D + 3 E) + F/G exercised as sub-checks.
**Per-node matrix:** iPhone 17 Pro Max full pass (light + dark) · iPhone 17e top-flow repeat (Onboarding, SignIn-edge, Home, Drawer, Tasks+FlagDetail, FullMap+Report-edge, Settings) · Dynamic Type AX spot-pass per screen · portrait-lock check (app.json `orientation: portrait`).
**Known-unwalkable (census-honest):** A5b + authed-gated C-rows (password auth; Sky one-tap: sign into reviewer account on both booted sims, then successor window walks them) · A8 Admin (role-gated) · A10 (induced) · camera half of G2.
