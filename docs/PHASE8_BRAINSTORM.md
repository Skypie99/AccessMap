# AccessMap — Phase 8 Brainstorm: The Social Layer

**Author:** Morgan (Project Manager)
**Date:** 2026-05-31
**Status:** BRAINSTORM — not a plan, not a spec. Sky's call on what to build.
**Predecessor:** Phase 7 (Growth & Scale) — routing, venue profiles, trust gating live
**Phase theme:** Community. Warm. Human. Nexopia-and-MySpace energy. NOT Instagram.

---

## 0. The Framing

Before any feature: the purpose of the social layer.

Nexopia (2003–2012) and MySpace (2003–2011) succeeded because they made the internet feel *personal*. Your page was yours. Your top 8 were yours. A bulletin board post felt like a note on a corkboard, not a broadcast to an audience. The experience was messy, warm, and deeply human — because humans built it, not recommendation engines.

Instagram, TikTok, and their successors optimized for engagement. They replaced personal expression with performance. They replaced communities with audiences. They replaced warmth with metrics.

AccessMap's social layer will not do that.

The people who map accessibility barriers are doing something genuinely altruistic. They are using their disability — their daily lived experience of navigating a world not built for them — as a contribution to a shared infrastructure that makes cities more navigable for others like them. That deserves a social layer that honors what they're doing: not a follower count, not a like button, not an algorithm. A community.

**What Nexopia and MySpace had that Instagram doesn't:**
- **Ownership:** your profile was yours to configure, not a performance stage for an algorithm
- **Locality:** the social graph was real — people you knew or were near in your city
- **Human curation:** you chose your top 8, not an algorithm that decided for you
- **Bulletin boards:** a shared community space, not a personalized feed
- **Warmth:** "leave me a comment" was a human gesture, not an engagement trigger

These are the design principles for Phase 8.

---

## 1. Community Profiles

**What it is:**
More than a scorecard. A contributor's public page that tells their accessibility story, shows their neighborhood, displays their top-reported barrier types, and invites thank-you notes from the community. The intersection of "here's who I am" and "here's what I've built in my city."

**What makes it Nexopia/MySpace specifically:**
- **Custom tagline (80 characters):** "Fighting for ramp access in the Mission since 2026." Not a bio optimized for discoverability — a declaration. The kind of thing you'd write in your Nexopia "about me" box that was half-sincere, half-identity statement. People who remember the early web will feel it immediately.
- **Banner color choice:** 12 palette options, each named for real-world accessibility concepts: *Wayfinder Blue, Ramp Yellow, Signal Green, Curb White, Midnight Slate, Civic Gold, Crosswalk Orange, Route Teal, Barrier Red, Pathway Sage, Summit Violet, Stone Grey.* Enough personality without chaos. No custom images, no custom CSS — the named color palette is its own form of expression.
- **"Mapper since" date:** prominently displayed. In the early web, seniority mattered and was displayed with pride. "Mapper since July 2026" in a community that launched in 2026 means something — it means you were here at the beginning.
- **"About me" field (280 characters):** free text, no prompts, no suggestions. People will write whatever feels right to them. That's the point. Some will write about their disability. Some won't mention it at all. Both are correct.
- **Tier badge front and center:** the Diamond badge is not buried in a stats table. It is the first thing you see on someone's profile, displayed large and proud — the way a MySpace profile picture was unavoidable. You earned it.
- **Impact stats from Phase 7 (Area Analytics):** "47 flags, 12 resolved, mapping the Mission District since 2026." These numbers come from real contributions, not follower counts. They mean something.
- **Comment wall (see Item 6 — Shout-Outs):** people leave thank-you notes on your profile. Reverse-chronological. No likes on comments. Just text, from real people, about real things you did.

