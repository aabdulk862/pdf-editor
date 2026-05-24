/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadRecentFiles, saveRecentFiles, clearRecentFiles } from './storage';
import type { RecentFileEntry } from './types';

const validEntry: RecentFileEntry = {
  id: 'test-id-1',
  fileName: 'report.pdf',
  fileSize: 1024,
  lastOpenedAt: 1700000000000,
  operationRoute: '/compress',
  operationName: 'Compress',
};

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('loadRecentFiles', () => {
    it('returns empty array when no data stored', () => {
      expect(loadRecentFiles()).toEqual([]);
    });

    it('returns parsed entries from localStorage', () => {
      window.localStorage.setItem('pdf-editor-recent-files', JSON.stringify([validEntry]));
      expect(loadRecentFiles()).toEqual([validEntry]);
    });

    it('returns empty array and clears storage on corrupted JSON', () => {
      window.localStorage.setItem('pdf-editor-recent-files', 'not-json{{{');
      expect(loadRecentFiles()).toEqual([]);
      expect(window.localStorage.getItem('pdf-editor-recent-files')).toBeNull();
    });

    it('returns empty array and clears storage when data is not an array', () => {
      window.localStorage.setItem('pdf-editor-recent-files', JSON.stringify({ foo: 'bar' }));
      expect(loadRecentFiles()).toEqual([]);
      expect(window.localStorage.getItem('pdf-editor-recent-files')).toBeNull();
    });

    it('skips malformed entries', () => {
      const malformed = { id: 'bad', fileName: 123 }; // fileName should be string
      window.localStorage.setItem(
        'pdf-editor-recent-files',
        JSON.stringify([validEntry, malformed]),
      );
      expect(loadRecentFiles()).toEqual([validEntry]);
    });

    it('handles localStorage throwing on getItem', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('SecurityError');
      };
      expect(loadRecentFiles()).toEqual([]);
      localStorage.getItem = originalGetItem;
    });
  });

  describe('saveRecentFiles', () => {
    it('saves entries to localStorage and returns true', () => {
      const result = saveRecentFiles([validEntry]);
      expect(result).toBe(true);
      expect(window.localStorage.getItem('pdf-editor-recent-files')).toBe(
        JSON.stringify([validEntry]),
      );
    });

    it('returns false when localStorage throws', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };
      const result = saveRecentFiles([validEntry]);
      expect(result).toBe(false);
      localStorage.setItem = originalSetItem;
    });
  });

  describe('clearRecentFiles', () => {
    it('removes the key from localStorage', () => {
      window.localStorage.setItem('pdf-editor-recent-files', JSON.stringify([validEntry]));
      clearRecentFiles();
      expect(window.localStorage.getItem('pdf-editor-recent-files')).toBeNull();
    });

    it('does not throw when localStorage is unavailable', () => {
      const originalRemoveItem = localStorage.removeItem;
      localStorage.removeItem = () => {
        throw new Error('SecurityError');
      };
      expect(() => clearRecentFiles()).not.toThrow();
      localStorage.removeItem = originalRemoveItem;
    });
  });
});
