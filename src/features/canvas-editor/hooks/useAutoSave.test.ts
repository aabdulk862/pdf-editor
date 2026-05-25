import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '../../../store/toast';
import { AUTO_SAVE_INTERVAL } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import type { CanvasDocument } from '../types';
import { useAutoSave } from './useAutoSave';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
    get _store() {
      return store;
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function createTestDocument(id = 'test-doc-1'): CanvasDocument {
  return {
    id,
    name: 'Test Document',
    pages: [
      {
        id: 'page-1',
        width: 210,
        height: 297,
        backgroundColor: '#FFFFFF',
        elements: [],
      },
    ],
    activePageIndex: 0,
    createdAt: 1000,
    updatedAt: 1000,
  };
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();

    // Reset stores
    useCanvasStore.setState({
      document: null,
      savedColors: [],
    });
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('auto-save interval', () => {
    it('should auto-save after 30 seconds when document is dirty', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc });

      renderHook(() => useAutoSave('test-doc-1'));

      // Simulate a document mutation by updating the store
      act(() => {
        useCanvasStore.setState({
          document: { ...doc, updatedAt: 2000 },
        });
      });

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'canvas-editor-autosave-test-doc-1',
        expect.any(String),
      );

      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls.find(
          (call: string[]) => call[0] === 'canvas-editor-autosave-test-doc-1',
        )![1],
      );
      expect(savedData.documentId).toBe('test-doc-1');
      expect(savedData.document.name).toBe('Test Document');
      expect(savedData.savedAt).toBeGreaterThan(0);
    });

    it('should NOT auto-save when document is not dirty', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc });

      renderHook(() => useAutoSave('test-doc-1'));

      // Advance time without making changes
      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'canvas-editor-autosave-test-doc-1',
        expect.any(String),
      );
    });

    it('should not auto-save when documentId is null', () => {
      renderHook(() => useAutoSave(null));

      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('manual save (Ctrl+S)', () => {
    it('should save immediately on Ctrl+S and show toast', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc });

      renderHook(() => useAutoSave('test-doc-1'));

      // Simulate Ctrl+S
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 's',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'canvas-editor-document-test-doc-1',
        expect.any(String),
      );

      // Check toast was shown
      const toasts = useToastStore.getState().toasts;
      expect(toasts.some((t) => t.message === 'Saved')).toBe(true);
    });
  });

  describe('beforeunload', () => {
    it('should auto-save on beforeunload when dirty', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc });

      renderHook(() => useAutoSave('test-doc-1'));

      // Make document dirty
      act(() => {
        useCanvasStore.setState({
          document: { ...doc, updatedAt: 2000 },
        });
      });

      // Trigger beforeunload
      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'canvas-editor-autosave-test-doc-1',
        expect.any(String),
      );
    });

    it('should NOT auto-save on beforeunload when not dirty', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc });

      renderHook(() => useAutoSave('test-doc-1'));

      // Trigger beforeunload without making changes
      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'canvas-editor-autosave-test-doc-1',
        expect.any(String),
      );
    });
  });

  describe('checkForRecovery', () => {
    it('should return recovery metadata when auto-save data exists', () => {
      const autoSaveData = {
        document: createTestDocument(),
        savedAt: 1700000000000,
        documentId: 'test-doc-1',
      };
      localStorageMock.setItem('canvas-editor-autosave-test-doc-1', JSON.stringify(autoSaveData));

      const { result } = renderHook(() => useAutoSave('test-doc-1'));

      const recovery = result.current.checkForRecovery('test-doc-1');
      expect(recovery).toEqual({
        exists: true,
        savedAt: 1700000000000,
        documentName: 'Test Document',
      });
    });

    it('should return null when no auto-save data exists', () => {
      const { result } = renderHook(() => useAutoSave('test-doc-1'));

      const recovery = result.current.checkForRecovery('test-doc-1');
      expect(recovery).toBeNull();
    });

    it('should return null and clean up corrupted data', () => {
      localStorageMock.setItem('canvas-editor-autosave-test-doc-1', 'invalid-json{{{');

      const { result } = renderHook(() => useAutoSave('test-doc-1'));

      const recovery = result.current.checkForRecovery('test-doc-1');
      expect(recovery).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('canvas-editor-autosave-test-doc-1');
    });
  });

  describe('recoverDocument', () => {
    it('should return the saved document', () => {
      const doc = createTestDocument();
      const autoSaveData = {
        document: doc,
        savedAt: 1700000000000,
        documentId: 'test-doc-1',
      };
      localStorageMock.setItem('canvas-editor-autosave-test-doc-1', JSON.stringify(autoSaveData));

      const { result } = renderHook(() => useAutoSave('test-doc-1'));

      const recovered = result.current.recoverDocument('test-doc-1');
      expect(recovered).toEqual(doc);
    });

    it('should return null when no data exists', () => {
      const { result } = renderHook(() => useAutoSave('test-doc-1'));

      const recovered = result.current.recoverDocument('test-doc-1');
      expect(recovered).toBeNull();
    });
  });

  describe('clearRecoveryData', () => {
    it('should remove auto-save data from localStorage', () => {
      localStorageMock.setItem(
        'canvas-editor-autosave-test-doc-1',
        JSON.stringify({ document: createTestDocument(), savedAt: 1000, documentId: 'test-doc-1' }),
      );

      const { result } = renderHook(() => useAutoSave('test-doc-1'));

      act(() => {
        result.current.clearRecoveryData('test-doc-1');
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('canvas-editor-autosave-test-doc-1');
    });
  });

  describe('saved colors persistence', () => {
    it('should persist saved colors when they change', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc, savedColors: [] });

      renderHook(() => useAutoSave('test-doc-1'));

      // Simulate color change
      act(() => {
        useCanvasStore.setState({ savedColors: ['#FF0000', '#00FF00'] });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'canvas-editor-palette',
        JSON.stringify(['#FF0000', '#00FF00']),
      );
    });
  });

  describe('quota exceeded handling', () => {
    it('should show warning toast when localStorage quota is exceeded', () => {
      const doc = createTestDocument();
      useCanvasStore.setState({ document: doc });

      // Make setItem throw QuotaExceededError
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw quotaError;
      });

      renderHook(() => useAutoSave('test-doc-1'));

      // Make dirty and trigger auto-save
      act(() => {
        useCanvasStore.setState({
          document: { ...doc, updatedAt: 2000 },
        });
      });

      act(() => {
        vi.advanceTimersByTime(AUTO_SAVE_INTERVAL);
      });

      const toasts = useToastStore.getState().toasts;
      expect(
        toasts.some((t) => t.message.includes('Auto-save failed') && t.severity === 'warning'),
      ).toBe(true);
    });
  });
});
