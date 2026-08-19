/**
 * Client-side hide + block list — the Apple Guideline 1.2(c) leg.
 *
 * 1.2 requires four things of a UGC app: a filter for objectionable material,
 * a mechanism to report offensive content with a timely response, the ability
 * to BLOCK abusive users, and published contact info. This module closes the
 * third, and it is the only one of the four that can be closed without a
 * migration or a product decision — 04 §A-12 ② names this exact shape as
 * accepted practice: "block/hide-author that works for anonymous authors too
 * (client-side hide list keyed on report id is accepted practice)".
 *
 * TWO KINDS OF ENTRY, AND THE DIFFERENCE IS THE WHOLE DESIGN.
 *   · `'comment'` — a per-ITEM hide. One bubble, chosen by the reader.
 *   · `'author'`  — a per-PERSON block, keyed on `flag_comments.user_id`.
 *                   Forward-looking: it hides that account's comments as they
 *                   arrive, which per-item hiding structurally cannot do.
 *
 * Only `'author'` satisfies 1.2(c). Hiding one comment at a time never does:
 * the abuser posts again and the new bubble renders normally, so the reader is
 * re-hiding forever. That gap was the App Store blocker recorded as §B3 in
 * `qa-reports/2026-08-18_AppStore_Readiness_Audit.md`.
 *
 * WHY `'flag'` IS DECLARED BUT UNUSED. Flags never display an author —
 * `FlagDetailModal.tsx` renders "You" / "Another community member" /
 * "Anonymous" and nothing else — so a blocked author's pin is already
 * unattributable to them, and anonymous flags are `user_id IS NULL` rows with
 * no author to block at all. Blocking is therefore scoped to COMMENTS this
 * phase, the same scope Sky set for Hide at §SKY-3h, and ratified for Block by
 * Jordan's 2026-08-18 Phase-0 gate (answer 5). This is a deliberate scope
 * decision, NOT an omission — do not "fix" it by threading a blocked-id set
 * into `listFlags` without a fresh product decision.
 *
 * WHY DEVICE-LOCAL. AsyncStorage keeps the choice on the device that made it,
 * and the trade is worth stating plainly: the list does not follow the user to
 * a new device and is cleared with app data. The user-facing copy says so.
 *
 * ⚑ CORRECTION, 2026-08-18 (Jordan Phase-0 gate, condition 8). This header
 * used to justify device-local storage by asserting that a server-side list
 * "would create exactly the user<->content linkage Jordan's hard condition
 * refuses elsewhere in this codebase." **That was a loose paraphrase, not a
 * ruling.** Jordan re-read the record: the two real conditions are (a) no
 * user<->LOCATION linkage, because pattern-of-life inference from geolocated
 * rows is the actual harm (`src/lib/disputes.ts:6-9`), and (b) no bulk admin
 * enumeration of verifier correlations that would out accessibility advocates
 * (`qa-reports/2026-06-01_Jordan_Phase6Audit.md:177-179`). Neither is a blanket
 * ban on persisting a user↔user or user↔content fact — this app already stores
 * `flags.user_id` and joins `flag_comments.user_id` to a display name on every
 * bubble, both Jordan-reviewed and accepted. The overgeneralised sentence is
 * removed rather than reworded, because it was being inherited uncritically as
 * a design constraint it never was. A SERVER-SIDE block list remains a real
 * option; it simply needs its own Phase-0 gate, which this document is not.
 *
 * Error policy per CLAUDE.md's tiers: reads warn and fall back to "nothing
 * hidden" (never hide MORE than the user asked for on a corrupt read); writes
 * throw, because a hide that silently fails is a promise broken to someone who
 * just told you they do not want to see something.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * What a stored entry points at.
 *
 * `'author'` holds a `public.users.id` uuid; the other two hold content ids.
 * They share one storage key because they share one lifecycle — the reader's
 * personal filter for this device — and one error policy.
 */
export type HiddenKind = 'flag' | 'comment' | 'author';

const STORAGE_KEY = '@accessmap/hidden_content_v1';

type HiddenMap = Record<HiddenKind, string[]>;

const EMPTY: HiddenMap = { flag: [], comment: [], author: [] };

function parse(raw: string | null): HiddenMap {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    const rec = parsed as Partial<HiddenMap>;
    // `author` is read with the same shape guard as the other two, which is
    // also the v1->v2 migration: a blob written before blocking existed simply
    // has no `author` key and falls back to []. No version bump, no rewrite —
    // the absent key IS the correct old value.
    return {
      flag: Array.isArray(rec.flag) ? rec.flag.filter((x): x is string => typeof x === 'string') : [],
      comment: Array.isArray(rec.comment)
        ? rec.comment.filter((x): x is string => typeof x === 'string')
        : [],
      author: Array.isArray(rec.author)
        ? rec.author.filter((x): x is string => typeof x === 'string')
        : [],
    };
  } catch {
    // Corrupt value — start fresh rather than carry it forward.
    return { ...EMPTY };
  }
}

/** Everything this device has hidden. Falls back to nothing-hidden on error. */
export async function loadHidden(): Promise<HiddenMap> {
  try {
    return parse(await AsyncStorage.getItem(STORAGE_KEY));
  } catch (e) {
    console.warn('[hiddenContent] read failed, treating as nothing hidden:', e);
    return { ...EMPTY };
  }
}

/**
 * Hide one item. Throws on write failure — the caller must surface it, because
 * silently failing to hide something a user asked to never see again is the
 * worst possible outcome for this feature.
 */
export async function hideContent(kind: HiddenKind, id: string): Promise<void> {
  const current = await loadHidden();
  if (current[kind].includes(id)) return;
  const next: HiddenMap = { ...current, [kind]: [...current[kind], id] };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Un-hide one item. Same write policy. */
export async function unhideContent(kind: HiddenKind, id: string): Promise<void> {
  const current = await loadHidden();
  if (!current[kind].includes(id)) return;
  const next: HiddenMap = { ...current, [kind]: current[kind].filter((x) => x !== id) };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/** Clear the whole list (Settings affordance / test teardown). */
export async function clearHidden(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Drop hidden items from a list. Pure and synchronous so render paths can call
 * it without an await — the caller loads the ids once and filters on every
 * render.
 */
export function filterHidden<T>(items: T[], hiddenIds: string[], idOf: (item: T) => string): T[] {
  if (hiddenIds.length === 0) return items;
  const hidden = new Set(hiddenIds);
  return items.filter((item) => !hidden.has(idOf(item)));
}

/**
 * Drop everything authored by a blocked account. The 1.2(c) read side.
 *
 * Separate from `filterHidden` rather than a call through it, because the null
 * case is the entire point and deserves to be stated once, here, where it can
 * be tested: `authorOf` returns `string | null`, and a NULL author is never
 * filtered. `flag_comments.user_id` is nullable live (see the SR-117 drift
 * capture) — a comment whose author deleted their account comes back with a
 * null user_id, and those rows belong to nobody. Routing them through
 * `filterHidden` with a `?? ''` coercion would work only by accident, and
 * would silently start hiding every orphaned comment the day someone stored an
 * empty string in the block list.
 *
 * Pure and synchronous for the same reason `filterHidden` is: the caller loads
 * the id list once and filters on every render without an await.
 */
export function filterBlockedAuthors<T>(
  items: T[],
  blockedAuthorIds: string[],
  authorOf: (item: T) => string | null | undefined,
): T[] {
  if (blockedAuthorIds.length === 0) return items;
  const blocked = new Set(blockedAuthorIds);
  return items.filter((item) => {
    const author = authorOf(item);
    if (!author) return true;
    return !blocked.has(author);
  });
}
