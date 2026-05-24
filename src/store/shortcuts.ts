import { create } from 'zustand';

import type {
  FocusContext,
  ShortcutBinding,
  ShortcutCategory,
  ShortcutKeys,
  ShortcutManagerState,
  ShortcutScope,
} from '../features/shortcuts/types';

/**
 * Scope priority for conflict resolution.
 * Higher number = more specific scope = higher priority.
 */
const SCOPE_PRIORITY: Record<ShortcutScope, number> = {
  global: 0,
  panel: 1,
  modal: 2,
};

/**
 * Builds a normalized key string from a ShortcutKeys object.
 * Format: "ctrl+alt+shift+meta+key" (modifiers in consistent order, all lowercase)
 */
export function buildKeyString(keys: ShortcutKeys): string {
  const parts: string[] = [];
  if (keys.ctrl) parts.push('ctrl');
  if (keys.alt) parts.push('alt');
  if (keys.shift) parts.push('shift');
  if (keys.meta) parts.push('meta');
  parts.push(keys.key.toLowerCase());
  return parts.join('+');
}

/**
 * Builds a normalized key string from a KeyboardEvent.
 * Matches the format produced by buildKeyString.
 */
export function buildKeyStringFromEvent(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');
  if (event.metaKey) parts.push('meta');
  parts.push(event.key.toLowerCase());
  return parts.join('+');
}

export const useShortcutStore = create<ShortcutManagerState>((set, get) => ({
  bindings: new Map(),

  register: (binding: ShortcutBinding) => {
    set((state) => {
      const newBindings = new Map(state.bindings);
      if (newBindings.has(binding.id)) {
        // eslint-disable-next-line no-console
        console.warn(`[ShortcutManager] Overwriting existing shortcut binding: "${binding.id}"`);
      }
      newBindings.set(binding.id, binding);
      return { bindings: newBindings };
    });
  },

  unregister: (id: string) => {
    set((state) => {
      const newBindings = new Map(state.bindings);
      newBindings.delete(id);
      return { bindings: newBindings };
    });
  },

  resolve: (event: KeyboardEvent, focusContext: FocusContext): ShortcutBinding | null => {
    const { bindings } = get();
    const eventKeyString = buildKeyStringFromEvent(event);

    // Find all bindings matching the key combination
    const matchingBindings: ShortcutBinding[] = [];
    for (const binding of bindings.values()) {
      const bindingKeyString = buildKeyString(binding.keys);
      if (bindingKeyString === eventKeyString) {
        matchingBindings.push(binding);
      }
    }

    if (matchingBindings.length === 0) {
      return null;
    }

    // Filter based on text input focus context
    const filteredBindings = matchingBindings.filter((binding) => {
      if (focusContext.isTextInput && !binding.bypassInputFocus) {
        return false;
      }
      return true;
    });

    if (filteredBindings.length === 0) {
      return null;
    }

    // Among remaining matches, pick the one with the most specific scope
    // that matches or is less specific than the active scope.
    // Scope priority: modal > panel > global (most specific wins)
    const activeScopePriority = SCOPE_PRIORITY[focusContext.activeScope];

    // Filter to bindings whose scope is at or below the active scope priority
    const scopeValidBindings = filteredBindings.filter(
      (binding) => SCOPE_PRIORITY[binding.scope] <= activeScopePriority,
    );

    if (scopeValidBindings.length === 0) {
      return null;
    }

    // Pick the binding with the highest (most specific) scope priority
    let bestBinding = scopeValidBindings[0];
    for (let i = 1; i < scopeValidBindings.length; i++) {
      const current = scopeValidBindings[i];
      if (SCOPE_PRIORITY[current.scope] > SCOPE_PRIORITY[bestBinding.scope]) {
        bestBinding = current;
      }
    }

    return bestBinding;
  },

  getAll: (): ShortcutBinding[] => {
    const { bindings } = get();
    return Array.from(bindings.values());
  },

  getByCategory: (category: ShortcutCategory): ShortcutBinding[] => {
    const { bindings } = get();
    return Array.from(bindings.values()).filter((binding) => binding.category === category);
  },
}));
