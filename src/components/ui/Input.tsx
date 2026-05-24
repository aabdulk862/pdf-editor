import { type InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input label text */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text below the input */
  helperText?: string;
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Full width input */
  fullWidth?: boolean;
}

const sizeClasses: Record<NonNullable<InputProps['size']>, string> = {
  sm: 'min-h-[44px] px-3 py-2 text-sm',
  md: 'min-h-[44px] px-4 py-2.5 text-base',
  lg: 'min-h-[48px] px-4 py-3 text-lg',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      size = 'md',
      fullWidth = false,
      className = '',
      id: externalId,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = externalId || generatedId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText ? `${inputId}-helper` : undefined;

    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-text-light dark:text-text-dark"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={[
            'block rounded-md border bg-white transition-colors duration-150',
            'placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-offset-1',
            'dark:bg-secondary-800 dark:text-text-dark dark:placeholder:text-secondary-400',
            sizeClasses[size],
            fullWidth ? 'w-full' : '',
            error
              ? 'border-error-500 focus:ring-error-500 dark:border-error-400'
              : 'border-secondary-300 focus:ring-primary-500 dark:border-secondary-600',
            disabled ? 'cursor-not-allowed opacity-50' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-sm text-error-600 dark:text-error-400"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={helperId} className="mt-1.5 text-sm text-text-muted dark:text-secondary-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
