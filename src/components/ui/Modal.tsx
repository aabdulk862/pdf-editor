import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { Icon } from '../../design-system/primitives/Icon';

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Modal title for the header and aria-labelledby */
  title: string;
  /** Modal content */
  children: ReactNode;
  /** Optional footer content (e.g., action buttons) */
  footer?: ReactNode;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: ModalProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Open/close the dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [open]);

  // Handle Escape key (native dialog handles this, but we sync state)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // Handle click outside (on the backdrop)
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      className={[
        'fixed inset-0 m-auto rounded-lg border-none p-0 shadow-level-4',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'bg-white dark:bg-secondary-800',
        'w-[calc(100vw-32px)] max-h-[calc(100vh-32px)]',
        sizeClasses[size],
        'animate-in fade-in duration-normal motion-reduce:animate-none',
      ].join(' ')}
    >
      <div className="flex flex-col max-h-[inherit] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary-200 px-6 py-4 dark:border-secondary-700 shrink-0">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-text-light dark:text-text-dark"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-secondary-500 transition-colors duration-normal ease-in-out hover:bg-secondary-100 hover:text-secondary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-200"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 text-text-light dark:text-text-dark overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-secondary-200 px-6 py-4 dark:border-secondary-700 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
