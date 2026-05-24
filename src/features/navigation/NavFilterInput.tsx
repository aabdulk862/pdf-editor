import { useRef } from 'react';

export interface NavFilterInputProps {
  value: string;
  onChange: (query: string) => void;
}

/**
 * Search/filter input for the navigation sidebar.
 *
 * - Placeholder: "Filter tools..."
 * - Search icon (magnifying glass) on the left
 * - Clear button (X) appears when input has value
 * - Minimum 44x44px touch target for input and clear button
 * - Focus-visible ring styling matching existing Input component
 * - Calls onChange on every keystroke (no debounce needed for local filtering)
 */
export function NavFilterInput({ value, onChange }: NavFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex items-center">
      {/* Search icon */}
      <svg
        className="pointer-events-none absolute left-3 h-5 w-5 text-text-muted dark:text-secondary-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M12.5 12.5 17 17" />
      </svg>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter tools..."
        aria-label="Filter tools"
        className={[
          'block w-full min-h-[44px] rounded-md border bg-white pl-10 pr-10 py-2 text-sm',
          'placeholder:text-text-muted text-text-light',
          'border-secondary-300 transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
          'dark:bg-secondary-800 dark:text-text-dark dark:placeholder:text-secondary-400',
          'dark:border-secondary-600 dark:focus-visible:ring-offset-background-dark',
        ].join(' ')}
      />

      {/* Clear button — visible only when input has value */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          aria-label="Clear filter"
          className={[
            'absolute right-1 flex items-center justify-center',
            'min-h-[44px] min-w-[44px] rounded-md',
            'text-text-muted hover:text-text-light',
            'dark:text-secondary-400 dark:hover:text-text-dark',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
            'dark:focus-visible:ring-offset-background-dark',
            'transition-colors duration-150',
          ].join(' ')}
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      )}
    </div>
  );
}
