/**
 * Submit-time content filter — Apple Guideline 1.2(a).
 *
 * Spec: `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §2, ratified by
 * Sky 2026-07-27. Decision D-2 (DECISIONS §SKY-5): **CURATED, not raw.**
 *
 * ─── WHAT THIS LIST IS, HONESTLY ──────────────────────────────────────────
 * §2 names LDNOOBW as the seed. This file is **NOT a verbatim vendoring of
 * that list** — no network fetch happened in the run that wrote it, and a
 * header claiming otherwise would be a lie in exactly the place someone would
 * later trust it. What this is: a curated seed covering the four classes §2
 * actually names — slurs and hate terms, explicit sexual terms, harassment
 * language — written to be correct-but-small rather than large-but-unreviewed.
 *
 * ⚠ SKY / JORDAN REVIEW WANTED before this is called complete. Two options,
 *   both fine, neither urgent enough to block the leg:
 *     (a) vendor the real LDNOOBW English file and re-apply the D-2 curation
 *         rule to it, replacing SEED below;
 *     (b) keep this seed and extend it in ADDITIONS as real reports come in.
 *   Either way the matcher, the call sites and the tests do not change.
 *
 * ─── THE CURATION RULE (D-2) ──────────────────────────────────────────────
 * KEPT: slurs targeting protected characteristics · explicit sexual terms ·
 *       harassment and self-harm-encouragement phrases.
 * DROPPED: ordinary profanity. Sky's reasoning, recorded because it is the
 *       whole point of this app — "the damn ramp is still broken" is a real
 *       barrier report from a frustrated disabled user, and silently rejecting
 *       it teaches that person their report is unwelcome. A filter that fires
 *       on frustration is worse than no filter here.
 * See DROPPED_MILD_PROFANITY at the bottom: the dropped class is kept visible
 * so the decision stays reversible and auditable rather than vanishing.
 *
 * ─── LIMITS, STATED PLAINLY ───────────────────────────────────────────────
 * This is a CLIENT-SIDE check that runs before insert. It is bypassable by
 * anything that is not this app — a direct PostgREST call sails past it. That
 * is acceptable for 1.2(a), which asks for a filter on the posting path, and
 * it is paired with the reactive report → review → takedown half. **Do not
 * describe this anywhere as making the platform safe.** A server-side mirror
 * (a Postgres CHECK or a trigger) would be the real fence; if that is ever
 * wanted it is a MIGRATION FILE proposal for Sky to apply, never an agent
 * change.
 *
 * Word-boundary matching kills the classic Scunthorpe substring bug. It does
 * not stop deliberate evasion — l33tspeak, homoglyphs, spaced-out letters.
 * That is a knowing trade: aggressive normalisation buys a little evasion
 * resistance at the cost of many more false positives, and in an accessibility
 * reporting tool the false positive is the more expensive error.
 */

