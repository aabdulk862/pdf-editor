import { useEffect, useId } from 'react';

import type { ToolbarSlot } from '../app/Toolbar';
import { useToolbarStore } from '../store/toolbar';

/**
 * useToolbar — Registers toolbar controls into the shared toolbar store.
 *
 * Tool pages call this hook with an array of `ToolbarSlot` items to inject
 * their controls into the AppShell's contextual toolbar. When the component
 * unmounts, the slots are automatically unregistered (cleanup).
 *
 * This enables any tool page to register its own toolbar controls without
 * modifying the AppShell or Toolbar components directly.
 *
 * @param controls - Array of ToolbarSlot items to register
 *
 * @example
 * ```tsx
 * function RotatePage() {
 *   useToolbar([
 *     { id: 'rotate-cw', position: 'center', component: <button>Rotate CW</button> },
 *     { id: 'rotate-ccw', position: 'center', component: <button>Rotate CCW</button> },
 *   ]);
 *
 *   return <div>...</div>;
 * }
 * ```
 *
 * Requirements: 1.6, 13.4
 */
export function useToolbar(controls: ToolbarSlot[]): void {
  const id = useId();
  const register = useToolbarStore((state) => state.register);
  const unregister = useToolbarStore((state) => state.unregister);

  useEffect(() => {
    register(id, controls);

    return () => {
      unregister(id);
    };
    // We intentionally use JSON serialization of control ids to detect
    // meaningful changes without requiring stable references from callers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, register, unregister, JSON.stringify(controls.map((c) => c.id))]);
}
