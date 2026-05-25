import { Link } from 'react-router-dom';
import { useNavStore } from '../../navigation/store/nav-store';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

/**
 * Tool metadata for Quick Actions display.
 */
interface QuickActionTool {
  path: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * Default popular tools shown when no usage data exists.
 * These represent the most commonly needed PDF operations.
 */
const DEFAULT_QUICK_ACTIONS: QuickActionTool[] = [
  {
    path: '/merge',
    name: 'Merge',
    description: 'Combine multiple PDFs into one document',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
    path: '/compress',
    name: 'Compress',
    description: 'Reduce PDF file size for easier sharing',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
    path: '/split',
    name: 'Split',
    description: 'Split a PDF into multiple documents',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
    path: '/image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert PNG or JPG images into a PDF',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
];

/**
 * Complete tool registry mapping paths to display data.
 * Used to look up tool info when computing quick actions from usage counts.
 */
const TOOL_REGISTRY: Record<string, QuickActionTool> = {
  '/merge': DEFAULT_QUICK_ACTIONS[0],
  '/compress': DEFAULT_QUICK_ACTIONS[1],
  '/split': DEFAULT_QUICK_ACTIONS[2],
  '/image-to-pdf': DEFAULT_QUICK_ACTIONS[3],
  '/rotate': {
    path: '/rotate',
    name: 'Rotate',
    description: 'Rotate pages by 90°, 180°, or 270°',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/delete-pages': {
    path: '/delete-pages',
    name: 'Delete Pages',
    description: 'Remove unwanted pages from a PDF',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/reorder': {
    path: '/reorder',
    name: 'Reorder',
    description: 'Rearrange pages via drag-and-drop',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/pdf-to-image': {
    path: '/pdf-to-image',
    name: 'PDF to Image',
    description: 'Convert PDF pages to PNG or JPG images',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/watermarks': {
    path: '/watermarks',
    name: 'Watermarks',
    description: 'Add text or image watermarks to all pages',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/password-protect': {
    path: '/password-protect',
    name: 'Password Protect',
    description: 'Encrypt a PDF with a password',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/extract-text': {
    path: '/extract-text',
    name: 'Extract Text',
    description: 'Extract all text content from a PDF',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/page-numbers': {
    path: '/page-numbers',
    name: 'Page Numbers',
    description: 'Add sequential page numbers to your PDF',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
  '/crop': {
    path: '/crop',
    name: 'Crop',
    description: 'Crop pages to a specific region',
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-7 w-7"
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
};

/**
 * Computes the top N most-used tools from usage counts.
 * Falls back to default popular tools when no usage data exists.
 *
 * @param usageCounts - Record mapping tool paths to usage counts
 * @param count - Number of top tools to return
 * @returns Array of QuickActionTool objects
 */
export function getQuickActionTools(
  usageCounts: Record<string, number>,
  count: number = 4,
): QuickActionTool[] {
  const entries = Object.entries(usageCounts).filter(([, c]) => c > 0);

  if (entries.length === 0) {
    return DEFAULT_QUICK_ACTIONS.slice(0, count);
  }

  const sorted = entries.sort(([, a], [, b]) => b - a).slice(0, count);

  const result: QuickActionTool[] = [];
  for (const [path] of sorted) {
    const tool = TOOL_REGISTRY[path];
    if (tool) {
      result.push(tool);
    }
  }

  // If we don't have enough tools from usage data, fill with defaults
  if (result.length < count) {
    const usedPaths = new Set(result.map((t) => t.path));
    for (const defaultTool of DEFAULT_QUICK_ACTIONS) {
      if (result.length >= count) break;
      if (!usedPaths.has(defaultTool.path)) {
        result.push(defaultTool);
      }
    }
  }

  return result;
}

/**
 * Quick Actions row displaying the 4 most frequently used tools as larger,
 * prominent cards. Computed from usage frequency tracked in the nav store.
 * Falls back to a default set of popular tools when no usage data exists.
 *
 * Requirements: 5.5
 */
export function QuickActions() {
  const usageCounts = useNavStore((s) => s.usageCounts);
  const prefersReducedMotion = useReducedMotion();

  const quickTools = getQuickActionTools(usageCounts, 4);

  return (
    <section aria-labelledby="quick-actions-heading">
      <h2
        id="quick-actions-heading"
        className="text-lg font-semibold text-text-light dark:text-text-dark mb-3"
      >
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickTools.map((tool) => (
          <Link
            key={tool.path}
            to={tool.path}
            className={[
              'group flex flex-col items-center gap-3 p-6 rounded-xl',
              'border border-secondary-200 dark:border-secondary-700',
              'bg-white dark:bg-secondary-800',
              'hover:border-primary-400 dark:hover:border-primary-500',
              // Click: brief scale press animation (100ms)
              'active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-secondary-900',
              'min-h-[44px]',
              !prefersReducedMotion &&
                'transition-all duration-normal ease-out active:duration-fast active:ease-in-out hover:-translate-y-0.5 hover:shadow-level-2',
              prefersReducedMotion && 'transition-colors duration-normal transform-none',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <div
              className={[
                'flex items-center justify-center w-12 h-12 rounded-lg',
                'bg-primary-50 dark:bg-primary-900/30',
                'text-primary-600 dark:text-primary-400',
                'group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50',
                'transition-colors duration-normal ease-out',
              ].join(' ')}
            >
              {tool.icon}
            </div>
            <div className="text-center min-w-0">
              <h3 className="text-sm font-medium text-text-light dark:text-text-dark group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors duration-normal">
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
  );
}
