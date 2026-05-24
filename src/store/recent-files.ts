import { create } from 'zustand';

import type { RecentFileEntry, RecentFilesState } from '../features/recent-files/types';
import {
  clearRecentFiles,
  loadRecentFiles,
  saveRecentFiles,
} from '../features/recent-files/storage';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useRecentFilesStore = create<RecentFilesState>((set, get) => ({
  entries: loadRecentFiles(),
  maxEntries: 20,

  addEntry: (file: File, operationRoute: string, operationName: string) => {
    const { entries, maxEntries } = get();
    const now = Date.now();

    // Check for duplicate by fileName + fileSize
    const existingIndex = entries.findIndex(
      (entry) => entry.fileName === file.name && entry.fileSize === file.size,
    );

    let updatedEntries: RecentFileEntry[];

    if (existingIndex !== -1) {
      // Update existing entry's timestamp and operation info
      updatedEntries = entries.map((entry, index) =>
        index === existingIndex
          ? { ...entry, lastOpenedAt: now, operationRoute, operationName }
          : entry,
      );
    } else {
      // Create new entry
      const newEntry: RecentFileEntry = {
        id: generateId(),
        fileName: file.name,
        fileSize: file.size,
        lastOpenedAt: now,
        operationRoute,
        operationName,
      };
      updatedEntries = [...entries, newEntry];
    }

    // Enforce capacity: keep only the most recent maxEntries
    if (updatedEntries.length > maxEntries) {
      // Sort by lastOpenedAt descending and keep only maxEntries
      updatedEntries.sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
      updatedEntries = updatedEntries.slice(0, maxEntries);
    }

    set({ entries: updatedEntries });
    saveRecentFiles(updatedEntries);
  },

  removeEntry: (id: string) => {
    const { entries } = get();
    const updatedEntries = entries.filter((entry) => entry.id !== id);
    set({ entries: updatedEntries });
    saveRecentFiles(updatedEntries);
  },

  clearAll: () => {
    set({ entries: [] });
    clearRecentFiles();
  },

  getEntries: () => {
    const { entries } = get();
    return [...entries].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  },
}));
