# Judge P2 — TASTE lens · AccessMap Fable Audit Part 3

**judgeId:** P2-taste · **panel:** P2 · **role:** taste
**Subject:** the 20-proposal reconciled slate (`partials/slate-proposals.v2.md`) @ `main 82e738b`.
**Read-only.** No repo code touched; this file is the only write.

## Lens I judged with

I am Sky's **Deep-Field taste guardian**. The ethos is *material depth as hero used with RESTRAINT and breathing room, editorial typography, ALWAYS legible, WCAG AA as a floor not a target.* The enemy is clutter / occlusion / anything that costs legibility or reachability. **Distinctiveness must come FROM the ethos, never by abandoning it.** So on the three axes:

- **impact** — does it make a real disabled user's core FIND/CONTRIBUTE job *possible* (highest for the six CRITICALs that unblock a dead flow and the SR/native dead-ends), tapering to copy papercuts.
- **cohesion** — trust + one-material read vs GLASS.md. Highest for the signature moves that make the app read as ONE product (unify chrome/tiles/severity-grammar); lowest for correct-but-invisible internals (a timeout race, a falsy-zero fix) that a user never *sees* as cohesion even when they should ship.
- **ethos** — fidelity to Deep-Field + restraint + access-first distinctiveness. I reward hardest the moves that **extend the app's own ratified law or adopt an asset it already built** (severity grammar, `textOnColor` token, the hidden FlagDetailModal, mounting the a11y engine). I reward least the moves that are *necessary correctness but live outside where the ethos is expressed* — right to do, not a taste statement.

I deliberately spread. Not everything is a 4-5. A slate where every row is "great" tells Sky nothing about sequencing.

## The taste spine of this slate (what I weighted up)

The audit's own verdict — echoed by all six blinded readers — is that **AccessMap's signature is not the glass, it is the severity grammar** (numbered disc + plain word + one-line stake). That makes **S1** the single most on-ethos proposal here: it takes the crown jewel and finishes it everywhere severity is spoken. **S2** is its inseparable floor-partner (the ink under the word). **S3** is the deepest *taste* move on the trust axis — it stops hiding an asset the app already built (FlagDetailModal) and surfaces the receipt where trust is spent; that is a civic gesture no competitor makes, distinctiveness straight from the ethos. **S8** and **S7** are the two halves of the "one product" repair R5 named — chrome family and flagship tiles — the strongest cohesion pair. **S9** mounts the app's best-engineered subsystem on the only surface guests have; it is a mission-and-ethos alignment, not polish.

## What I weighted down (honest, with spread)

- **S20 / S15** are trust-fallback and first-run **copy**. Load-bearing for honesty, genuinely good, but they carry near-zero material/cohesion signature and their disabled-user *impact* is real-but-diffuse (misdirection, whiplash) rather than an unblocked flow. Low impact, mid ethos (they extend the privacy-forward voice).
- **S12 / S11** are correctness I fully endorse (WCAG 2.3.3 falsy-zero; danger-path timeout). But as *taste* they are invisible plumbing — cohesion is "the data/camera layer behaves like the one the app already chose," which a user feels only as absence-of-betrayal. High-integrity, mid on my axes precisely because the ethos does not *live* there.
- **S19 / S17 / S16 / S13 / S14** are each a clean, correct hardening of one surface. Right, in-ethos (all extend an existing pattern eight lines away), but none is a signature or a flow-unblock, so they cluster in the middle rather than the top.

## Scorecard (integers 1-5, 5 = best)

