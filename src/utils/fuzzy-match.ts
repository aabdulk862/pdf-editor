/**
 * Fuzzy matching utility for searching tool names, descriptions, and category labels.
 *
 * Match quality ranking (highest to lowest):
 * 1. Exact match (query equals target)
 * 2. Starts-with (target starts with query)
 * 3. Contains (target includes query as substring)
 * 4. Fuzzy (all query characters appear in order within target)
 *
 * All matching is case-insensitive.
 */

export enum MatchQuality {
  None = 0,
  Fuzzy = 1,
  Contains = 2,
  StartsWith = 3,
  Exact = 4,
}

export interface FuzzyMatchResult {
  matches: boolean;
  quality: MatchQuality;
}

/**
 * Performs a fuzzy match of a query against a target string.
 * Returns whether the query matches and the quality of the match.
 *
 * Case-insensitive. An empty query matches everything with Exact quality.
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  const normalizedQuery = query.toLowerCase();
  const normalizedTarget = target.toLowerCase();

  // Empty query matches everything
  if (normalizedQuery === '') {
    return { matches: true, quality: MatchQuality.Exact };
  }

  // Exact match
  if (normalizedTarget === normalizedQuery) {
    return { matches: true, quality: MatchQuality.Exact };
  }

  // Starts-with match
  if (normalizedTarget.startsWith(normalizedQuery)) {
    return { matches: true, quality: MatchQuality.StartsWith };
  }

  // Contains match (substring)
  if (normalizedTarget.includes(normalizedQuery)) {
    return { matches: true, quality: MatchQuality.Contains };
  }

  // Fuzzy match: all characters of query appear in order within target
  if (fuzzyContains(normalizedQuery, normalizedTarget)) {
    return { matches: true, quality: MatchQuality.Fuzzy };
  }

  return { matches: false, quality: MatchQuality.None };
}

/**
 * Checks if all characters in the query appear in order within the target.
 * Both strings should already be lowercased.
 */
function fuzzyContains(query: string, target: string): boolean {
  let queryIndex = 0;

  for (let i = 0; i < target.length && queryIndex < query.length; i++) {
    if (target[i] === query[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === query.length;
}

/**
 * Scores a target string against a query by checking multiple fields.
 * Returns the best (highest) match quality found across all fields.
 */
export function fuzzyMatchBest(query: string, fields: string[]): FuzzyMatchResult {
  let bestResult: FuzzyMatchResult = { matches: false, quality: MatchQuality.None };

  for (const field of fields) {
    const result = fuzzyMatch(query, field);
    if (result.quality > bestResult.quality) {
      bestResult = result;
    }
    // Short-circuit on exact match
    if (bestResult.quality === MatchQuality.Exact) {
      break;
    }
  }

  return bestResult;
}
