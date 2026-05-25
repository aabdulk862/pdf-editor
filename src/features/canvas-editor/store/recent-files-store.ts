import { create } from 'zustand';

import { MAX_RECENT_FILES, MAX_THUMBNAIL_SIZE } from '../constants';
import type { CanvasDocument, RecentFileEntry } from '../types';
import { useToastStore } from '../../../store/toast';
import { useCanvasStore } from './canvas-store';

const RECENT_FILES_KEY = 'pdf-editor-recent-files';

// === Thumbnail Generation ===

const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 160;
const INITIAL_JPEG_QUALITY = 0.6;
const QUALITY_REDUCTION_STEP = 0.1;
const MIN_JPEG_QUALITY = 0.1;

/**
 * Renders page 1 of a document to a 120×160 off-screen canvas,
 * exports as JPEG, and ensures the result is ≤ 10KB via quality reduction loop.
 */
export function generateThumbnail(document: CanvasDocument): string {
  if (!document.pages.length) {
    return '';
  }

  const canvas = window.document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = THUMBNAIL_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Render a simplified representation of page 1
  const page = document.pages[0];

  // Fill with page background color
  ctx.fillStyle = page.backgroundColor || '#FFFFFF';
  ctx.fillRect(0, 0, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT);

  // Calculate scale from page dimensions (mm) to thumbnail pixels
  const scaleX = THUMBNAIL_WIDTH / page.width;
  const scaleY = THUMBNAIL_HEIGHT / page.height;
  const scale = Math.min(scaleX, scaleY);

  // Render elements in z-order (simplified representation)
  const sortedElements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const element of sortedElements) {
    if (!element.visible) continue;

    ctx.save();
    ctx.globalAlpha = element.opacity / 100;

    const x = element.x * scale;
    const y = element.y * scale;
    const w = element.width * scale;
    const h = element.height * scale;

    switch (element.type) {
      case 'text':
        ctx.fillStyle = element.fontColor || '#000000';
        ctx.font = `${Math.max(6, element.fontSize * scale)}px sans-serif`;
        ctx.fillText(element.content.slice(0, 50), x, y + h * 0.5, w);
        break;
      case 'shape':
        ctx.fillStyle = element.fill || '#cccccc';
        if (element.shapeType === 'circle') {
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, w, h);
        }
        break;
      case 'image':
        // Draw a placeholder rectangle for images in thumbnail
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = '#999999';
        ctx.strokeRect(x, y, w, h);
        break;
      case 'group':
        // Draw bounding box for groups
        ctx.strokeStyle = '#cccccc';
        ctx.strokeRect(x, y, w, h);
        break;
    }

    ctx.restore();
  }

  // Export as JPEG with quality reduction loop to stay under MAX_THUMBNAIL_SIZE
  let quality = INITIAL_JPEG_QUALITY;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);

  while (getBase64ByteSize(dataUrl) > MAX_THUMBNAIL_SIZE && quality > MIN_JPEG_QUALITY) {
    quality -= QUALITY_REDUCTION_STEP;
    dataUrl = canvas.toDataURL('image/jpeg', Math.max(quality, MIN_JPEG_QUALITY));
  }

  return dataUrl;
}

/**
 * Estimates the byte size of a base64 data URL.
 */
