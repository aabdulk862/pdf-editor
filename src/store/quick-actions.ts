import { create } from 'zustand';

import type { QuickActionsState } from '../features/quick-actions/types';
import { getSuggestions } from '../features/quick-actions/suggestions';

export const useQuickActionsStore = create<QuickActionsState>((set) => ({
  isVisible: false,
  actions: [],
  resultFile: null,

  show: (operationType: string, resultFile: ArrayBuffer) => {
    const suggestions = getSuggestions(operationType);
    if (suggestions.length > 0) {
      set({ isVisible: true, actions: suggestions, resultFile });
    }
  },

  dismiss: () => set({ isVisible: false }),

  hide: () => set({ isVisible: false, actions: [], resultFile: null }),
}));
