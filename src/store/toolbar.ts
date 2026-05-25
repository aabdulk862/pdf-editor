import { create } from 'zustand';

import type { ToolbarSlot } from '../app/Toolbar';

/**
 * Toolbar registration entry — associates a set of slots with the
 * component instance that registered them (identified by a unique key).
 */
interface ToolbarRegistration {
  key: string;
  slots: ToolbarSlot[];
}

export interface ToolbarState {
  /** All currently registered toolbar slot groups */
  registrations: ToolbarRegistration[];

  /** Flat array of all active toolbar slots (derived from registrations) */
  slots: ToolbarSlot[];

  /** Register a set of toolbar slots under a unique key */
  register: (key: string, slots: ToolbarSlot[]) => void;

  /** Unregister all toolbar slots associated with the given key */
  unregister: (key: string) => void;
}

/**
 * Zustand store for toolbar slot registrations.
 *
 * Tools register their toolbar controls via the `useToolbar` hook, which
 * calls `register` on mount and `unregister` on unmount. The AppShell
 * reads from this store to render the current toolbar slots.
 *
 * This enables any tool page to inject its own toolbar controls without
 * modifying the AppShell or Toolbar components directly.
 *
 * Requirements: 1.6, 13.4
 */
export const useToolbarStore = create<ToolbarState>((set) => ({
  registrations: [],
  slots: [],

  register: (key: string, newSlots: ToolbarSlot[]) =>
    set((state) => {
      const filtered = state.registrations.filter((r) => r.key !== key);
      const registrations = [...filtered, { key, slots: newSlots }];
      return {
        registrations,
        slots: registrations.flatMap((r) => r.slots),
      };
    }),

  unregister: (key: string) =>
    set((state) => {
      const registrations = state.registrations.filter((r) => r.key !== key);
      return {
        registrations,
        slots: registrations.flatMap((r) => r.slots),
      };
    }),
}));
