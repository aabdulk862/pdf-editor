import type { FC, ReactNode } from 'react';
import type { NavCategory } from './categories';

export interface NavCategoryGroupProps {
  /** Category metadata (id and label) */
  category: Pick<NavCategory, 'id' | 'label'>;
  /** Category icon component rendered at 20x20px */
  icon: FC<{ className?: string }>;
  /** Whether the category is currently collapsed */
  isCollapsed: boolean;
  /** Callback to toggle collapsed state */
  onToggle: () => void;
  /** Tool links rendered inside the collapsible section */
  children: ReactNode;
}

/**
 * Collapsible category section for the navigation sidebar.
 * Displays a clickable header with a chevron toggle, category icon, and label.
 * Children are hidden when collapsed with an animated height transition.
 *
 * Requirement 14.6: Collapsible category groups with chevron toggle and persisted state.
 */
export function NavCategoryGroup({
  category,
  icon: Icon,
  isCollapsed,
  onToggle,
  children,
}: NavCategoryGroupProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-controls={`nav-category-${category.id}`}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-secondary-700 hover:bg-secondary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-200 dark:hover:bg-secondary-800"
      >
        {/* Chevron — rotates 90° when expanded, 0° when collapsed */}
        <svg
          width={16}
          height={16}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={[
            'shrink-0 transition-transform duration-200 motion-reduce:transition-none',
            isCollapsed ? 'rotate-0' : 'rotate-90',
          ].join(' ')}
        >
          <path d="M6 4l4 4-4 4" />
        </svg>

        {/* Category icon at 20x20px */}
        <Icon className="h-5 w-5 shrink-0" />

        {/* Category label */}
        <span className="truncate">{category.label}</span>
      </button>

      {/* Collapsible children section */}
      <div
        id={`nav-category-${category.id}`}
        role="group"
        aria-label={category.label}
        className={[
          'overflow-hidden transition-all duration-200 motion-reduce:transition-none',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100',
        ].join(' ')}
      >
        <div className="ml-2 mt-0.5">{children}</div>
      </div>
    </div>
  );
}
