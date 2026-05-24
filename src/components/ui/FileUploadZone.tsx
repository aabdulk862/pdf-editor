import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { formatFileSize } from '../../utils/file-size';
import { validateFileType, validateFileSize } from '../../utils/validation';
import { useRecentFilesStore } from '../../store/recent-files';

export interface FileUploadZoneProps {
  /** Accepted MIME types */
  accept?: string[];
  /** Maximum file size in bytes (default: 100MB) */
  maxFileSize?: number;
  /** Maximum number of files (default: 20) */
  maxFiles?: number;
  /** Callback when files pass validation */
  onFilesAccepted: (files: File[]) => void;
  /** Callback when a file is rejected */
  onFileRejected?: (file: File, reason: string) => void;
  /** Allow multiple file selection (default: true) */
  multiple?: boolean;
  /** Operation route for recent files tracking (e.g., "/compress") */
  operationRoute?: string;
  /** Operation display name for recent files tracking (e.g., "Compress") */
  operationName?: string;
}

const DEFAULT_ACCEPT = ['application/pdf', 'image/png', 'image/jpeg'];
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_FILES = 20;

export function FileUploadZone({
  accept = DEFAULT_ACCEPT,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  onFilesAccepted,
  onFileRejected,
  multiple = true,
  operationRoute,
  operationName,
}: FileUploadZoneProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [acceptedFiles, setAcceptedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const validFiles: File[] = [];

      for (const file of files) {
        // Check max files limit
        if (validFiles.length + acceptedFiles.length >= maxFiles) {
          onFileRejected?.(file, `Maximum of ${maxFiles} files allowed.`);
          continue;
        }

        // Validate file type
        const typeResult = validateFileType(file);
        if (!typeResult.valid) {
          // Check against custom accept list if different from default
          const isAccepted = accept.includes(file.type);
          if (!isAccepted) {
            onFileRejected?.(file, typeResult.error ?? 'Unsupported file type.');
            continue;
          }
        }

        // Validate file size
        const sizeResult = validateFileSize(file, maxFileSize);
        if (!sizeResult.valid) {
          onFileRejected?.(file, sizeResult.error ?? 'File exceeds maximum size.');
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const newAccepted = [...acceptedFiles, ...validFiles];
        setAcceptedFiles(newAccepted);
        onFilesAccepted(validFiles);

        // Track recent files if operation info is provided
        if (operationRoute && operationName) {
          const addEntry = useRecentFilesStore.getState().addEntry;
          for (const file of validFiles) {
            addEntry(file, operationRoute, operationName);
          }
        }
      }
    },
    [
      accept,
      acceptedFiles,
      maxFileSize,
      maxFiles,
      onFilesAccepted,
      onFileRejected,
      operationRoute,
      operationName,
    ],
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const { files } = e.dataTransfer;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles],
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { files } = e.target;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input so the same file can be selected again
      e.target.value = '';
    },
    [processFiles],
  );

  const acceptString = accept.join(',');

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files. Drag and drop files here or click to browse."
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={[
          'relative flex min-h-[180px] min-w-[44px] cursor-pointer flex-col items-center justify-center',
          'rounded-lg border-2 border-dashed p-6 transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          'dark:focus-visible:ring-offset-background-dark',
          isDragOver
            ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
            : 'border-secondary-300 bg-secondary-50 hover:border-primary-400 hover:bg-secondary-100 dark:border-secondary-600 dark:bg-secondary-800 dark:hover:border-primary-500 dark:hover:bg-secondary-700',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* Upload icon */}
        <svg
          className={[
            'mb-3 h-10 w-10 transition-colors duration-150',
            isDragOver
              ? 'text-primary-500 dark:text-primary-400'
              : 'text-secondary-400 dark:text-secondary-500',
          ].join(' ')}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>

        {/* Instructions */}
        <p className="mb-1 text-sm font-medium text-secondary-700 dark:text-secondary-200">
          {isDragOver ? (
            'Drop files here'
          ) : (
            <>
              <span className="text-primary-600 dark:text-primary-400">Click to browse</span>
              {' or drag and drop'}
            </>
          )}
        </p>
        <p className="text-xs text-secondary-500 dark:text-secondary-400">
          PDF, PNG, JPG — Max {formatFileSize(maxFileSize)} per file, up to {maxFiles} files
        </p>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Accepted files list */}
      {acceptedFiles.length > 0 && (
        <ul className="mt-3 space-y-2" aria-label="Accepted files">
          {acceptedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-md border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
            >
              <FileIcon type={file.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-secondary-800 dark:text-secondary-100">
                  {file.name}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Small icon indicating file type */
function FileIcon({ type }: { type: string }): JSX.Element {
  const isPdf = type === 'application/pdf';
  const isImage = type.startsWith('image/');

  if (isPdf) {
    return (
      <svg
        className="h-8 w-8 flex-shrink-0 text-error-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    );
  }

  if (isImage) {
    return (
      <svg
        className="h-8 w-8 flex-shrink-0 text-primary-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M2.25 18.75h19.5a.75.75 0 00.75-.75V6a.75.75 0 00-.75-.75H2.25a.75.75 0 00-.75.75v12c0 .414.336.75.75.75z"
        />
      </svg>
    );
  }

  return (
    <svg
      className="h-8 w-8 flex-shrink-0 text-secondary-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

FileUploadZone.displayName = 'FileUploadZone';
