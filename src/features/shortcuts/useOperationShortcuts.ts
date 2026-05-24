import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useShortcutStore } from '../../store/shortcuts';
import type { ShortcutBinding, ShortcutKeys } from './types';

/**
 * Defines keyboard shortcut bindings for all 29 PDF operation pages.
 * Uses Alt+<key> combinations to avoid conflicts with browser/OS shortcuts.
 * Each shortcut navigates to the corresponding operation page.
 */
interface OperationShortcutDef {
  id: string;
  keys: ShortcutKeys;
  label: string;
  route: string;
}

const OPERATION_SHORTCUTS: OperationShortcutDef[] = [
  { id: 'nav-merge', keys: { key: 'm', alt: true }, label: 'Go to Merge', route: '/merge' },
  { id: 'nav-split', keys: { key: 's', alt: true }, label: 'Go to Split', route: '/split' },
  { id: 'nav-rotate', keys: { key: 'r', alt: true }, label: 'Go to Rotate', route: '/rotate' },
  {
    id: 'nav-delete-pages',
    keys: { key: 'd', alt: true },
    label: 'Go to Delete Pages',
    route: '/delete-pages',
  },
  { id: 'nav-reorder', keys: { key: 'o', alt: true }, label: 'Go to Reorder', route: '/reorder' },
  {
    id: 'nav-compress',
    keys: { key: 'c', alt: true },
    label: 'Go to Compress',
    route: '/compress',
  },
  {
    id: 'nav-image-to-pdf',
    keys: { key: 'i', alt: true },
    label: 'Go to Image to PDF',
    route: '/image-to-pdf',
  },
  {
    id: 'nav-page-numbers',
    keys: { key: 'n', alt: true },
    label: 'Go to Page Numbers',
    route: '/page-numbers',
  },
  {
    id: 'nav-extract-images',
    keys: { key: 'x', alt: true },
    label: 'Go to Extract Images',
    route: '/extract-images',
  },
  {
    id: 'nav-text-overlay',
    keys: { key: 't', alt: true },
    label: 'Go to Text Overlay',
    route: '/text-overlay',
  },
  {
    id: 'nav-highlight',
    keys: { key: 'h', alt: true },
    label: 'Go to Highlight',
    route: '/highlight',
  },
  {
    id: 'nav-signature',
    keys: { key: 'g', alt: true },
    label: 'Go to Signature',
    route: '/signature',
  },
  { id: 'nav-stamps', keys: { key: 'a', alt: true }, label: 'Go to Stamps', route: '/stamps' },
  {
    id: 'nav-watermarks',
    keys: { key: 'w', alt: true },
    label: 'Go to Watermarks',
    route: '/watermarks',
  },
  {
    id: 'nav-password-protect',
    keys: { key: 'p', alt: true },
    label: 'Go to Password Protect',
    route: '/password-protect',
  },
  { id: 'nav-unlock', keys: { key: 'u', alt: true }, label: 'Go to Unlock', route: '/unlock' },
  { id: 'nav-redact', keys: { key: 'e', alt: true }, label: 'Go to Redact', route: '/redact' },
  {
    id: 'nav-metadata',
    keys: { key: 'j', alt: true },
    label: 'Go to Metadata',
    route: '/metadata',
  },
  {
    id: 'nav-form-fill',
    keys: { key: 'f', alt: true },
    label: 'Go to Form Fill',
    route: '/form-fill',
  },
  { id: 'nav-compare', keys: { key: 'q', alt: true }, label: 'Go to Compare', route: '/compare' },
  {
    id: 'nav-extract-text',
    keys: { key: 'y', alt: true },
    label: 'Go to Extract Text',
    route: '/extract-text',
  },
  {
    id: 'nav-pdf-to-image',
    keys: { key: 'v', alt: true },
    label: 'Go to PDF to Image',
    route: '/pdf-to-image',
  },
  { id: 'nav-flatten', keys: { key: 'l', alt: true }, label: 'Go to Flatten', route: '/flatten' },
  { id: 'nav-crop', keys: { key: 'z', alt: true }, label: 'Go to Crop', route: '/crop' },
  {
    id: 'nav-headers-footers',
    keys: { key: 'b', alt: true },
    label: 'Go to Headers & Footers',
    route: '/headers-footers',
  },
  {
    id: 'nav-bookmarks',
    keys: { key: '1', alt: true },
    label: 'Go to Bookmarks',
    route: '/bookmarks',
  },
  {
    id: 'nav-page-size',
    keys: { key: '2', alt: true },
    label: 'Go to Page Size',
    route: '/page-size',
  },
  {
    id: 'nav-linearize',
    keys: { key: '3', alt: true },
    label: 'Go to Linearize',
    route: '/linearize',
  },
  {
    id: 'nav-duplicate-pages',
    keys: { key: '4', alt: true },
    label: 'Go to Duplicate Pages',
    route: '/duplicate-pages',
  },
];

/**
 * Hook that registers keyboard shortcuts for navigating to all 29 PDF operation pages.
 * Uses Alt+<key> combinations to avoid conflicts with browser and OS shortcuts.
 * Shortcuts are suppressed when text inputs are focused.
 *
 * Requirements: 3.1, 3.2
 */
export function useOperationShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const store = useShortcutStore.getState();

    const bindings: ShortcutBinding[] = OPERATION_SHORTCUTS.map((def) => ({
      id: def.id,
      keys: def.keys,
      action: () => navigate(def.route),
      label: def.label,
      category: 'operations' as const,
      scope: 'global' as const,
      bypassInputFocus: false,
    }));

    // Register all operation shortcuts
    for (const binding of bindings) {
      store.register(binding);
    }

    // Cleanup: unregister on unmount
    return () => {
      const s = useShortcutStore.getState();
      for (const def of OPERATION_SHORTCUTS) {
        s.unregister(def.id);
      }
    };
  }, [navigate]);
}