| ID | impact | cohesion | ethos | note |
|----|:--:|:--:|:--:|------|
| **S1** | 5 | 5 | 5 | The signature finished; crown-jewel severity grammar spoken everywhere. Peak ethos. |
| **S2** | 4 | 4 | 5 | Ratified `textOnColor` ink; extends the app's own AA law, no new token. |
| **S3** | 5 | 5 | 5 | Surfaces a built-and-hidden asset where trust is spent; civic, most in-ethos move. |
| **S4** | 5 | 4 | 4 | Kills the "N nearby" lie + denied banner; the map stops lying on arrival. |
| **S5** | 5 | 3 | 3 | Unblocks the #1 CRITICAL (guest can finally report); a bug fix, not a moment. |
| **S6** | 5 | 4 | 4 | Real 44pt one-thumb zoom in app chrome; "built not embedded" on the namesake. |
| **S7** | 4 | 5 | 5 | Themes the flagship tiles + tames chrome; Deep Field reaches the last surface. |
| **S8** | 3 | 5 | 5 | One editorial header family; closes the "two kits" seam on every tab switch. |
| **S9** | 5 | 4 | 5 | Mounts the a11y engine on web; best subsystem made true where guests live. |
| **S10** | 3 | 4 | 4 | Visible+live submit confirmation; reuses the FlashBanner idiom, honest close. |
| **S11** | 4 | 3 | 3 | Danger-path timeout; right correctness, but invisible plumbing as taste. |
| **S12** | 4 | 3 | 3 | RM camera parity (falsy-zero); a hard-floor fix living outside the ethos. |
| **S13** | 4 | 3 | 4 | Frees Tasks card actions for VoiceOver; the trust engine stops being sighted-only. |
| **S14** | 3 | 4 | 4 | Pin hairline union; completes GLASS §12.4 across every map element. |
| **S15** | 2 | 3 | 3 | First-run copy honesty; diffuse impact, no material signature. |
| **S16** | 3 | 3 | 3 | Two worst map targets; correct 44pt hygiene, mid on every axis. |
| **S17** | 3 | 3 | 4 | Contains the Home peek; removes app-exit-from-a-button, tidy and in-ethos. |
| **S18** | 4 | 4 | 4 | "Submit report" label + 200% reflow; a copy cut that also sharpens the button. |
| **S19** | 2 | 3 | 4 | Location "Not now"; values-load-bearing consent, extends the app's own pattern. |
| **S20** | 2 | 3 | 3 | Trust-fallback copy (Help/changelog/About/casing); honest but low signature. |

## Per-proposal rationale (taste notes)

