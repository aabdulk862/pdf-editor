import { useEffect, useRef } from 'react';

import { useCanvasStore } from '../store/canvas-store';
import { generateThumbnail, useRecentFilesStore } from '../store/recent-files-store';
import type { CanvasDocument, RecentFileEntry } from '../types';

/**
 * Hook that integrates the recent files store with the canvas document lifecycle.
 *
 * - On document create/load: adds the document to recent files with a generated thumbnail
 * - On document save (updatedAt changes after manual save): updates the lastOpened timestamp
 *
 * Requirements: 19.1, 19.3
 */
export function useRecentFilesIntegration(): void {
  const document = useCanvasStore((state) => state.document);
  const addRecentFile = useRecentFilesStore((state) => state.addRecentFile);

  // Load recent files from localStorage on first mount
  useEffect(() => {
    useRecentFilesStore.getState().loadRecentFiles();
  }, []);

  // Track the previous document ID to detect create/load transitions
  const prevDocIdRef = useRef<string | null>(null);

  // When a new document is created or loaded, add it to recent files
  useEffect(() => {
    if (!document) {
      prevDocIdRef.current = null;
      return;
    }

    // Only trigger when the document ID changes (new document created or loaded)
    if (document.id === prevDocIdRef.current) {
      return;
    }

    prevDocIdRef.current = document.id;

    // Generate thumbnail and add to recent files
    const thumbnail = generateThumbnail(document);
    const documentRef = `canvas-editor-document-${document.id}`;

    const entry: RecentFileEntry = {
      id: document.id,
      name: document.name,
      lastOpened: Date.now(),
      type: 'canvas-design',
      thumbnail,
      documentRef,
    };

    addRecentFile(entry);
  }, [document, addRecentFile]);

  // Subscribe to store changes to detect manual saves (Ctrl+S triggers saveToLocalStorage)
  useEffect(() => {
    let lastSaveTimestamp: number | null = null;

    const unsubscribe = useCanvasStore.subscribe((state, prevState) => {
      // Detect when saveToLocalStorage was called by checking if the document
      // was written to localStorage. We track this by listening for the manual
      // save key being set. Since saveToLocalStorage doesn't change store state,
      // we instead detect saves via the auto-save hook's manual save flow.
      // A simpler approach: update lastOpened whenever updatedAt changes
      // (which happens on every mutation). Instead, we'll hook into the
      // beforeunload / interval save by detecting the document exists and
      // has been updated since last check.

      // We update lastOpened when the document's updatedAt changes,
      // but debounce to avoid excessive writes. The auto-save hook handles
      // the actual persistence; we just keep the recent files entry fresh.
      if (
        state.document &&
        prevState.document &&
        state.document.id === prevState.document.id &&
        state.document.updatedAt !== prevState.document.updatedAt
      ) {
        // Debounce: only update if more than 5 seconds since last update
        const now = Date.now();
        if (lastSaveTimestamp === null || now - lastSaveTimestamp > 5000) {
          lastSaveTimestamp = now;
          useRecentFilesStore.getState().updateLastOpened(state.document.id);
        }
      }
    });

    return unsubscribe;
  }, []);
}

/**
 * Utility to add a document to recent files from outside React components.
 * Useful for imperative flows (e.g., after template selection).
 */
export function addDocumentToRecentFiles(doc: CanvasDocument): void {
  const thumbnail = generateThumbnail(doc);
  const documentRef = `canvas-editor-document-${doc.id}`;

  const entry: RecentFileEntry = {
    id: doc.id,
    name: doc.name,
    lastOpened: Date.now(),
    type: 'canvas-design',
    thumbnail,
    documentRef,
  };

  useRecentFilesStore.getState().addRecentFile(entry);
}
