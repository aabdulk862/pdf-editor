import { create } from 'zustand';

import { useToastStore } from '../../../store/toast';
import type { LetterheadTemplate } from '../types';

const STORAGE_KEY = 'pdf-editor-letterhead-templates';
const LAST_USED_KEY = 'pdf-editor-letterhead-last-used';
const MAX_TEMPLATES = 20;

export interface LetterheadStoreState {
  templates: LetterheadTemplate[];
  activeTemplateId: string | null;
  lastUsedTemplateId: string | null;
  editorState: 'idle' | 'editing' | 'previewing' | 'applying';

  // CRUD actions
  createTemplate: (template: Omit<LetterheadTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<LetterheadTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => string;
  renameTemplate: (id: string, name: string) => void;

  // Editor actions
  selectTemplate: (id: string) => void;
  setEditorState: (state: LetterheadStoreState['editorState']) => void;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useLetterheadStore = create<LetterheadStoreState>((set, get) => ({
  templates: [],
  activeTemplateId: null,
  lastUsedTemplateId: null,
  editorState: 'idle',

  createTemplate: (template) => {
    const { templates } = get();
    if (templates.length >= MAX_TEMPLATES) {
      useToastStore
        .getState()
        .addToast(
          `Cannot create template: maximum of ${MAX_TEMPLATES} templates reached. Delete unused templates to free space.`,
          'error',
        );
      return '';
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const newTemplate: LetterheadTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      templates: [...state.templates, newTemplate],
      activeTemplateId: id,
    }));
    get().saveToStorage();
    return id;
  },

  updateTemplate: (id, updates) => {
    const now = Date.now();
    set((state) => ({
      templates: state.templates.map((t) =>
        t.id === id ? { ...t, ...updates, id: t.id, updatedAt: now } : t,
      ),
    }));
    get().saveToStorage();
  },

  deleteTemplate: (id) => {
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
      activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
    }));
    get().saveToStorage();
  },

  duplicateTemplate: (id) => {
    const { templates } = get();
    if (templates.length >= MAX_TEMPLATES) {
      useToastStore
        .getState()
        .addToast(
          `Cannot duplicate template: maximum of ${MAX_TEMPLATES} templates reached. Delete unused templates to free space.`,
          'error',
        );
      return '';
    }

    const source = templates.find((t) => t.id === id);
    if (!source) return '';

    const now = Date.now();
    const newId = crypto.randomUUID();
    const duplicate: LetterheadTemplate = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      templates: [...state.templates, duplicate],
    }));
    get().saveToStorage();
    return newId;
  },

  renameTemplate: (id, name) => {
    const now = Date.now();
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? { ...t, name, updatedAt: now } : t)),
    }));
    get().saveToStorage();
  },

  selectTemplate: (id) => {
    set({ activeTemplateId: id, lastUsedTemplateId: id });
    try {
      localStorage.setItem(LAST_USED_KEY, id);
    } catch {
      // Ignore storage errors for last-used tracking
    }
  },

  setEditorState: (state) => {
    set({ editorState: state });
  },

  loadFromStorage: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ templates: parsed });
        }
      }
    } catch {
      // Graceful fallback: keep empty templates array on parse error
    }

    try {
      const lastUsed = localStorage.getItem(LAST_USED_KEY);
      if (lastUsed) {
        set({ lastUsedTemplateId: lastUsed });
      }
    } catch {
      // Ignore storage read errors for last-used
    }
  },

  saveToStorage: () => {
    const { templates } = get();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        useToastStore
          .getState()
          .addToast('Storage is full. Delete unused templates to free space.', 'error');
      }
    }
  },
}));
