import type { RecentFileEntry } from './types';

const STORAGE_KEY = 'pdf-editor-recent-files';

/**
 * Loads recent files from localStorage.
 * Returns an empty array if localStorage is unavailable or data is corrupted.
 * Clears corrupted data from storage.
 */
export function loadRecentFiles(): RecentFileEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    // Validate each entry and skip malformed ones
    const valid = parsed.filter(
      (entry: unknown): entry is RecentFileEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as RecentFileEntry).id === 'string' &&
        typeof (entry as RecentFileEntry).fileName === 'string' &&
        typeof (entry as RecentFileEntry).fileSize === 'number' &&
        typeof (entry as RecentFileEntry).lastOpenedAt === 'number' &&
        typeof (entry as RecentFileEntry).operationRoute === 'string' &&
        typeof (entry as RecentFileEntry).operationName === 'string',
    );
    return valid;
  } catch {
    // JSON parse failed or localStorage threw — clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage completely unavailable, nothing to clear
    }
    return [];
  }
}

/**
 * Saves recent files to localStorage.
 * Returns false if localStorage is unavailable or quota is exceeded.
 */
export function saveRecentFiles(entries: RecentFileEntry[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

/**
 * Removes the recent files key from localStorage.
 */
export function clearRecentFiles(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable, nothing to clear
  }
}