/**
 * Submit-time content filter — Apple Guideline 1.2(a).
 *
 * Spec: `design-reviews/ship-ready/14_MODERATION_TEXTS_v1.md` §2, ratified by
 * Sky 2026-07-27. Decision D-2 (DECISIONS §SKY-5): **CURATED, not raw.**
 * Vendored per §SKY-6 (2026-07-28).
 *
 * ─── PROVENANCE ───────────────────────────────────────────────────────────
 * SOURCE:   https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
 * FILE:     `en` (the English list)
 * LICENSE:  CC BY 4.0 (Creative Commons Attribution 4.0 International)
 * RETRIEVED: 2026-07-28
 * SHA-256:  af851ecef1d5f212caba17339b12ac39cc2fef7d78c74876f67237644fcee8bd
 * RAW ENTRIES: 403
 *
 * ⚑ THE PREVIOUS VERSION OF THIS HEADER SAID NO NETWORK FETCH HAD HAPPENED AND
 * THAT THIS WAS NOT A VENDORING. That was true when written, and it was a fence:
 * it stopped the file claiming an authority it did not have. Sky discharged it in
 * §SKY-6 by authorising the fetch. The fence is therefore CONVERTED — replaced by
 * the provenance block above, which can be checked — not deleted. The checksum is
 * there so a future reader can verify this file against upstream rather than
 * trusting this paragraph.
 *
 * ─── WHAT THIS FILE IS, EXACTLY ───────────────────────────────────────────
 * THREE TIERS, and the split is forced by evidence, not taste:
 *
 *   1. LDNOOBW_CURATED  — the vendored 403 with the D-2 rule applied.
 *   2. CURATED_EXTRA    — 15 terms LDNOOBW DOES NOT CONTAIN AT ALL.
 *   3. ADDITIONS        — Sky's, empty, live-read.
 *
 * ⚠ TIER 2 IS NOT OPTIONAL, AND THE REASON MATTERS MORE THAN THE MECHANISM.
 * **LDNOOBW contains no disability slurs whatsoever** — not `retard`, `retarded`,
 * `cripple`, or `mongoloid` — and **no self-harm or harassment phrases** — not
 * `kill yourself`, `kys`, `go die`, or `neck yourself`. It is overwhelmingly a
 * list of sexual terms. Replacing the old curated seed wholesale, which is what
 * "vendor the real list" sounds like it means, would have deleted the single
 * class most likely to be aimed at this app's users and turned two MUST-FAIL
 * tests red. Verified by set difference against upstream, not assumed.
 *
 * ─── THE CURATION RULE (D-2) ──────────────────────────────────────────────
 * KEPT: slurs targeting protected characteristics · explicit sexual terms ·
 *       harassment and self-harm-encouragement phrases.
 * DROPPED: ordinary profanity. Sky's reasoning, recorded because it is the
 *       whole point of this app — "the damn ramp is still broken" is a real
 *       barrier report from a frustrated disabled user, and silently rejecting
 *       it teaches that person their report is unwelcome. A filter that fires
 *       on frustration is worse than no filter here.
 *
 * ALSO DROPPED, and this class is new to the vendoring: words that are NEUTRAL
 * VOCABULARY IN THIS APP'S DOMAIN. The raw list is written for general-purpose
 * content moderation, where `sex`, `escort` and `rectum` are safe to block. Here
 * they are not. "The single-sex accessible washroom is locked", "staff would not
 * escort me to the lift", and a report about a Changing Places toilet mentioning
 * catheter or stoma care are all genuine barrier reports, and every one of them
 * would have been rejected. `grope` went the same way: "I had to grope along the
 * wall to find the door" is how a blind user describes a barrier, and blocking
 * that is the exact failure D-2 exists to prevent. See DROPPED_AS_NEUTRAL below.
 *
 * ─── COUNTS ───────────────────────────────────────────────────────────────
 *   403 raw
 *   −31 ordinary profanity (D-2)
 *   −16 neutral in this domain
 *    −2 shorter than 3 characters (`xx`, and a bare emoji the word-boundary
 *       matcher could never have matched anyway)
 *   = 354 vendored + 15 curated extra = 369 terms live.
 *
 * ─── WHAT THIS FILTER CANNOT DO ───────────────────────────────────────────
 * It is CLIENT-SIDE and therefore bypassable by anything that is not this app;
 * a server-side mirror is the real fence and is a migration proposal for Sky,
 * never an agent change. Word-boundary matching does not see through l33tspeak,
 * homoglyphs, or deliberate misspelling — defeating those costs false positives
 * on ordinary words, which is the wrong trade for a barrier-reporting app.
 * Leg 1.2(a) is scored 🟠 for these reasons, not 🟢.
 */
