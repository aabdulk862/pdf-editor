import { useCallback, useRef, type KeyboardEvent, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SegmentedControlProps<T extends string> {
  /** Available options to display as segments */
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  /** Currently selected value */
  value: T;
  /** Callback fired when the user selects a different segment */
  onChange: (value: T) => void;
  /** Size variant — controls padding and font size */
  size?: 'sm' | 'md';
  /** Whether the control stretches to fill its container */
  fullWidth?: boolean;
}

// ---------------------------------------------------------------------------
// Size classes (token-based spacing and typography)
// ---------------------------------------------------------------------------

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'text-sm px-3 py-2',
  md: 'text-base px-4 py-2',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SegmentedControl — a radio-group-style toggle that replaces duplicated
 * toggle-button patterns across tool pages.
 *
 * Accessibility:
 * - Container has role="radiogroup"
 * - Each segment has role="radio" with aria-checked
 * - Arrow keys navigate between segments (roving tabindex)
 * - Respects prefers-reduced-motion via Tailwind motion-reduce variants
 *
 * Usage:
 *   <SegmentedControl
 *     options={[
 *       { value: '90', label: '90°' },
 *       { value: '180', label: '180°' },
 *       { value: '270', label: '270°' },
 *     ]}
 *     value={selectedAngle}
 *     onChange={setSelectedAngle}
 *   />
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
}: SegmentedControlProps<T>) {
  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const currentIndex = options.findIndex((opt) => opt.value === value);

  const focusSegment = useCallback(
    (index: number) => {
      const ref = segmentRefs.current[index];
      if (ref) {
        ref.focus();
        onChange(options[index].value);
      }
    },
    [onChange, options],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>) => {
      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % options.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + options.length) % options.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = options.length - 1;
          break;
      }

      if (nextIndex !== null) {
        focusSegment(nextIndex);
      }
    },
    [currentIndex, options.length, focusSegment],
  );

  return (
    <div
      role="radiogroup"
      className={[
        // Container styling with design tokens
        'inline-flex items-center gap-1 rounded-md border p-1',
        'border-secondary-200 bg-secondary-50',
        'dark:border-secondary-700 dark:bg-secondary-800',
        fullWidth ? 'w-full' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            ref={(el) => {
              segmentRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={handleKeyDown}
            className={[
              // Base styles
              'inline-flex items-center justify-center gap-2 rounded-md font-medium',
              'min-w-[44px] min-h-[44px]',
              // Focus ring
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:focus-visible:ring-offset-background-dark',
              // Transition with token-based duration (150ms) and ease-in-out
              'transition-[background-color,box-shadow] duration-normal ease-in-out',
              // Respect reduced motion
              'motion-reduce:transition-none',
              // Size variant
              sizeClasses[size],
              // Full width segments
              fullWidth ? 'flex-1' : '',
              // Active vs inactive states
              isActive
                ? 'bg-white shadow-level-1 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-100'
                : 'bg-transparent text-secondary-600 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {option.icon && (
              <span className="flex-shrink-0" aria-hidden="true">
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

SegmentedControl.displayName = 'SegmentedControl';
