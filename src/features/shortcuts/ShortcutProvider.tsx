import { useEffect, useCallback, createContext, useContext, useState, type ReactNode } from 'react';

import { useShortcutStore } from '../../store/shortcuts';
import { useCommandPaletteStore } from '../../store/command-palette';
import { useThemeStore } from '../../store/theme';
import type { FocusContext, ShortcutScope } from './types';

interface ShortcutContextValue {
  /** Whether the shortcut reference panel is open */
  isReferencePanelOpen: boolean;
  /** Open the shortcut reference panel */
  openReferencePanel: () => void;
  /** Close the shortcut reference panel */
  closeReferencePanel: () => void;
}

const ShortcutContext = createContext<ShortcutContextValue>({
  isReferencePanelOpen: false,
  openReferencePanel: () => {},
  closeReferencePanel: () => {},
});

export function useShortcutContext() {
  return useContext(ShortcutContext);
}

/**
 * Determines if the currently focused element is a text input.
 */
function getIsTextInput(): boolean {
  const el = document.activeElement;
  if (!el) return false;

  const tagName = el.tagName.toLowerCase();
  if (tagName === 'textarea') return true;
  if (tagName === 'input') {
    const type = (el as HTMLInputElement).type?.toLowerCase();
    const textTypes = ['text', 'search', 'url', 'email', 'password', 'tel', 'number'];
    return textTypes.includes(type);
  }
  if ((el as HTMLElement).isContentEditable) return true;

  return false;
}

/**
 * Determines the active scope based on whether a modal is open.
 */
function getActiveScope(): ShortcutScope {
  // Check for open modals in the DOM (role="dialog" or common modal patterns)
  const openModals = document.querySelectorAll('[role="dialog"], [data-modal-open="true"]');
  if (openModals.length > 0) return 'modal';

  return 'global';
}

interface ShortcutProviderProps {
  children: ReactNode;
}

/**
 * ShortcutProvider — Context provider that attaches a global `keydown` listener
 * to `document` and dispatches to the shortcut store's `resolve` method.
 *
 * Registers default application shortcuts on mount:
 * - Cmd+K / Ctrl+K → open command palette
 * - Shift+? → open shortcut reference panel
 * - Theme toggle (no default key registered here — can be added via store)
 * - Escape → close modal
 */
export function ShortcutProvider({ children }: ShortcutProviderProps) {
  const [isReferencePanelOpen, setIsReferencePanelOpen] = useState(false);

  const openReferencePanel = useCallback(() => setIsReferencePanelOpen(true), []);
  const closeReferencePanel = useCallback(() => setIsReferencePanelOpen(false), []);

  // Register default shortcuts on mount
  useEffect(() => {
    const store = useShortcutStore.getState();

    // Cmd+K / Ctrl+K → open command palette
    store.register({
      id: 'app-command-palette',
      keys: { key: 'k', meta: true },
      action: () => {
        const paletteState = useCommandPaletteStore.getState();
        if (paletteState.isOpen) {
          paletteState.close();
        } else {
          paletteState.open();
        }
      },
      label: 'Open Command Palette',
      category: 'application',
      scope: 'global',
      bypassInputFocus: true,
    });

    // Also register Ctrl+K for non-mac platforms
    store.register({
      id: 'app-command-palette-ctrl',
      keys: { key: 'k', ctrl: true },
      action: () => {
        const paletteState = useCommandPaletteStore.getState();
        if (paletteState.isOpen) {
          paletteState.close();
        } else {
          paletteState.open();
        }
      },
      label: 'Open Command Palette',
      category: 'application',
      scope: 'global',
      bypassInputFocus: true,
    });

    // Shift+? → open shortcut reference panel
    store.register({
      id: 'app-shortcut-reference',
      keys: { key: '?', shift: true },
      action: () => {
        setIsReferencePanelOpen((prev) => !prev);
      },
      label: 'Open Shortcut Reference',
      category: 'application',
      scope: 'global',
      bypassInputFocus: false,
    });

    // Theme toggle
    store.register({
      id: 'app-theme-toggle',
      keys: { key: 'd', meta: true, shift: true },
      action: () => {
        useThemeStore.getState().toggleTheme();
      },
      label: 'Toggle Theme',
      category: 'application',
      scope: 'global',
      bypassInputFocus: true,
    });

    // Escape → close modal
    store.register({
      id: 'app-close-modal',
      keys: { key: 'Escape' },
      action: () => {
        // Close command palette if open
        const paletteState = useCommandPaletteStore.getState();
        if (paletteState.isOpen) {
          paletteState.close();
          return;
        }
        // Close reference panel if open
        setIsReferencePanelOpen(false);
      },
      label: 'Close Modal',
      category: 'application',
      scope: 'modal',
      bypassInputFocus: true,
    });

    // Cleanup: unregister on unmount
    return () => {
      const s = useShortcutStore.getState();
      s.unregister('app-command-palette');
      s.unregister('app-command-palette-ctrl');
      s.unregister('app-shortcut-reference');
      s.unregister('app-theme-toggle');
      s.unregister('app-close-modal');
    };
  }, []);

  // Attach global keydown listener
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Build focus context
      const focusContext: FocusContext = {
        isTextInput: getIsTextInput(),
        activeScope: getActiveScope(),
      };

      // Resolve the shortcut
      const binding = useShortcutStore.getState().resolve(event, focusContext);

      if (binding) {
        event.preventDefault();
        event.stopPropagation();

        // Execute the action
        try {
          binding.action();
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[ShortcutProvider] Error executing shortcut "${binding.id}":`, error);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const contextValue: ShortcutContextValue = {
    isReferencePanelOpen,
    openReferencePanel,
    closeReferencePanel,
  };

  return <ShortcutContext.Provider value={contextValue}>{children}</ShortcutContext.Provider>;
}
