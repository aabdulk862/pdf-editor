/**
 * Navigation category definitions for the categorized sidebar.
 * Defines all tool groups and their routes.
 *
 * Icons are wired separately in icons.tsx (task 13.2).
 */

export interface NavTool {
  path: string;
  label: string;
  categoryId: string;
}

export interface NavCategory {
  id: string;
  label: string;
  tools: NavTool[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'organize',
    label: 'Organize',
    tools: [
      { path: '/merge', label: 'Merge', categoryId: 'organize' },
      { path: '/split', label: 'Split', categoryId: 'organize' },
      { path: '/rotate', label: 'Rotate', categoryId: 'organize' },
      { path: '/reorder', label: 'Reorder', categoryId: 'organize' },
      { path: '/delete-pages', label: 'Delete Pages', categoryId: 'organize' },
      { path: '/duplicate-pages', label: 'Duplicate Pages', categoryId: 'organize' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    tools: [
      { path: '/text-overlay', label: 'Text Overlay', categoryId: 'edit' },
      { path: '/highlight', label: 'Highlight', categoryId: 'edit' },
      { path: '/signature', label: 'Signature', categoryId: 'edit' },
      { path: '/stamps', label: 'Stamps', categoryId: 'edit' },
      { path: '/watermarks', label: 'Watermarks', categoryId: 'edit' },
      { path: '/headers-footers', label: 'Headers & Footers', categoryId: 'edit' },
      { path: '/crop', label: 'Crop', categoryId: 'edit' },
      { path: '/letterhead', label: 'Letterhead', categoryId: 'edit' },
      { path: '/form-fill', label: 'Form Fill', categoryId: 'edit' },
    ],
  },
  {
    id: 'convert',
    label: 'Convert',
    tools: [
      { path: '/image-to-pdf', label: 'Image to PDF', categoryId: 'convert' },
      { path: '/pdf-to-image', label: 'PDF to Image', categoryId: 'convert' },
      { path: '/extract-images', label: 'Extract Images', categoryId: 'convert' },
      { path: '/extract-text', label: 'Extract Text', categoryId: 'convert' },
      { path: '/flatten', label: 'Flatten', categoryId: 'convert' },
      { path: '/linearize', label: 'Linearize', categoryId: 'convert' },
    ],
  },
  {
    id: 'protect',
    label: 'Protect',
    tools: [
      { path: '/password-protect', label: 'Password Protect', categoryId: 'protect' },
      { path: '/unlock', label: 'Unlock', categoryId: 'protect' },
      { path: '/redact', label: 'Redact', categoryId: 'protect' },
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    tools: [
      { path: '/compare', label: 'Compare', categoryId: 'analyze' },
      { path: '/bookmarks', label: 'Bookmarks', categoryId: 'analyze' },
      { path: '/metadata', label: 'Metadata', categoryId: 'analyze' },
      { path: '/page-numbers', label: 'Page Numbers', categoryId: 'analyze' },
      { path: '/page-size', label: 'Page Size', categoryId: 'analyze' },
      { path: '/compress', label: 'Compress', categoryId: 'analyze' },
    ],
  },
  {
    id: 'ocr',
    label: 'OCR',
    tools: [
      { path: '/ocr', label: 'OCR Scan', categoryId: 'ocr' },
      { path: '/ocr/searchable-pdf', label: 'Searchable PDF', categoryId: 'ocr' },
    ],
  },
];
