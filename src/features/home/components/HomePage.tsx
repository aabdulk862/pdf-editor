import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RecentFilesSection } from '../../recent-files/RecentFilesSection';
import { TemplateSection } from '../../templates/TemplateSection';
import { WelcomeBanner } from '../../onboarding';
import { QuickActions } from './QuickActions';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { usePageEnter } from '../../../hooks/usePageEnter';
import { validateFileSize } from '../../../utils/validation';
import { useRecentFilesStore } from '../../../store/recent-files';

interface ToolCardData {
  path: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'organize' | 'convert' | 'annotate' | 'security' | 'extract' | 'advanced';
}

const categoryLabels: Record<ToolCardData['category'], string> = {
  organize: 'Organize Pages',
  convert: 'Convert & Optimize',
  annotate: 'Annotate & Mark',
  security: 'Security',
  extract: 'Extract Content',
  advanced: 'Advanced',
};

const tools: ToolCardData[] = [
  // Organize Pages
  {
    path: '/merge',
    name: 'Merge',
    description: 'Combine multiple PDFs into one document',
    category: 'organize',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    path: '/split',
    name: 'Split',
    description: 'Split a PDF into multiple documents by page ranges',
    category: 'organize',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 7h12M8 12h12m-12 5h12M4 7h.01M4 12h.01M4 17h.01"
        />
      </svg>
    ),
  },
  {
    path: '/rotate',
    name: 'Rotate',
    description: 'Rotate pages by 90°, 180°, or 270°',
    category: 'organize',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  {
    path: '/delete-pages',
    name: 'Delete Pages',
    description: 'Remove unwanted pages from a PDF',
    category: 'organize',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    ),
  },
  {
    path: '/reorder',
    name: 'Reorder',
    description: 'Rearrange pages via drag-and-drop',
    category: 'organize',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
        />
      </svg>
    ),
  },
  {
    path: '/duplicate-pages',
    name: 'Duplicate Pages',
    description: 'Create copies of selected pages',
    category: 'organize',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  // Convert & Optimize
  {
    path: '/compress',
    name: 'Compress',
    description: 'Reduce PDF file size for easier sharing',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    ),
  },
  {
    path: '/image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert PNG or JPG images into a PDF',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    path: '/pdf-to-image',
    name: 'PDF to Image',
    description: 'Convert PDF pages to PNG or JPG images',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    path: '/flatten',
    name: 'Flatten',
    description: 'Merge annotations and form fields into page content',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
        />
      </svg>
    ),
  },
  {
    path: '/linearize',
    name: 'Linearize',
    description: 'Optimize PDF for fast web viewing',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    path: '/crop',
    name: 'Crop',
    description: 'Crop pages to a specific region',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      </svg>
    ),
  },
  {
    path: '/page-size',
    name: 'Page Size',
    description: 'Resize pages to standard or custom dimensions',
    category: 'convert',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
      </svg>
    ),
  },
  // Annotate & Mark
  {
    path: '/page-numbers',
    name: 'Page Numbers',
    description: 'Add sequential page numbers to your PDF',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
        />
      </svg>
    ),
  },
  {
    path: '/text-overlay',
    name: 'Text Overlay',
    description: 'Add custom text annotations to pages',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    path: '/highlight',
    name: 'Highlight',
    description: 'Highlight rectangular areas on pages',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    path: '/signature',
    name: 'Signature',
    description: 'Draw a freehand signature on pages',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  {
    path: '/stamps',
    name: 'Stamps',
    description: 'Add predefined stamps like APPROVED or DRAFT',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        />
      </svg>
    ),
  },
  {
    path: '/watermarks',
    name: 'Watermarks',
    description: 'Add text or image watermarks to all pages',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
        />
      </svg>
    ),
  },
  {
    path: '/headers-footers',
    name: 'Headers & Footers',
    description: 'Add headers and footers with placeholders',
    category: 'annotate',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  // Security
  {
    path: '/password-protect',
    name: 'Password Protect',
    description: 'Encrypt a PDF with a password',
    category: 'security',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  {
    path: '/unlock',
    name: 'Unlock',
    description: 'Remove password protection from a PDF',
    category: 'security',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    path: '/redact',
    name: 'Redact',
    description: 'Permanently remove sensitive content',
    category: 'security',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    ),
  },
  // Extract Content
  {
    path: '/extract-images',
    name: 'Extract Images',
    description: 'Extract all embedded images from a PDF',
    category: 'extract',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    path: '/extract-text',
    name: 'Extract Text',
    description: 'Extract all text content from a PDF',
    category: 'extract',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  // Advanced
  {
    path: '/metadata',
    name: 'Metadata',
    description: 'View and edit PDF document metadata',
    category: 'advanced',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    path: '/form-fill',
    name: 'Form Fill',
    description: 'Fill in PDF form fields',
    category: 'advanced',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  },
  {
    path: '/compare',
    name: 'Compare',
    description: 'Compare two PDFs side by side and find differences',
    category: 'advanced',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    path: '/bookmarks',
    name: 'Bookmarks',
    description: 'Manage PDF bookmarks and table of contents',
    category: 'advanced',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    ),
  },
];

