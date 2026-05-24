import type { CommandItem } from './types';

/**
 * Filters command items by checking that every space-separated token
 * in the query appears as a case-insensitive substring in the item's
 * name or description.
 *
 * - Empty or whitespace-only query returns all items unchanged
 * - Tokens are split by spaces and each must match independently
 * - A token matches if it appears in name OR description (case-insensitive)
 */
export function filterCommands(items: CommandItem[], query: string): CommandItem[] {
  const trimmed = query.trim();
  if (trimmed === '') {
    return items;
  }

  const tokens = trimmed.toLowerCase().split(/\s+/);

  return items.filter((item) => {
    const name = item.name.toLowerCase();
    const description = item.description.toLowerCase();

    return tokens.every((token) => name.includes(token) || description.includes(token));
  });
}
