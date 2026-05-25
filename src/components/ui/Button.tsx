import { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Show loading spinner and disable interaction */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500 dark:bg-primary-500 dark:hover:bg-primary-600',
  secondary:
    'bg-secondary-100 text-secondary-800 hover:bg-secondary-200 focus-visible:ring-secondary-500 dark:bg-secondary-700 dark:text-secondary-100 dark:hover:bg-secondary-600',
  outline:
    'border border-secondary-300 text-secondary-700 hover:bg-secondary-50 focus-visible:ring-primary-500 dark:border-secondary-600 dark:text-secondary-200 dark:hover:bg-secondary-800',
  ghost:
    'text-secondary-700 hover:bg-secondary-100 focus-visible:ring-primary-500 dark:text-secondary-200 dark:hover:bg-secondary-800',
  danger:
    'bg-error-600 text-white hover:bg-error-700 focus-visible:ring-error-500 dark:bg-error-500 dark:hover:bg-error-600',
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm',
  md: 'min-h-[44px] min-w-[44px] px-4 py-2.5 text-base',
  lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={[
          // Base layout & typography
          'inline-flex items-center justify-center gap-2 rounded-md font-medium',
          // Transitions: colors + transform with token-based duration and easing
          'transition-[color,background-color,border-color,transform] duration-fast ease-in-out',
          // Press animation (scale down on active)
          'active:scale-[0.97]',
          // Respect prefers-reduced-motion
          'motion-reduce:transform-none motion-reduce:transition-none',
          // Focus ring
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-background-dark',
          // Variant-specific colors
          variantClasses[variant],
          // Size-specific spacing
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          isDisabled ? 'cursor-not-allowed opacity-50 active:scale-100' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin motion-reduce:animate-none"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
