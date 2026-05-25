import { create } from 'zustand';

import type { CommandItem, CommandPaletteState } from '../features/command-palette/types';
import { filterCommands } from '../features/command-palette/filter';

/**
 * All 29 PDF operations available in the application.
 * Each item includes name, description, route, keywords, and category.
 */
const PDF_OPERATIONS: CommandItem[] = [
  {
    id: 'merge',
    name: 'Merge',
    description: 'Combine multiple PDF files into one document',
    route: '/merge',
    keywords: ['combine', 'join', 'concatenate'],
    category: 'operation',
  },
  {
    id: 'split',
    name: 'Split',
    description: 'Split a PDF into multiple separate documents',
    route: '/split',
    keywords: ['separate', 'divide', 'extract pages'],
    category: 'operation',
  },
  {
    id: 'rotate',
    name: 'Rotate',
    description: 'Rotate PDF pages by 90, 180, or 270 degrees',
    route: '/rotate',
    keywords: ['turn', 'orientation', 'landscape', 'portrait'],
    category: 'operation',
  },
  {
    id: 'delete-pages',
    name: 'Delete Pages',
    description: 'Remove specific pages from a PDF document',
    route: '/delete-pages',
    keywords: ['remove', 'discard', 'eliminate'],
    category: 'operation',
  },
  {
    id: 'reorder',
    name: 'Reorder',
    description: 'Rearrange the page order in a PDF document',
    route: '/reorder',
    keywords: ['rearrange', 'sort', 'move pages'],
    category: 'operation',
  },
  {
    id: 'compress',
    name: 'Compress',
    description: 'Reduce PDF file size while maintaining quality',
    route: '/compress',
    keywords: ['reduce', 'optimize', 'shrink', 'smaller'],
    category: 'operation',
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert images (PNG, JPEG) to PDF format',
    route: '/image-to-pdf',
    keywords: ['convert', 'photo', 'picture', 'png', 'jpeg', 'jpg'],
    category: 'operation',
  },
  {
    id: 'page-numbers',
    name: 'Page Numbers',
    description: 'Add page numbers to PDF documents',
    route: '/page-numbers',
    keywords: ['numbering', 'pagination', 'footer'],
    category: 'operation',
  },
  {
    id: 'extract-images',
    name: 'Extract Images',
    description: 'Extract all images from a PDF document',
    route: '/extract-images',
    keywords: ['export', 'save images', 'get pictures'],
    category: 'operation',
  },
  {
    id: 'text-overlay',
    name: 'Text Overlay',
    description: 'Add text annotations on top of PDF pages',
    route: '/text-overlay',
    keywords: ['annotate', 'write', 'label', 'caption'],
    category: 'operation',
  },
  {
    id: 'highlight',
    name: 'Highlight',
    description: 'Highlight text and areas in a PDF document',
    route: '/highlight',
    keywords: ['mark', 'emphasize', 'color', 'annotate'],
    category: 'operation',
  },
  {
    id: 'signature',
    name: 'Signature',
    description: 'Add digital signatures to PDF documents',
    route: '/signature',
    keywords: ['sign', 'autograph', 'e-sign', 'digital signature'],
    category: 'operation',
  },
  {
    id: 'stamps',
    name: 'Stamps',
    description: 'Add stamps and badges to PDF pages',
    route: '/stamps',
    keywords: ['badge', 'seal', 'mark', 'approved', 'confidential'],
    category: 'operation',
  },
  {
    id: 'watermarks',
    name: 'Watermarks',
    description: 'Add text or image watermarks to PDF pages',
    route: '/watermarks',
    keywords: ['overlay', 'branding', 'draft', 'confidential'],
    category: 'operation',
  },
  {
    id: 'password-protect',
    name: 'Password Protect',
    description: 'Encrypt and password protect PDF documents',
    route: '/password-protect',
    keywords: ['encrypt', 'secure', 'lock', 'restrict'],
    category: 'operation',
  },
  {
    id: 'unlock',
    name: 'Unlock',
    description: 'Remove password protection from PDF documents',
    route: '/unlock',
    keywords: ['decrypt', 'remove password', 'open', 'unrestrict'],
    category: 'operation',
  },
  {
    id: 'redact',
    name: 'Redact',
    description: 'Permanently remove sensitive content from PDFs',
    route: '/redact',
    keywords: ['censor', 'black out', 'hide', 'sensitive', 'privacy'],
    category: 'operation',
  },
  {
    id: 'metadata',
    name: 'Metadata',
    description: 'View and edit PDF document metadata properties',
    route: '/metadata',
    keywords: ['properties', 'info', 'author', 'title', 'subject'],
    category: 'operation',
  },
  {
    id: 'form-fill',
    name: 'Form Fill',
    description: 'Fill in PDF form fields and interactive elements',
    route: '/form-fill',
    keywords: ['input', 'fields', 'interactive', 'fillable'],
    category: 'operation',
  },
  {
    id: 'compare',
    name: 'Compare',
    description: 'Compare two PDF documents side by side',
    route: '/compare',
    keywords: ['diff', 'difference', 'side by side', 'changes'],
    category: 'operation',
  },
  {
    id: 'extract-text',
    name: 'Extract Text',
    description: 'Extract text content from PDF documents',
    route: '/extract-text',
    keywords: ['copy text', 'ocr', 'get text', 'read'],
    category: 'operation',
  },
  {
    id: 'pdf-to-image',
    name: 'PDF to Image',
    description: 'Convert PDF pages to image format (PNG, JPEG)',
    route: '/pdf-to-image',
    keywords: ['export', 'convert', 'screenshot', 'render'],
    category: 'operation',
  },
  {
    id: 'flatten',
    name: 'Flatten',
    description: 'Flatten PDF annotations and form fields into the page',
    route: '/flatten',
    keywords: ['merge layers', 'static', 'non-editable'],
    category: 'operation',
  },
  {
    id: 'crop',
    name: 'Crop',
    description: 'Crop PDF pages to a specific area or margin',
    route: '/crop',
    keywords: ['trim', 'cut', 'resize', 'margins'],
    category: 'operation',
  },
  {
    id: 'headers-footers',
    name: 'Headers & Footers',
    description: 'Add headers and footers to PDF pages',
    route: '/headers-footers',
    keywords: ['header', 'footer', 'top', 'bottom', 'running text'],
    category: 'operation',
  },
  {
    id: 'bookmarks',
    name: 'Bookmarks',
    description: 'Add and manage bookmarks in PDF documents',
    route: '/bookmarks',
    keywords: ['outline', 'table of contents', 'toc', 'navigation'],
    category: 'operation',
  },
  {
    id: 'page-size',
    name: 'Page Size',
    description: 'Change the page size of PDF documents',
    route: '/page-size',
    keywords: ['resize', 'a4', 'letter', 'dimensions', 'format'],
    category: 'operation',
  },
  {
    id: 'linearize',
    name: 'Linearize',
    description: 'Optimize PDF for fast web viewing',
    route: '/linearize',
    keywords: ['web optimize', 'fast view', 'streaming', 'progressive'],
    category: 'operation',
  },
  {
    id: 'duplicate-pages',
    name: 'Duplicate Pages',
    description: 'Duplicate specific pages within a PDF document',
    route: '/duplicate-pages',
    keywords: ['copy', 'clone', 'repeat', 'replicate'],
    category: 'operation',
  },
];