const categoryOrder: ToolCardData['category'][] = [
  'organize',
  'convert',
  'annotate',
  'security',
  'extract',
  'advanced',
];

/**
 * Home page component displaying all 28 PDF operations as navigable cards.
 * Cards are grouped by category and displayed in a responsive grid layout.
 * Features a prominent hero Drop Zone for quick file upload.
 *
 * Requirements: 4.1, 4.2, 4.3, 5.1, 30.1, 30.2
 */
export function HomePage() {
  const { style: pageEnterStyle } = usePageEnter();
  const groupedTools = categoryOrder.map((category) => ({
    category,
    label: categoryLabels[category],
    items: tools.filter((t) => t.category === category),
  }));

  return (
    <div className="space-y-8" style={pageEnterStyle}>
      {/* Welcome banner for first-time visitors */}
      <WelcomeBanner />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          PDF Editor
        </h1>
        <p className="mt-2 text-secondary-500 dark:text-secondary-400">
          Select a tool to get started. All processing happens in your browser — your files never
          leave your device.
        </p>
      </div>

      {/* Hero Drop Zone */}
      <HeroDropZone />

      {/* Quick Actions — top 4 most-used tools */}
      <QuickActions />

      <RecentFilesSection />

      <TemplateSection />

      {groupedTools.map(({ category, label, items }) => (
        <section key={category} aria-labelledby={`category-${category}`}>
          <h2
            id={`category-${category}`}
            className="text-lg font-semibold text-text-light dark:text-text-dark mb-3"
          >
            {label}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((tool) => (
              <Link
                key={tool.path}
                to={tool.path}
                className={[
                  'group flex items-start gap-3 p-4 rounded-lg border border-secondary-200 dark:border-secondary-700',
                  'bg-white dark:bg-secondary-800 shadow-level-1',
                  // Hover: elevation + border highlight
                  'hover:border-primary-300 dark:hover:border-primary-600',
                  'hover:shadow-level-2 hover:-translate-y-0.5',
                  // Click: brief scale press animation (100ms)
                  'active:scale-[0.97]',
                  // Transition: 150ms ease-out for hover, 100ms for active press
                  'transition-all duration-normal ease-out active:duration-fast active:ease-in-out',
                  // Reduced motion: disable transforms, keep color/shadow transitions
                  'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 motion-reduce:transition-colors motion-reduce:transform-none',
                  // Touch target
                  'min-h-[44px]',
                ].join(' ')}
              >
                <div className="flex-shrink-0 p-2 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors duration-normal ease-out">
                  <span className="block h-6 w-6 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.5]">
                    {tool.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-text-light dark:text-text-dark group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-normal ease-out">
                    {tool.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-secondary-500 dark:text-secondary-400 line-clamp-2">
                    {tool.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero Drop Zone Component
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Prominent hero drop zone for the home page.
 * Displays an animated dashed border on drag-over, a large upload icon,
 * instructional text, supported formats, and a browse button.
 *
 * Requirements: 4.1 (drag-over highlight within 100ms), 4.2 (begin processing on valid drop),
 * 4.3 (inline error for unsupported types), 5.1 (prominent Drop_Zone)
 */
function HeroDropZone() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const handleFileDrop = useCallback(
    (files: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(files);

      if (fileArray.length === 0) return;

      const file = fileArray[0];

      // Validate file type — only PDF accepted from hero zone
      if (file.type !== 'application/pdf') {
        setError('Unsupported file type. Please upload a PDF file (application/pdf).');
        return;
      }

      // Validate file size
      const sizeResult = validateFileSize(file, MAX_FILE_SIZE);
      if (!sizeResult.valid) {
        setError(sizeResult.error ?? 'File exceeds maximum size of 100MB.');
        return;
      }

      // Track recent file
      const addEntry = useRecentFilesStore.getState().addEntry;
      addEntry(file, '/merge', 'Upload');

      // Navigate to merge tool with the file (most common starting point)
      // Store file in sessionStorage for the target page to pick up
      const reader = new FileReader();
      reader.onload = () => {
        try {
          sessionStorage.setItem(
            'pdf-editor-home-upload',
            JSON.stringify({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
            }),
          );
          // Navigate to merge as the default tool for uploaded PDFs
          navigate('/merge');
        } catch {
          // If sessionStorage fails, still navigate
          navigate('/merge');
        }
      };
      reader.onerror = () => {
        navigate('/merge');
      };
      reader.readAsArrayBuffer(file.slice(0, 1)); // Minimal read to trigger onload
    },
    [navigate],
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
      setError(null);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const { files } = e.dataTransfer;
      if (files.length > 0) {
        handleFileDrop(files);
      }
    },
    [handleFileDrop],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        handleFileDrop(files);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [handleFileDrop],
  );

  return (
    <section aria-labelledby="hero-drop-zone-heading">
      <h2 id="hero-drop-zone-heading" className="sr-only">
        Upload PDF
      </h2>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF file. Drag and drop a PDF here or click to browse."
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={[
          // Base styles
          'relative flex flex-col items-center justify-center cursor-pointer',
          'rounded-xl border-2 border-dashed p-8 sm:p-12',
          'min-h-[220px] sm:min-h-[260px]',
          // Focus ring
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-secondary-900',
          // Transition — 100ms (duration-fast) for drag-over response per Requirement 4.1
          !prefersReducedMotion && 'transition-all duration-fast ease-out',
          prefersReducedMotion && 'transition-colors duration-fast',
          // Motion-safe scale on drag-over
          !prefersReducedMotion && isDragOver && 'scale-[1.01]',
          // Drag-over state
          isDragOver
            ? 'border-primary-500 bg-primary-50/80 dark:border-primary-400 dark:bg-primary-900/30 shadow-level-2'
            : 'border-secondary-300 bg-secondary-50/50 hover:border-primary-400 hover:bg-secondary-100/80 dark:border-secondary-600 dark:bg-secondary-800/50 dark:hover:border-primary-500 dark:hover:bg-secondary-700/50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Large upload icon — 48px for prominence */}
        <div
          className={[
            'mb-4 rounded-full p-4',
            'transition-colors duration-fast ease-out',
            isDragOver
              ? 'bg-primary-100 dark:bg-primary-800/40'
              : 'bg-secondary-100 dark:bg-secondary-700/50',
          ].join(' ')}
        >
          <svg
            className={[
              'h-12 w-12 transition-colors duration-fast ease-out',
              isDragOver
                ? 'text-primary-600 dark:text-primary-300'
                : 'text-secondary-400 dark:text-secondary-500',
            ].join(' ')}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        {/* Instructional text */}
        <p className="mb-1 text-lg font-semibold text-secondary-800 dark:text-secondary-100">
          {isDragOver ? 'Drop your PDF here' : 'Drop your PDF here to get started'}
        </p>
        <p className="mb-4 text-sm text-secondary-500 dark:text-secondary-400">
          or click to browse files
        </p>

        {/* Browse button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          className={[
            'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg',
            'text-sm font-medium',
            'bg-primary-600 text-white hover:bg-primary-700',
            'dark:bg-primary-500 dark:hover:bg-primary-600',
            'active:scale-[0.97] transition-all duration-fast ease-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-offset-secondary-900',
            'min-h-[44px] min-w-[44px]',
          ].join(' ')}
        >
          <svg
            className="h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          Browse files
        </button>

        {/* Supported formats text */}
        <p className="mt-4 text-xs text-secondary-400 dark:text-secondary-500">
          Supports PDF files up to 100MB
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Inline error message for unsupported file types (Requirement 4.3) */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 px-4 py-3 dark:border-error-800 dark:bg-error-900/30"
        >
          <svg
            className="h-5 w-5 flex-shrink-0 text-error-500 dark:text-error-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <p className="text-sm text-error-700 dark:text-error-300">{error}</p>
        </div>
      )}
    </section>
  );
}
