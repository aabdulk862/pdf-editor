import { useCallback, useRef, useState } from 'react';
import { formatFileSize } from '@/utils/file-size';
import type { MergeFile } from '../hooks/useMerge';

export interface MergeFileListProps {
  files: MergeFile[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemove: (id: string) => void;
}

/**
 * Drag-and-drop reorderable file list for the Merge feature.
 * Displays file name, size, and order number with drag handles.
 * Supports both mouse and touch drag-and-drop.
 */
export function MergeFileList({ files, onReorder, onRemove }: MergeFileListProps): JSX.Element {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLIElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLIElement>, toIndex: number) => {
      e.preventDefault();
      const fromIndex = dragItemRef.current;
      if (fromIndex !== null && fromIndex !== toIndex) {
        onReorder(fromIndex, toIndex);
      }
      setDragIndex(null);
      setDropIndex(null);
      dragItemRef.current = null;
    },
    [onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDropIndex(null);
    dragItemRef.current = null;
  }, []);

  // Keyboard reorder support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>, index: number) => {
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        onReorder(index, index - 1);
      } else if (e.key === 'ArrowDown' && index < files.length - 1) {
        e.preventDefault();
        onReorder(index, index + 1);
      }
    },
    [files.length, onReorder],
  );

  if (files.length === 0) {
    return <></>;
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
          Files to merge ({files.length})
        </h2>
        <p className="text-xs text-secondary-500 dark:text-secondary-400">Drag to reorder</p>
      </div>
      <ul className="space-y-1" role="list" aria-label="Files to merge, drag to reorder">
        {files.map((file, index) => (
          <li
            key={file.id}
            draggable
            tabIndex={0}
            role="listitem"
            aria-label={`File ${index + 1}: ${file.name}, ${formatFileSize(file.size)}. Use arrow keys to reorder.`}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={[
              'flex items-center gap-3 rounded-md border px-3 py-2 transition-all duration-normal ease-in-out cursor-grab active:cursor-grabbing',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              dragIndex === index
                ? 'opacity-50 border-primary-300 dark:border-primary-600'
                : 'border-secondary-200 dark:border-secondary-700',
              dropIndex === index && dragIndex !== index
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                : 'bg-white dark:bg-secondary-800',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {/* Drag handle */}
            <span
              className="flex-shrink-0 text-secondary-400 dark:text-secondary-500"
              aria-hidden="true"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </span>

            {/* Order number */}
            <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs font-medium">
              {index + 1}
            </span>

            {/* File info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-secondary-800 dark:text-secondary-100">
                {file.name}
              </p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {formatFileSize(file.size)}
              </p>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(file.id);
              }}
              className="flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-secondary-400 hover:text-error-500 hover:bg-error-50 dark:hover:text-error-400 dark:hover:bg-error-900/20 transition-colors duration-normal ease-in-out"
              aria-label={`Remove ${file.name}`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
