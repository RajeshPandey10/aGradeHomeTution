type Searchable = string | number | null | undefined | false | Searchable[];

const flatten = (values: Searchable[]): string[] =>
  values.flatMap((v) =>
    Array.isArray(v) ? flatten(v) : v === null || v === undefined || v === false ? [] : [String(v)],
  );

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/**
 * True when every word of `query` appears in at least one of `values`
 * (case-insensitive). Words with 3+ digits are also compared digits-only,
 * so "980-000 0000" finds "9800000000" and "+977 9800000000".
 * An empty query matches everything.
 */
export function matchesSearch(query: string, values: Searchable[]): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const fields = flatten(values).map((v) => v.toLowerCase());
  const haystack = fields.join(" \u0000 ");
  const digitHaystack = fields.map(digitsOnly).join(" ");
  const queryDigits = digitsOnly(query);

  // A phone number typed with spaces ("980 000 0000") is one search, not three.
  if (queryDigits.length >= 6 && /^[\d\s+()-]+$/.test(query.trim())) {
    return digitHaystack.includes(queryDigits);
  }

  return terms.every((term) => {
    if (haystack.includes(term)) return true;
    const termDigits = digitsOnly(term);
    return termDigits.length >= 3 && termDigits.length === term.replace(/[\s+()-]/g, "").length
      ? digitHaystack.includes(termDigits)
      : false;
  });
}
