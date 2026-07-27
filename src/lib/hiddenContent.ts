/**
 * Client-side hide list — the "block abusive users" leg of Apple Guideline 1.2.
 *
 * 1.2 requires four things of a UGC app: a filter for objectionable material,
 * a mechanism to report offensive content with a timely response, the ability
 * to BLOCK abusive users, and published contact info. This module closes the
 * third, and it is the only one of the four that can be closed without a
 * migration or a product decision — 04 §A-12 ② names this exact shape as
 * accepted practice: "block/hide-author that works for anonymous authors too
 * (client-side hide list keyed on report id is accepted practice)".
 *
 * WHY KEYED ON CONTENT ID, NOT AUTHOR ID. Most AccessMap content has no author
 * to block: anonymous flags are `user_id IS NULL` rows, and blocking "null"
 * would hide every anonymous report in the app. Hiding the specific item is
 * both the achievable thing and the proportionate one — it is a personal
 * filter, not a moderation verdict on a person.
 *
 * WHY DEVICE-LOCAL. Storing a hide list server-side would create exactly the
 * user<->content linkage Jordan's hard condition refuses elsewhere in this
 * codebase (see the dispute counter's privacy note). AsyncStorage keeps the
 * choice on the device that made it. The trade is honest and worth stating:
 * the list does not follow the user to a new device, and it is cleared with
 * app data.
 *
 * Error policy per CLAUDE.md's tiers: reads warn and fall back to "nothing
 * hidden" (never hide MORE than the user asked for on a corrupt read); writes
 * throw, because a hide that silently fails is a promise broken to someone who
 * just told you they do not want to see something.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Content kinds a user can hide. */
export type HiddenKind = 'flag' | 'comment';

const STORAGE_KEY = '@accessmap/hidden_content_v1';

type HiddenMap = Record<HiddenKind, string[]>;

const EMPTY: HiddenMap = { flag: [], comment: [] };

function parse(raw: string | null): HiddenMap {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY };
    const rec = parsed as Partial<HiddenMap>;
    return {
      flag: Array.isArray(rec.flag) ? rec.flag.filter((x): x is string => typeof x === 'string') : [],
      comment: Array.isArray(rec.comment)
        ? rec.comment.filter((x): x is string => typeof x === 'string')
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