const LDNOOBW_CURATED: readonly string[] = [
  '2 girls 1 cup', '2g1c', 'acrotomophilia', 'alabama hot pocket', 'alaskan pipeline', 'anal',
  'anilingus', 'auto erotic', 'autoerotic', 'babeland', 'baby batter', 'baby juice', 'ball gag',
  'ball gravy', 'ball kicking', 'ball licking', 'ball sack', 'ball sucking', 'bangbros',
  'bangbus', 'bareback', 'barely legal', 'barenaked', 'bastinado', 'bbw', 'bdsm', 'beaner',
  'beaners', 'beastiality', 'beaver cleaver', 'beaver lips', 'bestiality', 'big black',
  'big breasts', 'big knockers', 'big tits', 'bimbos', 'birdlock', 'black cock', 'blonde action',
  'blonde on blonde action', 'blow job', 'blow your load', 'blowjob', 'blue waffle', 'blumpkin',
  'bondage', 'boner', 'boob', 'boobs', 'booty call', 'brown showers', 'brunette action',
  'bukkake', 'bulldyke', 'bullet vibe', 'bung hole', 'bunghole', 'busty', 'buttcheeks',
  'butthole', 'camel toe', 'camgirl', 'camslut', 'camwhore', 'carpet muncher', 'carpetmuncher',
  'chocolate rosebuds', 'cialis', 'circlejerk', 'cleveland steamer', 'clit', 'clitoris',
  'clover clamps', 'cock', 'cocks', 'coon', 'coons', 'coprolagnia', 'coprophilia', 'cornhole',
  'creampie', 'cum', 'cumming', 'cumshot', 'cumshots', 'cunnilingus', 'cunt', 'darkie',
  'date rape', 'daterape', 'deep throat', 'deepthroat', 'dendrophilia', 'dildo', 'dingleberries',
  'dingleberry', 'dirty pillows', 'dirty sanchez', 'dog style', 'doggie style', 'doggiestyle',
  'doggy style', 'doggystyle', 'dolcett', 'domination', 'dominatrix', 'dommes', 'donkey punch',
  'double dong', 'double penetration', 'dp action', 'dry hump', 'dvda', 'ecchi', 'ejaculation',
  'erotic', 'erotism', 'eunuch', 'fag', 'faggot', 'fecal', 'felch', 'fellatio', 'feltch',
  'female squirting', 'femdom', 'figging', 'fingerbang', 'fingering', 'fisting', 'foot fetish',
  'footjob', 'frotting', 'fudge packer', 'fudgepacker', 'futanari', 'g-spot', 'gang bang',
  'gangbang', 'gay sex', 'genitals', 'giant cock', 'girl on', 'girl on top', 'girls gone wild',
  'goatcx', 'goatse', 'gokkun', 'golden shower', 'goo girl', 'goodpoop', 'goregasm', 'group sex',
  'guro', 'hand job', 'handjob', 'hard core', 'hardcore', 'hentai', 'homoerotic', 'honkey',
  'hooker', 'horny', 'hot carl', 'hot chick', 'how to kill', 'how to murder', 'huge fat',
  'humping', 'incest', 'intercourse', 'jack off', 'jail bait', 'jailbait', 'jelly donut',
  'jerk off', 'jigaboo', 'jiggaboo', 'jiggerboo', 'jizz', 'juggs', 'kike', 'kinbaku', 'kinkster',
  'kinky', 'leather restraint', 'leather straight jacket', 'lemon party', 'livesex', 'lolita',
  'lovemaking', 'make me come', 'male squirting', 'masturbate', 'masturbating', 'masturbation',
  'menage a trois', 'milf', 'missionary position', 'mong', 'mound of venus', 'mr hands',
  'muff diver', 'muffdiving', 'nambla', 'nawashi', 'negro', 'neonazi', 'nig nog', 'nigga',
  'nigger', 'nimphomania', 'nipples', 'nsfw', 'nsfw images', 'nude', 'nudity', 'nutten',
  'nympho', 'nymphomania', 'octopussy', 'omorashi', 'one cup two girls', 'one guy one jar',
  'orgasm', 'orgy', 'paedophile', 'paki', 'panties', 'panty', 'pedobear', 'pedophile', 'pegging',
  'phone sex', 'pikey', 'playboy', 'pleasure chest', 'pole smoker', 'ponyplay', 'poof', 'poon',
  'poontang', 'poop chute', 'poopchute', 'porn', 'porno', 'pornography',
  'prince albert piercing', 'pthc', 'punany', 'pussy', 'queaf', 'queef', 'quim', 'raghead',
  'raging boner', 'rape', 'raping', 'rapist', 'reverse cowgirl', 'rimjob', 'rimming',
  'rosy palm', 'rosy palm and her 5 sisters', 'rusty trombone', 's&m', 'sadism', 'santorum',
  'scat', 'schlong', 'scissoring', 'sexcam', 'sexo', 'sexuality', 'sexually', 'sexy',
  'shaved beaver', 'shaved pussy', 'shemale', 'shibari', 'shota', 'shrimping', 'skeet',
  'slanteye', 'slut', 'smut', 'snowballing', 'sodomize', 'sodomy', 'spastic', 'spic', 'splooge',
  'splooge moose', 'spooge', 'spread legs', 'spunk', 'strap on', 'strapon', 'strappado',
  'strip club', 'style doggy', 'suicide girls', 'sultry women', 'swastika', 'swinger',
  'tainted love', 'taste my', 'tea bagging', 'threesome', 'throating', 'thumbzilla', 'tied up',
  'tight white', 'tit', 'tits', 'titties', 'titty', 'tongue in a', 'topless', 'tosser',
  'towelhead', 'tranny', 'tribadism', 'tub girl', 'tubgirl', 'tushy', 'twink', 'twinkie',
  'two girls one cup', 'undressing', 'upskirt', 'urethra play', 'urophilia', 'venus mound',
  'viagra', 'vibrator', 'violet wand', 'vorarephilia', 'voyeur', 'voyeurweb', 'voyuer',
  'wet dream', 'wetback', 'white power', 'whore', 'worldsex', 'wrapping men',
  'wrinkled starfish', 'xxx', 'yaoi', 'yellow showers', 'yiffy', 'zoophilia',
];

