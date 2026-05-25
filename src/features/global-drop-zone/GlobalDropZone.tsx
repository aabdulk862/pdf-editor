import { useCallback, useRef, type DragEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useDropZoneStore } from '../../store/drop-zone';
import { useToastStore } from '../../store/toast';
import { useCommandPaletteStore } from '../../store/command-palette';
import { ACCEPTED_TYPES, MAX_FILES_PER_DROP, validateDroppedFiles } from './validation';

export interface GlobalDropZoneProps {
  children: ReactNode;
  /** Callback invoked with valid files when dropped on an operation page */
  onFilesDropped?: (files: File[]) => void;
}

/**
 * Checks whether a DataTransfer contains at least one file with a valid MIME type.
 * During dragenter/dragover, file content isn't accessible but types/items are.
 */
function hasValidFileType(dataTransfer: DataTransfer): boolean {
  // Check items if available (modern browsers)
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i];
      if (item.kind === 'file') {
        if (ACCEPTED_TYPES.includes(item.type as (typeof ACCEPTED_TYPES)[number])) {
          return true;
        }
      }
    }
    return false;
  }

  // Fallback: if types includes 'Files', we can't determine validity during drag
  if (dataTransfer.types.includes('Files')) {
    return true;
  }

  return false;
}

/**
 * GlobalDropZone wraps the entire application viewport and provides
 * drag-and-drop file handling anywhere in the window.
 *
 * - Shows a full-screen overlay within 100ms when files are dragged over
 * - Distinguishes valid/invalid file types visually (green vs red tint)
 * - On drop (operation page): passes valid files to onFilesDropped callback
 * - On drop (home page): opens command palette pre-filtered for PDF operations
 * - Shows error toasts for unsupported types, oversized files, truncation warnings
 * - Hides overlay when drag leaves the viewport
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 */
export function GlobalDropZone({ children, onFilesDropped }: GlobalDropZoneProps) {
  const location = useLocation();
  const dragCounterRef = useRef(0);

  const { isDragging, isValidType, setDragging } = useDropZoneStore();
  const addToast = useToastStore((state) => state.addToast);
  const openPalette = useCommandPaletteStore((state) => state.open);
  const setPaletteQuery = useCommandPaletteStore((state) => state.setQuery);

  const isHomePage = location.pathname === '/';

  const handleDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;

      if (dragCounterRef.current === 1) {
        const isValid = hasValidFileType(e.dataTransfer);
        setDragging(true, isValid);
      }
    },
    [setDragging],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Set dropEffect to indicate the drop is allowed
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current -= 1;

      if (dragCounterRef.current === 0) {
        setDragging(false, false);
      }
    },
    [setDragging],
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setDragging(false, false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length === 0) return;

      // Show truncation warning if more than MAX_FILES_PER_DROP files
      if (droppedFiles.length > MAX_FILES_PER_DROP) {
        addToast(
          `Only the first ${MAX_FILES_PER_DROP} files will be processed. ${droppedFiles.length - MAX_FILES_PER_DROP} file(s) were ignored.`,
          'warning',
        );
      }

      // Validate all dropped files
      const results = validateDroppedFiles(droppedFiles);
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.valid) {
          validFiles.push(result.file);
        } else {
          errors.push(`${result.file.name}: ${result.reason}`);
        }
      }

      // Show error toasts for invalid files
      for (const error of errors) {
        addToast(error, 'error');
      }

      if (validFiles.length === 0) return;

      if (isHomePage) {
        // On home page: open command palette pre-filtered to show PDF operations
        openPalette();
        setPaletteQuery('pdf');
      } else {
        // On operation page: pass files to the handler
        if (onFilesDropped) {
          onFilesDropped(validFiles);
        }
      }
    },
    [setDragging, addToast, isHomePage, openPalette, setPaletteQuery, onFilesDropped],
  );

  return (
    <div
      className="relative min-h-screen"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Full-screen overlay */}
      {isDragging && (
        <div
          className={[
            'fixed inset-0 z-[9999] flex items-center justify-center',
            'transition-opacity duration-fast ease-in-out',
            'pointer-events-none',
            isValidType
              ? 'bg-success-500/20 border-4 border-dashed border-success-500 dark:bg-success-400/15 dark:border-success-400'
              : 'bg-error-500/20 border-4 border-dashed border-error-500 dark:bg-error-400/15 dark:border-error-400',
          ].join(' ')}
          aria-live="polite"
          role="status"
        >
          <div
            className={[
              'flex flex-col items-center gap-3 rounded-xl px-8 py-6',
              'backdrop-blur-sm',
              isValidType
                ? 'bg-success-50/90 text-success-800 dark:bg-success-900/80 dark:text-success-200'
                : 'bg-error-50/90 text-error-800 dark:bg-error-900/80 dark:text-error-200',
            ].join(' ')}
          >
            {/* Drop icon */}
            <svg
              className={[
                'h-12 w-12',
                isValidType
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-error-600 dark:text-error-400',
              ].join(' ')}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              {isValidType ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              )}
            </svg>

            {/* Status text */}
            <p className="text-lg font-semibold">
              {isValidType ? 'Drop files here' : 'File type not supported'}
            </p>
            <p className="text-sm opacity-75">
              {isValidType
                ? 'PDF, PNG, and JPEG files accepted'
                : 'Only PDF, PNG, and JPEG files are supported'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

GlobalDropZone.displayName = 'GlobalDropZone';