function getBase64ByteSize(dataUrl: string): number {
  // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
  const base64 = dataUrl.split(',')[1] || '';
  // Base64 encodes 3 bytes into 4 characters
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// === Store Types ===

export interface RecentFilesStoreState {
  recentFiles: RecentFileEntry[];
  isLoading: boolean;
}

export interface RecentFilesStoreActions {
  loadRecentFiles(): void;
  addRecentFile(entry: RecentFileEntry): void;
  updateLastOpened(id: string): void;
  removeRecentFile(id: string): void;
  openRecentFile(id: string): void;
}

export type RecentFilesStore = RecentFilesStoreState & RecentFilesStoreActions;

// === Store Implementation ===

export const useRecentFilesStore = create<RecentFilesStore>((set, get) => ({
  // State
  recentFiles: [],
  isLoading: false,

  // Actions
  loadRecentFiles: () => {
    set({ isLoading: true });

    try {
      const raw = localStorage.getItem(RECENT_FILES_KEY);
      if (!raw) {
        set({ recentFiles: [], isLoading: false });
        return;
      }

      const parsed = JSON.parse(raw) as unknown[];
      if (!Array.isArray(parsed)) {
        // Corrupted data — clear it
        localStorage.removeItem(RECENT_FILES_KEY);
        useToastStore
          .getState()
          .addToast('Recent files data was corrupted and has been cleared.', 'warning');
        set({ recentFiles: [], isLoading: false });
        return;
      }

      // Validate and filter entries
      const validEntries: RecentFileEntry[] = [];
      for (const item of parsed) {
        if (isValidRecentFileEntry(item)) {
          validEntries.push(item);
        }
      }

      // Sort by lastOpened descending (most recent first)
      validEntries.sort((a, b) => b.lastOpened - a.lastOpened);

      set({ recentFiles: validEntries, isLoading: false });
    } catch {
      // JSON parse failed — corrupted data
      localStorage.removeItem(RECENT_FILES_KEY);
      useToastStore
        .getState()
        .addToast('Recent files data was corrupted and has been cleared.', 'warning');
      set({ recentFiles: [], isLoading: false });
    }
  },

  addRecentFile: (entry: RecentFileEntry) => {
    const { recentFiles } = get();

    // Remove existing entry with same id (to update it)
    let updated = recentFiles.filter((f) => f.id !== entry.id);

    // If at capacity, remove the oldest entry
    if (updated.length >= MAX_RECENT_FILES) {
      // Sort ascending by lastOpened to find oldest
      const sorted = [...updated].sort((a, b) => a.lastOpened - b.lastOpened);
      const oldest = sorted[0];
      updated = updated.filter((f) => f.id !== oldest.id);
    }

    // Add the new entry
    updated.push(entry);

    // Sort by lastOpened descending (most recent first)
    updated.sort((a, b) => b.lastOpened - a.lastOpened);

    set({ recentFiles: updated });
    persistRecentFiles(updated);
  },

  updateLastOpened: (id: string) => {
    const { recentFiles } = get();
    const index = recentFiles.findIndex((f) => f.id === id);
    if (index === -1) return;

    const updated = [...recentFiles];
    updated[index] = { ...updated[index], lastOpened: Date.now() };
    updated.sort((a, b) => b.lastOpened - a.lastOpened);

    set({ recentFiles: updated });
    persistRecentFiles(updated);
  },

  removeRecentFile: (id: string) => {
    const { recentFiles } = get();
    const entry = recentFiles.find((f) => f.id === id);

    // Remove from list
    const updated = recentFiles.filter((f) => f.id !== id);
    set({ recentFiles: updated });
    persistRecentFiles(updated);

    // Optionally delete associated document data from localStorage
    if (entry?.documentRef) {
      try {
        localStorage.removeItem(entry.documentRef);
      } catch {
        // Silently ignore — document data may already be gone
      }
    }
  },

  openRecentFile: (id: string) => {
    const { recentFiles } = get();
    const entry = recentFiles.find((f) => f.id === id);

    if (!entry) {
      useToastStore.getState().addToast('Recent file entry not found.', 'error');
      return;
    }

    // Read document data from localStorage using documentRef key
    try {
      let raw = localStorage.getItem(entry.documentRef);

      // Fallback: check auto-save key if manual save doesn't exist
      if (!raw) {
        const autoSaveKey = `canvas-editor-autosave-${entry.id}`;
        const autoSaveRaw = localStorage.getItem(autoSaveKey);
        if (autoSaveRaw) {
          const parsed = JSON.parse(autoSaveRaw) as { document: CanvasDocument };
          raw = JSON.stringify(parsed.document);
        }
      }

      if (!raw) {
        // Document data missing — remove corrupted entry
        get().removeRecentFile(id);
        useToastStore
          .getState()
          .addToast(`Could not recover "${entry.name}". The document data is missing.`, 'error');
        return;
      }

      const document = JSON.parse(raw) as CanvasDocument;

      // Load into canvas store
      useCanvasStore.getState().loadDocument(document);

      // Also persist to the manual save key so future opens work directly
      try {
        localStorage.setItem(entry.documentRef, JSON.stringify(document));
      } catch {
        // Quota exceeded — non-critical, skip
      }

      // Update lastOpened timestamp
      const updated = recentFiles.map((f) => (f.id === id ? { ...f, lastOpened: Date.now() } : f));
      updated.sort((a, b) => b.lastOpened - a.lastOpened);
      set({ recentFiles: updated });
      persistRecentFiles(updated);
    } catch {
      // Document data corrupted — remove entry
      get().removeRecentFile(id);
      useToastStore
        .getState()
        .addToast(`Could not recover "${entry.name}". The document data is corrupted.`, 'error');
    }
  },
}));

// === Helpers ===

function persistRecentFiles(files: RecentFileEntry[]): void {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
  } catch {
    // localStorage quota exceeded or unavailable
    useToastStore
      .getState()
      .addToast('Could not save recent files list. Storage may be full.', 'warning');
  }
}

function isValidRecentFileEntry(item: unknown): item is RecentFileEntry {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.lastOpened === 'number' &&
    (obj.type === 'canvas-design' || obj.type === 'pdf-tool-operation') &&
    typeof obj.thumbnail === 'string' &&
    typeof obj.documentRef === 'string'
  );
}
