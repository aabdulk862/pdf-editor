/**
 * Navigation category definitions for the categorized sidebar.
 * Defines all tool groups and their routes.
 *
 * Icons are wired separately in icons.tsx (task 13.2).
 */

export interface NavTool {
  path: string;
  label: string;
  description: string;
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
      {
        path: '/merge',
        label: 'Merge',
        description: 'Combine multiple PDFs into one document',
        categoryId: 'organize',
      },
      {
        path: '/split',
        label: 'Split',
        description: 'Split a PDF into multiple documents by page ranges',
        categoryId: 'organize',
      },
      {
        path: '/rotate',
        label: 'Rotate',
        description: 'Rotate pages by 90°, 180°, or 270°',
        categoryId: 'organize',
      },
      {
        path: '/reorder',
        label: 'Reorder',
        description: 'Rearrange pages via drag-and-drop',
        categoryId: 'organize',
      },
      {
        path: '/delete-pages',
        label: 'Delete Pages',
        description: 'Remove unwanted pages from a PDF',
        categoryId: 'organize',
      },
      {
        path: '/duplicate-pages',
        label: 'Duplicate Pages',
        description: 'Create copies of selected pages',
        categoryId: 'organize',
      },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    tools: [
      {
        path: '/text-overlay',
        label: 'Text Overlay',
        description: 'Add custom text annotations to pages',
        categoryId: 'edit',
      },
      {
        path: '/highlight',
        label: 'Highlight',
        description: 'Highlight rectangular areas on pages',
        categoryId: 'edit',
      },
      {
        path: '/signature',
        label: 'Signature',
        description: 'Draw a freehand signature on pages',
        categoryId: 'edit',
      },
      {
        path: '/stamps',
        label: 'Stamps',
        description: 'Add predefined stamps like APPROVED or DRAFT',
        categoryId: 'edit',
      },
      {
        path: '/watermarks',
        label: 'Watermarks',
        description: 'Add text or image watermarks to all pages',
        categoryId: 'edit',
      },
      {
        path: '/headers-footers',
        label: 'Headers & Footers',
        description: 'Add headers and footers with placeholders',
        categoryId: 'edit',
      },
      {
        path: '/crop',
        label: 'Crop',
        description: 'Crop pages to a specific region',
        categoryId: 'edit',
      },
      {
        path: '/letterhead',
        label: 'Letterhead',
        description: 'Apply letterhead templates to pages',
        categoryId: 'edit',
      },
      {
        path: '/form-fill',
        label: 'Form Fill',
        description: 'Fill in PDF form fields',
        categoryId: 'edit',
      },
    ],
  },
  {
    id: 'convert',
    label: 'Convert',
    tools: [
      {
        path: '/image-to-pdf',
        label: 'Image to PDF',
        description: 'Convert PNG or JPG images into a PDF',
        categoryId: 'convert',
      },
      {
        path: '/pdf-to-image',
        label: 'PDF to Image',
        description: 'Convert PDF pages to PNG or JPG images',
        categoryId: 'convert',
      },
      {
        path: '/extract-images',
        label: 'Extract Images',
        description: 'Extract all embedded images from a PDF',
        categoryId: 'convert',
      },
      {
        path: '/extract-text',
        label: 'Extract Text',
        description: 'Extract all text content from a PDF',
        categoryId: 'convert',
      },
      {
        path: '/flatten',
        label: 'Flatten',
        description: 'Merge annotations and form fields into page content',
        categoryId: 'convert',
      },
      {
        path: '/linearize',
        label: 'Linearize',
        description: 'Optimize PDF for fast web viewing',
        categoryId: 'convert',
      },
    ],
  },
  {
    id: 'protect',
    label: 'Protect',
    tools: [
      {
        path: '/password-protect',
        label: 'Password Protect',
        description: 'Encrypt a PDF with a password',
        categoryId: 'protect',
      },
      {
        path: '/unlock',
        label: 'Unlock',
        description: 'Remove password protection from a PDF',
        categoryId: 'protect',
      },
      {
        path: '/redact',
        label: 'Redact',
        description: 'Permanently remove sensitive content',
        categoryId: 'protect',
      },
    ],
  },
  {
    id: 'analyze',
    label: 'Analyze',
    tools: [
      {
        path: '/compare',
        label: 'Compare',
        description: 'Compare two PDFs side by side and find differences',
        categoryId: 'analyze',
      },
      {
        path: '/bookmarks',
        label: 'Bookmarks',
        description: 'Manage PDF bookmarks and table of contents',
        categoryId: 'analyze',
      },
      {
        path: '/metadata',
        label: 'Metadata',
        description: 'View and edit PDF document metadata',
        categoryId: 'analyze',
      },
      {
        path: '/page-numbers',
        label: 'Page Numbers',
        description: 'Add sequential page numbers to your PDF',
        categoryId: 'analyze',
      },
      {
        path: '/page-size',
        label: 'Page Size',
        description: 'Resize pages to standard or custom dimensions',
        categoryId: 'analyze',
      },
      {
        path: '/compress',
        label: 'Compress',
        description: 'Reduce PDF file size for easier sharing',
        categoryId: 'analyze',
      },
    ],
  },
  {
    id: 'ocr',
    label: 'OCR',
    tools: [
      {
        path: '/ocr',
        label: 'OCR Scan',
        description: 'Scan documents to make text searchable',
        categoryId: 'ocr',
      },
      {
        path: '/ocr/searchable-pdf',
        label: 'Searchable PDF',
        description: 'Create a searchable PDF from scanned pages',
        categoryId: 'ocr',
      },
    ],
  },
  {
    id: 'design',
    label: 'Design',
    tools: [
      {
        path: '/canvas-editor',
        label: 'Canvas Editor',
        description: 'Design and edit PDF pages on a visual canvas',
        categoryId: 'design',
      },
    ],
  },
];