export const useCommandPaletteStore = create<CommandPaletteState>((set, get) => ({
  isOpen: false,
  query: '',
  activeIndex: 0,
  items: PDF_OPERATIONS,
  filteredItems: PDF_OPERATIONS,
  previousFocusElement: null,

  open: () => {
    const previousFocusElement = document.activeElement as HTMLElement | null;
    set({
      isOpen: true,
      previousFocusElement,
    });
  },

  close: () => {
    const { previousFocusElement } = get();
    set({
      isOpen: false,
      query: '',
      activeIndex: 0,
      filteredItems: PDF_OPERATIONS,
      previousFocusElement: null,
    });
    if (previousFocusElement && typeof previousFocusElement.focus === 'function') {
      previousFocusElement.focus();
    }
  },

  setQuery: (query: string) => {
    // Enforce max 100 characters
    const truncated = query.slice(0, 100);
    const filtered = filterCommands(get().items, truncated);
    set({
      query: truncated,
      filteredItems: filtered,
      activeIndex: 0,
    });
  },

  moveSelection: (direction: 'up' | 'down') => {
    const { activeIndex, filteredItems } = get();
    const count = filteredItems.length;
    if (count === 0) return;

    let newIndex: number;
    if (direction === 'down') {
      newIndex = (activeIndex + 1) % count;
    } else {
      newIndex = (activeIndex - 1 + count) % count;
    }
    set({ activeIndex: newIndex });
  },

  setActiveIndex: (index: number) => {
    const { filteredItems } = get();
    if (filteredItems.length === 0) return;
    const clamped = Math.max(0, Math.min(index, filteredItems.length - 1));
    set({ activeIndex: clamped });
  },

  getActiveItem: () => {
    const { activeIndex, filteredItems } = get();
    if (filteredItems.length === 0) return null;
    return filteredItems[activeIndex] ?? null;
  },
}));
