/**
 * Truncates a file name to a maximum length, appending "…" if truncated.
 * If the name is within the max length, it is returned unchanged.
 */
export function truncateFileName(name: string, max: number = 24): string {
  if (name.length <= max) {
    return name;
  }
  return name.slice(0, max - 1) + '\u2026';
}
