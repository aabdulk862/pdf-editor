import { describe, it, expect, beforeEach } from 'vitest';
import { useRecentFilesStore } from './recent-files';

function createMockFile(name: string, size: number): File {
  const content = new ArrayBuffer(size);
  return new File([content], name, { type: 'application/pdf' });
}

describe('useRecentFilesStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset the store state
    useRecentFilesStore.setState({ entries: [], maxEntries: 20 });
  });

  describe('addEntry', () => {
    it('adds a new entry with correct fields', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      const entries = useRecentFilesStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].fileName).toBe('test.pdf');
      expect(entries[0].fileSize).toBe(1024);
      expect(entries[0].operationRoute).toBe('/compress');
      expect(entries[0].operationName).toBe('Compress');
      expect(entries[0].id).toBeDefined();
      expect(entries[0].lastOpenedAt).toBeGreaterThan(0);
    });

    it('persists to localStorage after adding', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      const stored = JSON.parse(localStorage.getItem('pdf-editor-recent-files')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].fileName).toBe('test.pdf');
    });

    it('deduplicates by fileName + fileSize and updates timestamp', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      const firstTimestamp = useRecentFilesStore.getState().entries[0].lastOpenedAt;

      // Add same file again with different operation
      const sameFile = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(sameFile, '/merge', 'Merge');

      const entries = useRecentFilesStore.getState().entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].operationRoute).toBe('/merge');
      expect(entries[0].operationName).toBe('Merge');
      expect(entries[0].lastOpenedAt).toBeGreaterThanOrEqual(firstTimestamp);
    });

    it('does not deduplicate when fileSize differs', () => {
      const file1 = createMockFile('test.pdf', 1024);
      const file2 = createMockFile('test.pdf', 2048);
      useRecentFilesStore.getState().addEntry(file1, '/compress', 'Compress');
      useRecentFilesStore.getState().addEntry(file2, '/merge', 'Merge');

      expect(useRecentFilesStore.getState().entries).toHaveLength(2);
    });

    it('enforces max 20 entries by evicting oldest', () => {
      // Add 21 entries
      for (let i = 0; i < 21; i++) {
        const file = createMockFile(`file-${i}.pdf`, i * 100 + 100);
        useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');
      }

      const entries = useRecentFilesStore.getState().entries;
      expect(entries).toHaveLength(20);
    });

    it('evicts the entry with the oldest lastOpenedAt', () => {
      // Manually set entries with known timestamps
      const baseEntries = Array.from({ length: 20 }, (_, i) => ({
        id: `id-${i}`,
        fileName: `file-${i}.pdf`,
        fileSize: (i + 1) * 100,
        lastOpenedAt: 1000 + i, // id-0 is oldest
        operationRoute: '/compress',
        operationName: 'Compress',
      }));
      useRecentFilesStore.setState({ entries: baseEntries });

      // Add one more
      const newFile = createMockFile('new-file.pdf', 9999);
      useRecentFilesStore.getState().addEntry(newFile, '/merge', 'Merge');

      const entries = useRecentFilesStore.getState().entries;
      expect(entries).toHaveLength(20);
      // The oldest entry (id-0 with lastOpenedAt=1000) should be evicted
      expect(entries.find((e) => e.id === 'id-0')).toBeUndefined();
      // The new entry should be present
      expect(entries.find((e) => e.fileName === 'new-file.pdf')).toBeDefined();
    });
  });

  describe('removeEntry', () => {
    it('removes an entry by id', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      const id = useRecentFilesStore.getState().entries[0].id;
      useRecentFilesStore.getState().removeEntry(id);

      expect(useRecentFilesStore.getState().entries).toHaveLength(0);
    });

    it('persists removal to localStorage', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      const id = useRecentFilesStore.getState().entries[0].id;
      useRecentFilesStore.getState().removeEntry(id);

      const stored = JSON.parse(localStorage.getItem('pdf-editor-recent-files')!);
      expect(stored).toHaveLength(0);
    });

    it('does nothing for non-existent id', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      useRecentFilesStore.getState().removeEntry('non-existent');
      expect(useRecentFilesStore.getState().entries).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('removes all entries and clears localStorage', () => {
      const file = createMockFile('test.pdf', 1024);
      useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress');

      useRecentFilesStore.getState().clearAll();

      expect(useRecentFilesStore.getState().entries).toHaveLength(0);
      expect(localStorage.getItem('pdf-editor-recent-files')).toBeNull();
    });
  });

  describe('getEntries', () => {
    it('returns entries sorted by lastOpenedAt descending', () => {
      // Manually set entries with known timestamps
      useRecentFilesStore.setState({
        entries: [
          {
            id: 'a',
            fileName: 'old.pdf',
            fileSize: 100,
            lastOpenedAt: 1000,
            operationRoute: '/compress',
            operationName: 'Compress',
          },
          {
            id: 'b',
            fileName: 'new.pdf',
            fileSize: 200,
            lastOpenedAt: 3000,
            operationRoute: '/merge',
            operationName: 'Merge',
          },
          {
            id: 'c',
            fileName: 'mid.pdf',
            fileSize: 150,
            lastOpenedAt: 2000,
            operationRoute: '/split',
            operationName: 'Split',
          },
        ],
      });

      const sorted = useRecentFilesStore.getState().getEntries();
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('c');
      expect(sorted[2].id).toBe('a');
    });

    it('returns empty array when no entries', () => {
      expect(useRecentFilesStore.getState().getEntries()).toEqual([]);
    });
  });

  describe('localStorage graceful degradation', () => {
    it('continues working when localStorage throws on save', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('QuotaExceededError');
      };

      const file = createMockFile('test.pdf', 1024);
      // Should not throw
      expect(() =>
        useRecentFilesStore.getState().addEntry(file, '/compress', 'Compress'),
      ).not.toThrow();

      // Entry should still be in memory
      expect(useRecentFilesStore.getState().entries).toHaveLength(1);
      localStorage.setItem = originalSetItem;
    });
  });
});