/**
 * Terms LDNOOBW does not contain. Every one was verified absent from upstream
 * by set difference before being listed here — this is not a hedge, it is the
 * measured gap.
 *
 * Two classes, and both are the reason this app needs a filter at all:
 *   DISABILITY SLURS — the class most likely to be aimed at these users, and
 *     the class a general-purpose obscenity list simply does not model.
 *   SELF-HARM / HARASSMENT PHRASES — matched as whole phrases, never as words.
 *     `kill yourself` blocks; "the lift will kill the schedule" and "please help
 *     yourself to a leaflet" do not, and both are pinned by test.
 *
 * ⚠ A future re-vendoring may replace LDNOOBW_CURATED wholesale. It must NOT
 * touch this array, or the disability slurs leave the app silently.
 */
const CURATED_EXTRA: readonly string[] = [
  // Disability slurs.
  'retard', 'retarded', 'cripple', 'mongoloid',
  // Racial/ethnic slurs absent from upstream.
  'chink', 'gook', 'dyke',
  // Explicit sexual terms absent from upstream.
  'felching', 'buttplug',
  // Harassment and self-harm encouragement — phrases, deliberately.
  'kill yourself', 'kys', 'go die', 'you should die', 'hope you die',
  'neck yourself',
];

/**
 * ⚑ SKY-EDITABLE. Add terms here rather than editing the tiers above — this
 * array is the one §2 promises, and keeping additions separate is what lets a
 * future re-vendoring replace LDNOOBW_CURATED wholesale without losing anything
 * Sky added.
 *
 * Same rules apply: lowercase, and prefer a whole word or phrase over a
 * fragment. A fragment like 'ass' would block "assistance", "assess" and
 * "passable" — all words a barrier report genuinely needs.
 */
export const ADDITIONS: string[] = [];

/**
 * Every term the filter checks, read live.
 *
 * A function, not a `const` array, on purpose: a const would snapshot ADDITIONS
 * at module load, so anything pushed later — a Settings-driven list, a test —
 * would be silently ignored while the export still *looked* authoritative.
 * That was a real bug in the first draft of this file, caught by the ADDITIONS
 * test below.
 */
export function allBlockedTerms(): readonly string[] {
  return [...LDNOOBW_CURATED, ...CURATED_EXTRA, ...ADDITIONS];
}

