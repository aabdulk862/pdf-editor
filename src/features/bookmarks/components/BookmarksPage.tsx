import { useCallback, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { validateBookmarkTitle } from '@/utils/validation';
import type { Bookmark } from '@/types/pdf';

/**
 * BookmarksPage component - Allows users to view, add, edit, and remove
 * bookmarks (outline entries) in a PDF document.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Display existing bookmark tree up to 5 levels deep
 * - Add new bookmarks with title (1-200 chars) and target page number
 * - Nest bookmarks under existing parent entries
 * - Rename or delete existing bookmarks
 * - Save updated bookmark tree via PDF Engine (setBookmarks)
 * - Show empty state prompt if no bookmarks exist
 *
 * Requirements: 43.1, 43.2, 43.3, 43.4, 43.5, 43.6, 43.7
 */

let bookmarkIdCounter = 0;
function generateBookmarkId(): string {
  bookmarkIdCounter += 1;
  return `bm-${Date.now()}-${bookmarkIdCounter}`;
}

export function BookmarksPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [pageCount, setPageCount] = useState<number>(0);

  // Bookmark tree state
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Add bookmark form state
  const [newTitle, setNewTitle] = useState('');
  const [newPage, setNewPage] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [titleError, setTitleError] = useState<string | undefined>();
  const [pageError, setPageError] = useState<string | undefined>();

  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState<string | undefined>();

  // Operation state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<ArrayBuffer | null>(null);

  // Handle file upload
  const handleFilesAccepted = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        setFileName(file.name);
        setSavedData(null);
        setIsLoading(true);

        try {
          const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
          const existingBookmarks = await client.getBookmarks(data);
          setBookmarks(existingBookmarks);

          // Get page count from the PDF
          const pdfDoc = await PDFDocument.load(data);
          setPageCount(pdfDoc.getPageCount());
        } catch {
          toast.error('Failed to read PDF bookmarks.');
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read the file.');
      };
      reader.readAsArrayBuffer(file);
    },
    [toast],
  );

  const handleFileRejected = useCallback(
    (file: File, reason: string) => {
      toast.error(`File "${file.name}" rejected: ${reason}`);
    },
    [toast],
  );

  // Flatten bookmarks for parent selection (up to 4 levels deep since max nesting is 5)
  const getFlatBookmarks = useCallback(
    (items: Bookmark[], depth = 0, prefix = ''): { id: string; label: string; depth: number }[] => {
      const result: { id: string; label: string; depth: number }[] = [];
      for (const item of items) {
        const label = prefix ? `${prefix} > ${item.title}` : item.title;
        result.push({ id: item.id, label, depth });
        if (depth < 4 && item.children.length > 0) {
          result.push(...getFlatBookmarks(item.children, depth + 1, label));
        }
      }
      return result;
    },
    [],
  );

  // Get nesting depth of a bookmark by ID
  const getBookmarkDepth = useCallback(
    (items: Bookmark[], targetId: string, currentDepth = 0): number => {
      for (const item of items) {
        if (item.id === targetId) return currentDepth;
        const childDepth = getBookmarkDepth(item.children, targetId, currentDepth + 1);
        if (childDepth >= 0) return childDepth;
      }
      return -1;
    },
    [],
  );

  // Add a new bookmark
  const handleAddBookmark = useCallback(() => {
    setTitleError(undefined);
    setPageError(undefined);

    // Validate title
    const titleValidation = validateBookmarkTitle(newTitle);
    if (!titleValidation.valid) {
      setTitleError(titleValidation.error);
      toast.error(titleValidation.error ?? 'Bookmark title must be between 1 and 200 characters.');
      return;
    }

    // Validate page number
    const pageNum = parseInt(newPage, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > pageCount) {
      const error = `Page number must be between 1 and ${pageCount}.`;
      setPageError(error);
      toast.error(error);
      return;
    }

    // Check nesting depth if parent is selected
    if (parentId) {
      const parentDepth = getBookmarkDepth(bookmarks, parentId);
      if (parentDepth >= 4) {
        toast.error('Cannot nest bookmarks deeper than 5 levels.');
        return;
      }
    }

    const newBookmark: Bookmark = {
      id: generateBookmarkId(),
      title: newTitle.trim(),
      pageNumber: pageNum,
      children: [],
    };

    if (!parentId) {
      setBookmarks((prev) => [...prev, newBookmark]);
    } else {
      setBookmarks((prev) => addToParent(prev, parentId, newBookmark));
    }

    setNewTitle('');
    setNewPage('');
    setParentId('');
    toast.success('Bookmark added.');
  }, [newTitle, newPage, parentId, pageCount, bookmarks, getBookmarkDepth, toast]);

  // Delete a bookmark by ID (recursive)
  const handleDeleteBookmark = useCallback(
    (id: string) => {
      setBookmarks((prev) => removeBookmark(prev, id));
      toast.success('Bookmark deleted.');
    },
    [toast],
  );

  // Start renaming
  const handleStartRename = useCallback((id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setRenameError(undefined);
  }, []);

  // Confirm rename
  const handleConfirmRename = useCallback(() => {
    if (!renamingId) return;

    const validation = validateBookmarkTitle(renameValue);
    if (!validation.valid) {
      setRenameError(validation.error);
      toast.error(validation.error ?? 'Bookmark title must be between 1 and 200 characters.');
      return;
    }

    setBookmarks((prev) => renameBookmark(prev, renamingId, renameValue.trim()));
    setRenamingId(null);
    setRenameValue('');
    setRenameError(undefined);
    toast.success('Bookmark renamed.');
  }, [renamingId, renameValue, toast]);

  // Cancel rename
  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue('');
    setRenameError(undefined);
  }, []);

  // Save bookmarks to PDF
  const handleSave = useCallback(async () => {
    if (!pdfData) return;

    setIsSaving(true);
    setSavedData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.setBookmarks(pdfData, bookmarks);

      if (result.success && result.data) {
        setSavedData(result.data);
        toast.success('Bookmarks saved successfully.');
      } else {
        toast.error(result.error ?? 'Failed to save bookmarks.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [pdfData, bookmarks, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!savedData) return;

    const blob = new Blob([savedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_bookmarks.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [savedData, fileName]);

  // Reset
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setPageCount(0);
    setBookmarks([]);
    setNewTitle('');
    setNewPage('');
    setParentId('');
    setTitleError(undefined);
    setPageError(undefined);
    setRenamingId(null);
    setRenameValue('');
    setRenameError(undefined);
    setSavedData(null);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Bookmarks
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to view, add, edit, or remove bookmarks (outline entries) for navigation.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
          operationRoute="/bookmarks"
          operationName="Bookmarks"
        />
      </div>
    );
  }

  const flatParents = getFlatBookmarks(bookmarks);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Bookmarks
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            {fileName} · {pageCount} page{pageCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-secondary-200 bg-white p-6 dark:border-secondary-700 dark:bg-secondary-800">
          <p className="text-secondary-500 dark:text-secondary-400 animate-pulse motion-reduce:animate-none">
            Loading bookmarks...
          </p>
        </div>
      ) : (
        <>
          {/* Bookmark tree display */}
          <div className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-6 dark:border-secondary-700 dark:bg-secondary-800">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">
              Bookmark Tree
            </h2>

            {bookmarks.length === 0 ? (
              <div className="text-center py-8">
                <svg
                  className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                  />
                </svg>
                <p className="mt-3 text-sm text-secondary-500 dark:text-secondary-400">
                  No bookmarks found in this PDF.
                </p>
                <p className="mt-1 text-sm text-secondary-400 dark:text-secondary-500">
                  Add your first bookmark using the form below.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <BookmarkTree
                  items={bookmarks}
                  depth={0}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  renameError={renameError}
                  onRenameValueChange={setRenameValue}
                  onStartRename={handleStartRename}
                  onConfirmRename={handleConfirmRename}
                  onCancelRename={handleCancelRename}
                  onDelete={handleDeleteBookmark}
                />
              </div>
            )}
          </div>

          {/* Add bookmark form */}
          <div className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-6 dark:border-secondary-700 dark:bg-secondary-800">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">
              Add Bookmark
            </h2>
            <div className="space-y-4 max-w-lg">
              <Input
                label="Title"
                value={newTitle}
                onChange={(e) => {
                  setNewTitle(e.target.value);
                  if (titleError) setTitleError(undefined);
                }}
                error={titleError}
                placeholder="Enter bookmark title"
                helperText="1–200 characters"
                fullWidth
                maxLength={200}
              />
              <Input
                label="Target Page"
                type="number"
                value={newPage}
                onChange={(e) => {
                  setNewPage(e.target.value);
                  if (pageError) setPageError(undefined);
                }}
                error={pageError}
                placeholder={`1–${pageCount}`}
                helperText={`Document has ${pageCount} page${pageCount !== 1 ? 's' : ''}`}
                fullWidth
                min={1}
                max={pageCount}
              />
              <div>
                <label
                  htmlFor="parent-select"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-200 mb-1"
                >
                  Parent Bookmark (optional)
                </label>
                <select
                  id="parent-select"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="min-h-[44px] w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-800 dark:text-secondary-100 dark:focus:border-primary-400 dark:focus:ring-primary-400"
                >
                  <option value="">None (top level)</option>
                  {flatParents.map((item) => (
                    <option key={item.id} value={item.id}>
                      {'  '.repeat(item.depth)}
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                  Nest under an existing bookmark (up to 5 levels)
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleAddBookmark}>
                Add Bookmark
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      {!isLoading && (
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleSave} loading={isSaving} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Bookmarks'}
          </Button>
          {savedData && (
            <Button variant="secondary" onClick={handleDownload}>
              Download PDF
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Bookmark Tree Rendering ---

interface BookmarkTreeProps {
  items: Bookmark[];
  depth: number;
  renamingId: string | null;
  renameValue: string;
  renameError: string | undefined;
  onRenameValueChange: (value: string) => void;
  onStartRename: (id: string, title: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onDelete: (id: string) => void;
}

function BookmarkTree({
  items,
  depth,
  renamingId,
  renameValue,
  renameError,
  onRenameValueChange,
  onStartRename,
  onConfirmRename,
  onCancelRename,
  onDelete,
}: BookmarkTreeProps): JSX.Element {
  return (
    <ul
      className={
        depth > 0 ? 'ml-4 border-l border-secondary-200 dark:border-secondary-700 pl-3' : ''
      }
    >
      {items.map((bookmark) => (
        <li key={bookmark.id} className="py-1">
          <div className="flex items-center gap-2 group">
            {/* Bookmark icon */}
            <svg
              className="h-4 w-4 flex-shrink-0 text-primary-500 dark:text-primary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>

            {renamingId === bookmark.id ? (
              /* Rename inline form */
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => onRenameValueChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onConfirmRename();
                    if (e.key === 'Escape') onCancelRename();
                  }}
                  maxLength={200}
                  className={`flex-1 min-w-0 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-secondary-700 dark:text-secondary-100 ${
                    renameError
                      ? 'border-error-500 dark:border-error-400'
                      : 'border-secondary-300 dark:border-secondary-600'
                  }`}
                  aria-label="Rename bookmark"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={onConfirmRename}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-900/20"
                  aria-label="Confirm rename"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onCancelRename}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-secondary-500 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-700"
                  aria-label="Cancel rename"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              /* Normal display */
              <>
                <span className="flex-1 min-w-0 truncate text-sm text-text-light dark:text-text-dark">
                  {bookmark.title}
                </span>
                <span className="text-xs text-secondary-400 dark:text-secondary-500 whitespace-nowrap">
                  p. {bookmark.pageNumber}
                </span>
                {/* Action buttons - visible on hover/focus */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => onStartRename(bookmark.id, bookmark.title)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:text-primary-400 dark:hover:bg-primary-900/20"
                    aria-label={`Rename bookmark "${bookmark.title}"`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(bookmark.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded text-secondary-400 hover:text-error-600 hover:bg-error-50 dark:hover:text-error-400 dark:hover:bg-error-900/20"
                    aria-label={`Delete bookmark "${bookmark.title}"`}
                  >
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Render children recursively (up to 5 levels) */}
          {bookmark.children.length > 0 && depth < 4 && (
            <BookmarkTree
              items={bookmark.children}
              depth={depth + 1}
              renamingId={renamingId}
              renameValue={renameValue}
              renameError={renameError}
              onRenameValueChange={onRenameValueChange}
              onStartRename={onStartRename}
              onConfirmRename={onConfirmRename}
              onCancelRename={onCancelRename}
              onDelete={onDelete}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

// --- Helper functions for immutable bookmark tree manipulation ---

/** Add a bookmark as a child of the specified parent ID */
function addToParent(items: Bookmark[], targetParentId: string, newBookmark: Bookmark): Bookmark[] {
  return items.map((item) => {
    if (item.id === targetParentId) {
      return { ...item, children: [...item.children, newBookmark] };
    }
    if (item.children.length > 0) {
      return { ...item, children: addToParent(item.children, targetParentId, newBookmark) };
    }
    return item;
  });
}

/** Remove a bookmark by ID from the tree */
function removeBookmark(items: Bookmark[], targetId: string): Bookmark[] {
  return items
    .filter((item) => item.id !== targetId)
    .map((item) => ({
      ...item,
      children: removeBookmark(item.children, targetId),
    }));
}

/** Rename a bookmark by ID in the tree */
function renameBookmark(items: Bookmark[], targetId: string, newTitle: string): Bookmark[] {
  return items.map((item) => {
    if (item.id === targetId) {
      return { ...item, title: newTitle };
    }
    if (item.children.length > 0) {
      return { ...item, children: renameBookmark(item.children, targetId, newTitle) };
    }
    return item;
  });
}

BookmarksPage.displayName = 'BookmarksPage';
