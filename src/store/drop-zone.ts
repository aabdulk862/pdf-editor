import { create } from 'zustand';

import type { GlobalDropZoneState } from '../features/global-drop-zone/types';

export const useDropZoneStore = create<GlobalDropZoneState>((set) => ({
  isDragging: false,
  isValidType: false,

  setDragging: (isDragging: boolean, isValid: boolean) => set({ isDragging, isValidType: isValid }),
}));
