/**
 * Ranked, typo-tolerant search for small in-memory lists (a few thousand
 * items), e.g. the post-pay teacher picker.
 *
 * Build the index once (`buildSearchIndex`), then `searchIndex` per
 * keystroke. Every word typed must match some field; each match scores:
 *   exact word 100 · word prefix 80 · inside a word 45 · one/two typos 30/18
 * times the field's weight (name counts more than address). Typing a number
 * (3+ digits) matches phone numbers digit-by-digit, ignoring spaces, dashes
 * and +977. Ties go to the shorter name, then alphabetical.
 */

export interface SearchField {
  value: string | null | undefined;
  /** 1 = as important as the name. */
  weight: number;
}

interface IndexedField {
  text: string;
  words: string[];
  weight: number;
}

export interface SearchEntry<T> {
  item: T;
  name: string;
  fields: IndexedField[];
  digits: string[];
}

export function normalize(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}@.+]+/gu, " ")
    .trim();
}

const digitsOf = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

/**
 * Optimal-string-alignment distance (insert, delete, substitute, swap two
 * neighbours), giving up as soon as it must exceed `max`.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

const allowedTypos = (token: string) => (token.length >= 7 ? 2 : token.length >= 4 ? 1 : 0);

function scoreToken(token: string, field: IndexedField): number {
  let best = 0;
  for (const word of field.words) {
    if (word === token) return 100 * field.weight;
    if (word.startsWith(token)) best = Math.max(best, 80);
    else if (word.includes(token)) best = Math.max(best, 45);
  }
  if (!best && field.text.includes(token)) best = 45;
  const typos = allowedTypos(token);
  if (best < 45 && typos) {
    for (const word of field.words) {
      // Whole word, or the start of a longer word being typed ("shrma" → "sharma…")
      const target = word.length > token.length + typos ? word.slice(0, token.length) : word;
      const d = editDistance(token, target, typos);
      if (d <= typos) best = Math.max(best, d === 1 ? 30 : 18);
    }
  }
  return best * field.weight;
}

export function buildSearchIndex<T>(
  items: T[],
  getName: (item: T) => string,
  getFields: (item: T) => SearchField[],
  getPhones: (item: T) => (string | null | undefined)[] = () => [],
): SearchEntry<T>[] {
  return items.map((item) => ({
    item,
    name: getName(item),
    fields: getFields(item)
      .map(({ value, weight }) => {
        const text = normalize(value);
        return { text, words: text.split(" ").filter(Boolean), weight };
      })
      .filter((f) => f.text),
    digits: getPhones(item).map(digitsOf).filter((d) => d.length >= 3),
  }));
}

export function searchIndex<T>(index: SearchEntry<T>[], query: string, limit = 8): T[] {
  const q = normalize(query);
  if (!q) return [];
  const queryDigits = digitsOf(query);
  const looksLikePhone = queryDigits.length >= 3 && /^[\d\s+()-]+$/.test(query.trim());
  const tokens = q.split(" ").filter(Boolean);

  const scored: { item: T; score: number; name: string }[] = [];
  for (const entry of index) {
    let score = 0;
    if (looksLikePhone) {
      // 98xx… typed without the +977: match anywhere, prefer the start
      const hit = entry.digits.find((d) => d.includes(queryDigits));
      if (!hit) continue;
      score = hit.startsWith(queryDigits) || hit.replace(/^977/, "").startsWith(queryDigits) ? 150 : 100;
    } else {
      let matchedAll = true;
      for (const token of tokens) {
        let best = 0;
        for (const field of entry.fields) best = Math.max(best, scoreToken(token, field));
        if (!best) {
          matchedAll = false;
          break;
        }
        score += best;
      }
      if (!matchedAll) continue;
      const name = normalize(entry.name);
      if (name === q) score += 120;
      else if (name.startsWith(q)) score += 60;
    }
    scored.push({ item: entry.item, score, name: entry.name });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.name.length - b.name.length ||
      a.name.localeCompare(b.name, "en", { sensitivity: "base" }),
  );
  return scored.slice(0, limit).map((s) => s.item);
}

/**
 * Splits `text` into parts with the typed words marked, for bolding matches.
 * Plain substring matching on the original text, so typo matches stay plain.
 */
export function highlightParts(text: string, query: string): { text: string; hit: boolean }[] {
  const tokens = normalize(query).split(" ").filter((t) => t.length > 0);
  if (!text || !tokens.length) return [{ text, hit: false }];
  const lower = text.toLowerCase();
  const marks = new Array(text.length).fill(false);
  for (const token of tokens) {
    let from = 0;
    let at: number;
    while ((at = lower.indexOf(token, from)) !== -1) {
      for (let i = at; i < at + token.length; i++) marks[i] = true;
      from = at + token.length;
    }
  }
  const parts: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.hit === marks[i]) last.text += text[i];
    else parts.push({ text: text[i], hit: marks[i] });
  }
  return parts;
}