- **S1 (5/5/5):** The audit says the signature IS the severity grammar; this is the one proposal that treats it as such and finishes it. Number+word everywhere, "Verified" defined on the legend where every other word is defined, the anon ring restoring a color channel the gray swap erased. Nothing else on the slate is this close to Sky's stated taste anchor. Zero clutter added — the word is *added* to a disc that already carries the number.
- **S2 (4/4/5):** Ethos-max because it extends the app's *own ratified fork* (`92a2be6`) rather than inventing anything; the arbiter already proved the ink. Impact/cohesion a notch below S1 only because it is the ink half — invisible until the word rides on top.
- **S3 (5/5/5):** The cruelest finding (the app built a full trust ledger and hid it three taps deep) answered by *owning what it shipped* — the most in-ethos gesture in the DESIGN.md worldview. Turns the accessible list's dead-end into a doorway. Peak on all three.
- **S4 (5/4/4):** A map that maps *disability* must never lie about coverage; this ends R1's #1 stranding state. The reconciliation (denied-only banner, never a fresh first-run lie) is exactly the restraint the ethos demands — it refuses to trade one dishonesty for another. Cohesion/ethos strong but it is copy+state, not material.
- **S5 (5/3/3):** Impact is maximal — the #1 CRITICAL, the whole CONTRIBUTE half dead for guests — but as *taste* it is a one-line parity fix. It makes the app *work*, not *sing*; I score it honestly on my axes rather than inflating cohesion/ethos to match its importance.
- **S6 (5/4/4):** Zoom locked out at every device size is the device-integrity nadir. The reconciled opaque `ctaFill` buttons in the reachable bottom zone are a genuine "this map was built" moment. Ethos held by the mandatory arbiter re-run (no eye-tuning) and box-none respect.
- **S7 (4/5/5):** The strongest *cohesion/ethos* pairing with S8 — the Deep Field system finally carried onto the one surface that escaped it. Impact a notch below the flow-unblocks (it is legibility + first-impression, not a locked door), but for R3 the light-mode tile theme is what makes the map legible *at all*.
- **S8 (3/5/5):** Cohesion-max: the "two kits stitched together" seam is the strongest single incoherence signal R5 named, crossed on every tab switch. Impact modest (SR double-header removal + orientation), which is why it is a 3 there — but as a one-material read it is peak, and the reconciliation writing the box-none invariant into the FullMap header is precisely the restraint that keeps a signature from breaking the map.
- **S9 (5/4/5):** Ethos-max: the best-engineered subsystem is one bundler-dialect gap from working where guests live; mounting it is a mission alignment. Impact 5 (R2's CONTRIBUTE goes from "submitting blind" to confirmable). Cohesion 4 — web/native a11y converge, but the win is felt as function more than as a visible one-material read.
- **S10 (3/4/4):** The emotional close of "I helped." In-ethos (reuses the FlashBanner idiom, on the persistent-mount mechanism the severity echo line already proves). Impact mid — it confirms rather than unblocks; strong supporting act to S5.
- **S11 (4/3/3):** Fully endorse the correctness — the read/write split is exactly right (never manufacture a duplicate flag). But as *taste* it is the data layer inheriting the GPS layer's honesty posture: invisible plumbing. Cohesion/ethos mid because the ethos is not expressed here, only respected.
- **S12 (4/3/3):** A confirmed WCAG 2.3.3 failure inflicting the app's biggest motion on the users who asked for less — must ship. But it is a two-character trap fix; the taste axes stay mid because it lives outside where the Deep-Field ethos is authored.
- **S13 (3/4/4):** The audit's #1 device check. Ethos 4 (a structural a11y-tree fix that touches only grouping, respecting the card's visual layout entirely). Impact 3 only because it is native-VoiceOver-gated and the Nearby twin partially mitigates on the FIND side.
- **S14 (3/4/4):** Completes GLASS §12.4's union law across every color-bearing map element — cohesion/ethos reward for finishing an arbitrated pattern. Impact 3: twin-mitigated (list carries severity non-visually), which is why the audit itself rated it HIGH not CRITICAL.
- **S15 (2/3/3):** Good first-run honesty, but the impact is diffuse (noun whiplash, black-box submit) rather than an unblocked flow, and it carries no material signature. Ethos 3 for staying in the privacy-forward voice and correcting the funnel *toward* the untouched exemplar.
- **S16 (3/3/3):** Correct 44pt hygiene on the two worst targets; the "Clear" fix even joins a sibling's already-correct pattern. Honestly middling on every axis — necessary hardening, not a signature.
- **S17 (3/3/4):** Ethos 4 because removing an entire class of the most disorienting failure (app-exit from inside a button) with a few `pointerEvents` lines is exactly the restraint-first instinct. Impact/cohesion mid — it is one contained surface.
- **S18 (4/4/4):** A rare copy change that *also* sharpens the button ("Submit report" verb-forward) AND turns a pre-existing Label-in-Name miss into a PASS. The reconciliation aligning the accessible name is the tasteful detail. Solid across the board; the header leg's honest S8 dependency keeps it from over-claiming.
- **S19 (2/3/4):** Ethos 4 — the most values-load-bearing consent moment gaining a decline by extending the app's *own* "Maybe later" pattern eight lines away. Impact 2: the behavior is already benign (denial never blocks); this makes the benign truth *visible*, which matters for dignity more than for task completion.
- **S20 (2/3/3):** Repairs the surfaces consulted when trust is already strained. The right thing (a stale changelog reads as abandonment; the FAQ misdirects to a non-existent "Map tab"), but lowest disabled-user impact and no material/cohesion signature — pure copy/link accuracy.

## Taste guardian's closing read

The slate is disciplined: **zero proposals buy distinctiveness by abandoning the ethos**, every color/floor move names an arbiter re-run and adopts an existing token, `GlassSurface.tsx` is never forked, and the box-none/virtualization laws survive. That is the ethos honored at the process level, which I value.

If I were sequencing on *taste* alone, the spine is **S1 + S2 + S3** (finish the signature, surface the receipt), then **S7 + S8** (make it one product), then **S9** (make the promise true where guests live). Those six are where Sky's Deep-Field identity is either completed or extended. The CRITualical flow-unblocks (**S5, S6, S18, S4**) must ship for the app to *function*, and I scored their impact accordingly — but they are correctness, not identity, and I kept my cohesion/ethos numbers honest about that rather than letting importance inflate the taste read. The copy and plumbing tail (**S15, S19, S20, S11, S12**) is all worth doing and none of it is where the ethos is authored.