**What privacy constraints apply (Jordan's rules):**
- "About me" and tagline are user-authored text — AccessMap must never analyze this text for profiling, disability inference, or ad targeting.
- The profile must never infer or label a user's disability from their flag history, even when the pattern is obvious. Labels come only from explicit user disclosure.
- Privacy setting: Public (anyone) or Contributors-only (signed-in users only). No profile is indexed by search engines unless the user explicitly enables it (default: off).
- Profile photos (see Item 7): explicit consent for public display; face recognition is never run.

**Anti-spam / anti-abuse:**
- Tagline and "about me" are reportable (report button → admin review queue).
- No URLs in tagline or "about me" (prevents spam links; short text links are blocked automatically).
- Profile edits rate-limited: 3 edits per day.
- "About me" text length: 280 characters hard limit.

---

## 2. Neighborhood Crews

**What it is:**
Groups of contributors organized by geographic area. A "Mission District Accessibility Crew" has a public name, a bulletin board, a shared flag history for their territory, and a local leaderboard. Old-school forum energy. The kind of belonging that comes from caring about the same square miles as someone else.

**What makes it Nexopia/MySpace specifically:**
- **"Crew" framing:** not "groups," not "communities," not "channels." *Crews.* The word has the right texture — local, chosen, slightly informal, slightly proud. Nexopia groups had this energy. Facebook Groups do not. A crew has a territory. A crew has a purpose.
- **Bulletin board, not a feed:** posts are organized by date, never by engagement score. The most-liked post does not get pinned. The newest post is at the top. There is a bottom to scroll to. This is not a feed. This is a corkboard.
- **Crew wall:** anyone in the crew can post to the wall. No algorithmic curation. No boosted content. The last post is the last post.
- **Shared flag history:** the crew's page shows all flags filed in their area — not just by crew members. The neighborhood's accessibility history belongs to the crew's shared story, regardless of who filed what.
- **Leaderboard (local only):** top contributors *in this area only*, not global rank. A user with 5 flags in the Mission might be #1 on the Mission crew leaderboard even if they're #450 globally. Local recognition is real recognition.

**Structure:**
- A crew is defined by a geographic bounding box (drawn on a map when the crew is created) or a named neighborhood (geocoded).
- One primary crew per area (admin-enforced; overlapping crews may be merged with both leaders' consent).
- Crew membership is open — no invite required. Anyone can join any crew.
- Crew leader = the creator. Can transfer leadership. Can delete bulletin board posts (but not edit them).
- Crew creation requires Gold tier (500+ pts) — prevents spam crew creation by brand-new accounts.
- No cap on crew size. Leaderboard shows top 10 contributors for the area.

**Privacy constraints:**
- Crew membership is public — your username appears in the member list. Your approximate neighborhood is therefore inferable. Jordan must confirm this is acceptable; mitigation is that neighborhoods are broad geographic areas (not street-level) and membership is purely voluntary.
- Bulletin board posts are public and attributed to the poster's username.
- No real-time location tracking within the crew — being in a crew does not mean "this user is in this area right now." That's a separate feature (Item 4 — "Currently Mapping").

**Anti-spam / anti-abuse:**
- Bulletin board posts: 5 per day per user per crew.
- Posts are reportable. Crew leader can delete. Admin can delete and remove users from crews.
- No commercial promotion on bulletin boards (automated URL scan + admin review for suspected ads).
- Crew names: 60 characters max, no URLs.

---

## 3. Accessibility Stories / Posts

**What it is:**
Short-form posts from contributors about their real experiences. "I use a power chair and the flag I added on Valencia St last month is now resolved — I got an extra 20 minutes back in my commute this week." Not a feed. Not an algorithm. A community bulletin board in reverse-chronological order.

**What makes it Nexopia/MySpace specifically:**
- **It's a bulletin board, not a feed.** The word "feed" implies infinite scroll, algorithmic curation, and engagement optimization. A bulletin board is finite, human, and has a bottom. You scroll through it, you read what people wrote, and then it ends.
- **Reverse-chronological, always.** The newest post is at the top. No promoted posts. No "because you liked X." No "trending." If you want to find an old story, you scroll down. This is the internet that used to exist.
- **No likes.** No hearts. No thumbs up. No emoji reactions. No engagement metrics whatsoever. This is the single most important design decision in Phase 8. Without likes, there is no performance incentive. People write because they have something to say, not because they're chasing a number. The silence where the like button would be is intentional.
- **Opt-in disclosure with consent language:** the first time a user opens "Post a Story," the form includes a one-line note: *"Stories you share are visible to all AccessMap users. You are not required to share any personal health information."* Once, on first use. Not a modal every time.
- **Linked to real actions:** posts can optionally link to a specific flag ("This story is about the flag at 18th & Valencia") or a resolved barrier. The mission stays connected to the expression.

**Post format:**
- 500-character text limit. Long enough for a real anecdote. Short enough to stay human.
- One optional photo (camera or library; EXIF stripped per existing policy).
- Optional: link to a specific flag or resolved barrier.
- Optional: tag to a neighborhood (for filtering).
- No hashtags — they are an algorithmic affordance.
- No @-mentions — they are a harassment vector.

**Discovery:**
- One community board page. No personalization. Everyone sees the same page.
- Filter by neighborhood.
- Filter by barrier type.
- No "trending" section. No "popular stories." Chronological. Always.

**Privacy constraints:**
- Story text may constitute voluntary disability disclosure. The consent note (above) is shown once before first post.
- Story text is never analyzed by NLP, never used for profiling or targeting.
- Users can delete their own stories at any time. Stories from deleted accounts cascade-delete.
- Stories from blocked users do not appear to the person who blocked them.

**Anti-spam / anti-abuse:**
- Rate limit: 3 stories per day per user.
- Story creation requires Silver tier (100+ pts) — prevents brand-new accounts from flooding the board.
- Stories are reportable → admin review. Hate speech, harassment, spam = deletion + possible account action.
- No DMs are initiatable from stories. Reading a story does not expose the author's contact info.

---

## 4. "Currently Mapping" Status

**What it is:**
An opt-in status that shows when a contributor is actively out mapping. Others can see someone's mapping session and ask to join them. Spontaneous accessibility mapping meetups — the kind that happen when a small community organically finds each other.

**What makes it Nexopia/MySpace specifically:**
- **The online status dot.** The original presence indicator — not a live stream, not a "story" that demands attention. Just a small green dot on someone's profile: "Currently mapping." Nexopia had "Online now." MSN Messenger had the green dot. These were simple, warm signals. "I'm here right now." AccessMap's version is not "I'm on my phone" — it's "I'm out in the city doing the work."
- **Neighborhood-level only.** Not GPS. Not a street. Not a block. A neighborhood. "Currently mapping in the Mission District." The green dot on the crew page: "2 people are mapping near you right now." This is presence without surveillance.
- **"Mind if I join you?" message.** If someone is mapping in your area, you can send them a one-time join request. They can accept or ignore. If they accept: they share a suggested meeting point they choose themselves (e.g., "Meet at Dolores Park main entrance"). No GPS sharing. No live location. A static, human-chosen meeting point. The serendipity of finding someone who cares about the same streets you do.

**Mechanic:**
- Opt-in per session: before mapping, tap "Share my mapping status" → confirm neighborhood → status goes live.
- Status auto-expires: 30 minutes after last flag submission.
- Status never stores location history: when the session ends, it's gone. No log, no record.
- "Currently mapping" indicator on the crew page and the community board.

**Privacy constraints (strongest in Phase 8):**
This feature ships last, or not at all if Jordan flags it. Jordan must specifically approve:
- Neighborhood-level precision: acceptable only if resolution is ≥1km radius (neighborhood, not block or street).
- "Join me" meeting point: must be the user's own free-text choice, not a GPS coordinate extracted by the app.
- No session history stored: the currently-mapping state is ephemeral. Never logged. On expiry, it is gone from the database.
- Opt-in must be explicit per session — not a persistent setting that silently stays on.

**Anti-spam / anti-abuse:**
- "Join me" requests: one per user pair per 24 hours (prevents repeated requests becoming harassment).
- Users can block others from sending join requests.
- Status can be hidden from specific users.
- No public history of who mapped with whom.

---

## 5. Top 8 Contributors

**What it is:**
Direct Nexopia/MySpace homage. Your community profile displays your top 8 local contributors — people you've chosen to highlight, shown as a grid of 8 profile cards with username, tier badge, and one-line tagline.

**What makes it Nexopia/MySpace specifically:**
This is *the* MySpace feature. The Top 8 (later Top 24) was MySpace's defining social mechanic. It was human-curated, emotionally resonant, and completely non-algorithmic. You chose your top 8. If someone didn't make your top 8, they noticed. It created genuine social dynamics — recognition, friendship, mild drama — in a way that no engagement metric has replicated since.

AccessMap's version: your top 8 are the contributors you most admire in your area. The person who's verified 200 flags in your neighborhood. The person whose accessibility story moved you. The person who's been mapping your streets longer than anyone. Not your real-life friends necessarily — your *mapping community*.

- **100% user-controlled.** You choose your top 8. You arrange them. No algorithm involved. The arrangement is yours.
- **Small grid, big feeling.** 8 profile cards showing username, tier badge, and tagline. Compact, but the act of curating it is meaningful.
- **Top Mappers, not "Top Friends."** The name is specific to the AccessMap context. "These are the 8 people I think are doing the best accessibility work in my area."

**How it interacts with the rest of Phase 8:**
- Displayed on your community profile (Item 1).
- Shout-outs (Item 6) are the social gesture that might earn you a spot on someone's Top 8.
- Milestone celebrations (Item 8) automatically notify your Top 8 when you hit Diamond.

**Privacy constraints:**
- Top 8 is public by default (your choices visible to anyone viewing your profile).
- User can set Top 8 to private (signed-in users only, or self-only).
- Being added to someone's Top 8 triggers a notification: "You were added to [username]'s Top Mappers."
- Being *removed* does not trigger a notification. (This was a painful lesson from the MySpace breakup-via-top-8-removal era. We do not recreate that experience.)

**Anti-spam / anti-abuse:**
- You can add any Silver+ contributor to your Top 8 (no interaction requirement — the community is small enough that "must have interacted" would be too restrictive initially).
- If a user blocks you, you can't add them.
- Top 8 edits are rate-limited: 5 changes per day.

---

## 6. Accessibility Shout-Outs

**What it is:**
Thank another contributor publicly. "Thank you @skyler for verifying the ramp on Valencia St last week — it made my whole commute better." Simple, warm, human, attached to a real action.

**What makes it Nexopia/MySpace specifically:**
Comment walls. The original social network comment wall was exactly this: not a DM, not a private message, but a public gesture of recognition. "I see you and I appreciate what you did." Nexopia walls were this. MySpace's "leave a comment" was this. It was performative in the *good* sense — public acknowledgment, not private flattery. Shout-outs accumulate on your profile as a visible record of community appreciation. Not a score. A record.

**Mechanic:**
- From any contributor's profile → "Leave a Shout-Out" button.
- 200-character text field.
- Optional: link to a specific flag or route ("Thank you for verifying the flag at 18th & Valencia").
- Shout-out appears on the recipient's profile wall (reverse-chronological).
- Recipient gets a push notification (Tier 1 — personal, high relevance).
- Shout-outs are public (visible to anyone viewing the profile).
- Shout-out count visible on the profile as a warm metric (not a gamified score, just a human tally: "47 thank-yous received").

**Privacy constraints:**
- Shout-out text is user-authored and public. Standard content moderation applies (reportable, admin-deletable).
- A shout-out linking to a flag does not expose the flag reporter's identity if that flag was filed anonymously.
- Shout-out count is visible — this is acceptable as a metric of community appreciation, not algorithmic status.

**Anti-spam / anti-abuse:**
- 10 shout-outs per day per user (generous but capped).
- One shout-out per user pair per 24 hours (prevents shout-out spam at a single person).
- Shout-outs from blocked users don't appear.
- Basic content filter on shout-out text (hate speech, slurs → auto-hold for admin review before display).

---

## 7. Profile Customization

**What it is:**
Choose a banner color, add a profile photo, write an "about me" section. Not full custom HTML — that way lies chaos — but enough personality to make a profile feel like a person decorated it, not a database row.

**What makes it Nexopia/MySpace specifically:**
Nexopia was all about this. Colored backgrounds, chosen layouts, personal decoration. We're not going that far — no custom CSS, no background music — but we're not going "LinkedIn profile" either. A profile should feel like someone lives there.

- **Color palette (12 options):** named for real-world accessibility concepts (see Item 1 list). The names themselves are part of the expression. Choosing "Wayfinder Blue" vs. "Civic Gold" is a small act of identity.
- **Profile photo:** displayed as a circle, max 500KB, EXIF stripped. Defaults to an auto-generated avatar (identicon-style, unique per user) if no photo is uploaded. The identicon ensures no profile is blank — everyone has a visual presence.
- **"About me" (280 characters):** free text. No prompts like "Tell us about your disability" — ever. Whatever you want to write.
- **"Mapper since" date:** auto-populated. Cannot be edited. This is real seniority, earned by being here early.
- **Custom tagline (80 characters):** shown everywhere your profile appears — crew leaderboard, top 8, shout-outs, flag detail cards. It follows you.

**What we are NOT building in Phase 8:**
- Custom CSS or HTML — opens the door to accessibility violations, XSS risks, and chaos.
- Background music — no.
- Animated GIFs in profiles — accessibility nightmare (WCAG 2.2 2.2.2 — Pause, Stop, Hide).
- Profile themes that override the system dark mode — the user's OS preference is a real accessibility need; we don't override it.

**Privacy constraints:**
- Profile photos are public if the profile is public. Privacy policy must explicitly cover photo data.
- Face detection / image analysis is never run on profile photos.
- Photos are deletable at any time (right to erasure).

**Anti-spam / anti-abuse:**
- Photos, "about me," and taglines are all reportable.
- Profile edits rate-limited: 3 per day.
- No URLs in "about me" or taglines.

---

## 8. Milestone Celebrations

**What it is:**
When you hit Diamond tier — or another meaningful milestone — the community gets a moment to acknowledge it. Confetti animation on your profile for 24 hours. Your Top 8 get notified. You can optionally post "I just hit Diamond" to the community board with one tap. Old-school birthday wall energy, but for "you've mapped 1500 points worth of barriers and the community is better for it."

**What makes it Nexopia/MySpace specifically:**
The birthday wall. On Nexopia and MySpace, when it was your birthday, everyone saw a notification and wrote on your wall. It was unsophisticated, slightly chaotic, and completely heartwarming. For one day, the community converged on you. Milestone celebrations are the AccessMap version of this: not because you turned a year older, but because you've done something real.

- **Confetti animation on the profile:** CSS-only, respects `prefers-reduced-motion` (WCAG 2.3.3 requirement — this is non-negotiable). When someone visits your profile in the 24 hours after a milestone, there's confetti on the page. They're seeing you at your moment.
- **Top 8 notification:** the 8 contributors you've chosen as your top mappers get a notification: "[username] just reached Diamond! Leave them a shout-out." This is the mechanic that makes the Top 8 feel like a real social relationship, not a display widget.
- **Optional community board post:** when you hit a milestone, you can post "I just hit Diamond! 🎉" to the community board with one tap. Opt-in. Never automatic. Never on your behalf without your confirmation.

**Milestones worth celebrating:**
- First flag submitted (your first one matters — everyone starts somewhere)
- Silver tier (100 pts) — you're now a trusted voice
- Gold tier (500 pts) — you're established
- Diamond tier (1500 pts) — the big one; this is the community's recognition of sustained excellence
- First verified flag (the community believed your report)
- First resolved barrier (something was actually fixed because you reported it)
- 30-day mapping streak
- 1 year as an AccessMap member

**Privacy constraints:**
- Milestone notifications to Top 8 are opt-out (user can disable milestone announcements in settings).
- The community board post is always opt-in.
- Milestone data is never used for behavioral profiling or advertising.

**Anti-spam / anti-abuse:**
- Milestones are server-verified (triggered by DB state, not client request — cannot be faked).
- Confetti animation is CSS-only and respects `prefers-reduced-motion`.
- Each milestone notification fires once, never repeated.

---

## 9. What Would Make AccessMap the Most Beloved Accessibility Community on the Internet

**The thesis:**

AccessMap will be the most beloved accessibility community on the internet if it makes contributors feel like what they're doing is **permanent, witnessed, and meaningful** — not just data entry into a database.

Every other major accessibility tool treats accessibility information as data. Directories are static. Wiki editors are impersonal. City tools are bureaucratic. They are useful, but they are cold. AccessMap has something none of them have: a community of people who care, contributing not because they're paid or required to, but because they live this experience every day and they want to change it for others.

The social layer is what makes that community visible to itself.

---

## 10. The One Feature

*The one Phase 8 feature that would make someone tell their friends "you have to see this app."*

**Accessibility Stories + Shout-Out wall on the community profile.**

Specifically: imagine you file a flag about a broken ramp. Three weeks later, it's resolved — someone with authority actually fixed it. A week after that, another user saves an accessible route that passes through that spot. Same week, someone posts an accessibility story to the community board: "I couldn't take my usual route for two months because of a broken ramp on Valencia. Last week it was finally fixed. I don't know who reported it, but it changed my whole week."

They don't know it was you who filed that flag. But you do.

And next to that story, on your profile, someone has left a shout-out: "You're my top mapper in the Mission this month. Thank you for what you do in our neighborhood."

That experience — of knowing your specific action changed a specific person's day, and being recognized for it by name by someone who knows you — is not available anywhere else. No app offers that. Not Google Maps. Not Yelp. Not any city government portal.

It's not scale. It's not virality. It's not an engagement metric. It's a human being saying "what you did mattered, and I saw it."

Build that, and people will tell their friends. Not because it's impressive, but because it made them feel like their work matters.

---

## 11. Phase 8 Feature Priority Matrix

| Feature | Warmth:effort ratio | Privacy risk | Jordan gate | Build first? |
|---|---|---|---|---|
| Community profiles | ★★★★★ | Medium | YES | Yes — the foundation everything else sits on |
| Accessibility shout-outs | ★★★★★ | Low | No | Yes — highest warmth per line of code |
| Milestone celebrations | ★★★★☆ | Low | No | Yes — huge morale moment, relatively small build |
| Profile customization | ★★★★☆ | Low | YES (photos) | Yes — makes profiles feel inhabited |
| Accessibility stories | ★★★★☆ | Medium | YES | After profiles land |
| Top 8 contributors | ★★★★☆ | Low | No | After profiles land |
| Neighborhood crews | ★★★☆☆ | Medium | YES | After stories land |
| "Currently mapping" status | ★★★☆☆ | **HIGH** | **HARD GATE** | Last — or skip if Jordan flags it |

---

## 12. What We Must Never Build in Phase 8

These are the features that would make AccessMap feel like Instagram. They are not just bad for the brand — they are corrosive to the mission.

- ❌ **Follower counts as a visible metric.** Contributions matter; popularity does not.
- ❌ **Algorithmic feed curation.** If you curate what people see, you own what they care about. We don't want that responsibility.
- ❌ **"Trending" content sections.** What's trending is whatever the algorithm decides to promote. That's not community.
- ❌ **Like counts on posts.** A like button on an accessibility story is an invitation to perform disability for engagement. We will not build that.
- ❌ **"Suggested contributors" based on behavioral inference.** This is the entry point to the engagement trap.
- ❌ **Ephemeral content that auto-expires.** Accessibility stories are not Snapchat stories. They matter. They stay.
- ❌ **FOMO notification loops.** "You haven't visited in 3 days" is a dark pattern. Our users are people with disabilities, often managing fatigue, pain, and accessibility barriers in their daily lives. We will not guilt them into opening the app.
- ❌ **Any metric that optimizes for time-on-app rather than real-world impact.** DAU matters only insofar as it reflects genuine community activity. Engagement for its own sake is not the goal.

---

## 13. Phase 8 Depends On Phase 7

The social layer works best when contributors have something real to show on their profiles. That means:

- **Trust Score Gating (P7-Item-3)** must be live — the Diamond badge is meaningless without Diamond capabilities.
- **Area Analytics (P7-Item-4)** must be live — community profiles are more meaningful when they show real impact numbers ("12 resolved barriers, 47 flags, 6 years mapping the Mission").
- **Route Scoring (P7-Item-1)** ideally live — the social layer becomes richer when profiles can show "your flags appear on 3 saved community routes."

Don't start Phase 8 until at least trust gating and area analytics are stable in production.

---

*Filed by Morgan (PM). This is a brainstorm, not a plan. All items are speculative until Sky decides what to build and in what order. The Jordan conversation on community profiles and accessibility stories should start in parallel with Phase 7 — those are the anchor features and they need the most lead time for privacy design. Start that conversation now, even if Phase 8 builds are months away.*
