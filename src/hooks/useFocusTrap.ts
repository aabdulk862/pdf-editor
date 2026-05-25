import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Returns all focusable elements within a container.
 * Filters out elements with display:none or visibility:hidden.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    // Filter out hidden elements
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export interface UseFocusTrapOptions {
  /** Whether the focus trap is currently active */
  enabled: boolean;
  /** Whether to auto-focus the first focusable element when the trap activates. Defaults to true. */
  autoFocus?: boolean;
  /** Whether to restore focus to the previously focused element when the trap deactivates. Defaults to true. */
  restoreFocus?: boolean;
}

/**
 * Traps focus within a container element when enabled.
 *
 * - Tab/Shift+Tab cycles through focusable elements within the container
 * - On activation: focuses the first focusable element inside the container
 * - On deactivation: restores focus to the element that was focused before the trap was activated
 * - Handles edge cases: empty containers, dynamically added/removed focusable elements
 *
 * @param containerRef - Ref to the container element that should trap focus
 * @param options - Configuration options for the focus trap
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  options: UseFocusTrapOptions,
): void {
  const { enabled, autoFocus = true, restoreFocus = true } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasEnabledRef = useRef(false);

  // Store the previously focused element when the trap activates,
  // and restore focus on deactivation or unmount
  useEffect(() => {
    if (enabled) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      wasEnabledRef.current = true;
    }

    return () => {
      // Restore focus on cleanup (covers both disable and unmount)
      if (wasEnabledRef.current && restoreFocus) {
        const elementToRestore = previousFocusRef.current;
        if (elementToRestore && document.body.contains(elementToRestore)) {
          elementToRestore.focus();
        }
        previousFocusRef.current = null;
        wasEnabledRef.current = false;
      }
    };
  }, [enabled, restoreFocus]);

  // Auto-focus the first focusable element when the trap activates
  useEffect(() => {
    if (!enabled || !autoFocus) return;

    const container = containerRef.current;
    if (!container) return;

    // Use requestAnimationFrame to ensure the container is rendered and visible
    const frameId = requestAnimationFrame(() => {
      const focusableElements = getFocusableElements(container);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        // If no focusable elements, focus the container itself (needs tabindex)
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [enabled, autoFocus, containerRef]);

  // Handle Tab/Shift+Tab to trap focus within the container
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(container!);
      if (focusableElements.length === 0) {
        // No focusable elements — prevent Tab from leaving the container
        event.preventDefault();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        // Shift+Tab: if focus is on the first element, wrap to the last
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if focus is on the last element, wrap to the first
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, containerRef]);
}
