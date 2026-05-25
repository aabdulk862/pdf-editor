import { type ReactNode } from 'react';

import { Button } from '../../components/ui/Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Optional icon or illustration to display above the title */
  icon?: ReactNode;
  /** Main heading text (e.g., "No recent files") */
  title: string;
  /** Optional supporting description text */
  description?: string;
  /** Optional call-to-action button */
  action?: { label: string; onClick: () => void };
  /** Heading level for the title (defaults to 2 for proper hierarchy under page h1) */
  headingLevel?: 2 | 3 | 4;
}

// ---------------------------------------------------------------------------
// Illustration: Document with Plus
//
// A simple SVG illustration using primary color palette tokens.
// Shows a document outline with a "+" symbol, conveying "add/upload a file".
// ---------------------------------------------------------------------------

/**
 * Default illustration for the "no recent files" empty state.
 * Uses primary-100 (fill) and primary-500 (stroke) from the design token palette.
 */
export function NoRecentFilesIllustration() {
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-primary-500"
    >
      {/* Document body */}
      <rect
        x="20"
        y="10"
        width="40"
        height="52"
        rx="4"
        className="fill-primary-100 stroke-primary-500 dark:fill-primary-900/30 dark:stroke-primary-400"
        strokeWidth="2"
      />
      {/* Folded corner */}
      <path
        d="M48 10v10a2 2 0 002 2h10"
        className="stroke-primary-500 dark:stroke-primary-400"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Plus sign - vertical */}
      <line
        x1="40"
        y1="32"
        x2="40"
        y2="48"
        className="stroke-primary-500 dark:stroke-primary-400"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Plus sign - horizontal */}
      <line
        x1="32"
        y1="40"
        x2="48"
        y2="40"
        className="stroke-primary-500 dark:stroke-primary-400"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Decorative dots */}
      <circle cx="30" cy="70" r="2" className="fill-primary-200 dark:fill-primary-800" />
      <circle cx="40" cy="72" r="1.5" className="fill-primary-300 dark:fill-primary-700" />
      <circle cx="50" cy="70" r="2" className="fill-primary-200 dark:fill-primary-800" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * EmptyState — A reusable component for displaying placeholder content when
 * there is no data to show (e.g., no recent files, no search results).
 *
 * Features:
 * - Optional icon/illustration (uses primary color palette)
 * - Title text
 * - Optional description
 * - Optional CTA button
 * - Centered layout with generous padding
 * - Uses design tokens for all styling
 *
 * Usage:
 *   <EmptyState
 *     icon={<NoRecentFilesIllustration />}
 *     title="No recent files"
 *     description="Upload a PDF to get started"
 *     action={{ label: "Upload PDF", onClick: handleUpload }}
 *   />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const HeadingTag = `h${headingLevel}` as const;
  return (
    <div
      data-testid="empty-state"
      className="flex flex-col items-center justify-center px-6 py-12 text-center"
    >
      {icon && (
        <div className="mb-4" data-testid="empty-state-icon">
          {icon}
        </div>
      )}

      <HeadingTag
        className="text-lg font-semibold text-secondary-800 dark:text-secondary-100"
        data-testid="empty-state-title"
      >
        {title}
      </HeadingTag>

      {description && (
        <p
          className="mt-2 max-w-sm text-sm text-secondary-500 dark:text-secondary-400"
          data-testid="empty-state-description"
        >
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6" data-testid="empty-state-action">
          <Button variant="primary" size="md" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