/** Escape a term for safe interpolation into the matcher. */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * One alternation regex, built once. Sorted longest-first so a phrase wins
 * over a word it contains, which keeps `findBlockedTerm`'s answer the most
 * specific true one rather than an arbitrary shorter match.
 *
 * `\b` on both ends is what makes this word-boundary rather than substring —
 * the difference between blocking "cunt" and blocking "Scunthorpe".
 */
let matcher: RegExp | null = null;

function getMatcher(): RegExp {
  if (matcher) return matcher;
  const alternation = [...allBlockedTerms()]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|');
  matcher = new RegExp(`\\b(${alternation})\\b`, 'i');
  return matcher;
}

/**
 * Call after mutating ADDITIONS at runtime. Exists for tests and for a future
 * Settings-driven list; the shipped app never needs it.
 */
export function resetMatcher(): void {
  matcher = null;
}

/**
 * Normalise before matching: collapse whitespace so a multi-word phrase still
 * matches across a line break, and strip combining marks so a diacritic cannot
 * trivially smuggle a slur past ("nigger" with a combining acute).
 *
 * Deliberately does NOT collapse repeated letters or map leetspeak — see the
 * false-positive trade in the file header.
 */
function normalise(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * The matched term, or null. **Diagnostic and test use only — never show this
 * to the user.** §2 is explicit that the rejection copy does not echo or name
 * the matched term, and that is not decoration: naming it turns the filter
 * into a hint sheet for getting past it, and repeats the slur back at whoever
 * just read it.
 */
export function findBlockedTerm(text: string): string | null {
  const found = getMatcher().exec(normalise(text));
  return found?.[1] ? found[1].toLowerCase() : null;
}

/** Whether the text may not be submitted. */
export function containsBlockedTerm(text: string): boolean {
  return findBlockedTerm(text) !== null;
}

/**
 * ─── DROPPED BY THE D-2 CURATION (31 terms) ───────────────────────────────
 * Kept visible, not deleted, so the decision is reversible and a future reader
 * can see what the curation actually did rather than having to diff against
 * upstream. These ARE in LDNOOBW and are DELIBERATELY NOT BLOCKED:
 *
 *   apeshit · arsehole · ass · asshole · assmunch · bastard · bastardo · bitch · bitches · bollocks · bullshit · clusterfuck · dick · eat my ass · fuck · fuck buttons · fuckin · fucking · fucktards · god damn · knobbing · motherfucker · piece of shit · piss pig · pissing · pisspig · shit · shitblimp · shitty · twat · wank
 *
 * A user swearing about a genuine barrier is still filing a genuine barrier
 * report. If Sky ever wants these blocked, move them into ADDITIONS — but the
 * must-pass corpus in `__tests__/blockedTerms.test.ts` will go red, and that
 * red is the point: it is the regression guard on this decision.
 */

/**
 * ─── DROPPED AS NEUTRAL IN THIS DOMAIN (16 terms) ─────────────────────────
 * New with the 2026-07-28 vendoring. These are in LDNOOBW, are not ordinary
 * profanity, and are still not blocked — because in an accessibility app they
 * are ordinary vocabulary, and blocking them would reject real reports:
 *
 *   anus · butt · escort · grope · nipple · penis · pubes · rectum · semen · sex · sexual · snatch · suck · sucks · vagina · vulva
 *
 * The concrete sentences that drove each: "the single-sex accessible washroom
 * is locked" (sex, sexual) · "staff would not escort me to the lift" (escort) ·
 * a Changing Places report describing catheter or stoma care (anus, rectum,
 * vulva, penis, vagina, semen, nipple, pubes) · "the ramp sucks" — frustration,
 * which D-2 already protects (suck, sucks) · "the threshold butts up against
 * the mat" (butt) · "I had to grope along the wall to find the door", which is
 * how a blind user describes a barrier (grope) · "someone snatched my bag at
 * the stop" (snatch).
 *
 * Sexual COMPOUNDS of these words are still blocked — dropping `sex` does not
 * drop `sexo`, `sexcam` or `sexy`. The bare word is what was ambiguous.
 */
