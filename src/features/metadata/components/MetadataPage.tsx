import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import { validateMetadataField, validateKeywords } from '@/utils/validation';
import type { PdfMetadata } from '@/types/pdf';

/**
 * MetadataPage component - Allows users to view and edit PDF metadata.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Display existing metadata on upload with placeholders for empty fields
 * - Edit title, author, subject (max 255 chars), keywords (max 20, each max 100 chars)
 * - Save metadata changes via PDF Engine (setMetadata), updates modification date
 * - Download the PDF with updated metadata
 *
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5
 */
export function MetadataPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Metadata state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [creationDate, setCreationDate] = useState<Date | null>(null);
  const [modificationDate, setModificationDate] = useState<Date | null>(null);

  // Validation errors
  const [titleError, setTitleError] = useState<string | undefined>();
  const [authorError, setAuthorError] = useState<string | undefined>();
  const [subjectError, setSubjectError] = useState<string | undefined>();
  const [keywordsError, setKeywordsError] = useState<string | undefined>();

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
          const metadata = await client.getMetadata(data);

          setTitle(metadata.title ?? '');
          setAuthor(metadata.author ?? '');
          setSubject(metadata.subject ?? '');
          setKeywords(metadata.keywords ?? []);
          setCreationDate(metadata.creationDate);
          setModificationDate(metadata.modificationDate);
        } catch {
          toast.error('Failed to read PDF metadata.');
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

  // Add keyword
  const handleAddKeyword = useCallback(() => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;

    if (trimmed.length > 100) {
      setKeywordsError('Each keyword must not exceed 100 characters.');
      return;
    }

    if (keywords.length >= 20) {
      setKeywordsError('Maximum of 20 keywords allowed.');
      return;
    }

    setKeywords((prev) => [...prev, trimmed]);
    setKeywordInput('');
    setKeywordsError(undefined);
  }, [keywordInput, keywords.length]);

  // Remove keyword
  const handleRemoveKeyword = useCallback((index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
    setKeywordsError(undefined);
  }, []);

  // Handle keyword input keydown (Enter to add)
  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddKeyword();
      }
    },
    [handleAddKeyword],
  );

  // Save metadata
  const handleSave = useCallback(async () => {
    if (!pdfData) return;

    // Clear previous errors
    setTitleError(undefined);
    setAuthorError(undefined);
    setSubjectError(undefined);
    setKeywordsError(undefined);

    // Validate fields
    const titleValidation = validateMetadataField('title', title);
    if (!titleValidation.valid) {
      setTitleError(titleValidation.error);
      toast.error(titleValidation.error ?? 'Title exceeds maximum length.');
      return;
    }

    const authorValidation = validateMetadataField('author', author);
    if (!authorValidation.valid) {
      setAuthorError(authorValidation.error);
      toast.error(authorValidation.error ?? 'Author exceeds maximum length.');
      return;
    }

    const subjectValidation = validateMetadataField('subject', subject);
    if (!subjectValidation.valid) {
      setSubjectError(subjectValidation.error);
      toast.error(subjectValidation.error ?? 'Subject exceeds maximum length.');
      return;
    }

    const keywordsValidation = validateKeywords(keywords);
    if (!keywordsValidation.valid) {
      setKeywordsError(keywordsValidation.error);
      toast.error(keywordsValidation.error ?? 'Keywords validation failed.');
      return;
    }

    setIsSaving(true);
    setSavedData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const updatedMetadata: Partial<PdfMetadata> = {
        title: title || null,
        author: author || null,
        subject: subject || null,
        keywords,
      };

      const result = await client.setMetadata(pdfData, updatedMetadata);

      if (result.success && result.data) {
        setSavedData(result.data);
        setModificationDate(new Date());
        toast.success('Metadata updated successfully.');
      } else {
        toast.error(result.error ?? 'Failed to update metadata.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [pdfData, title, author, subject, keywords, toast]);

  // Download
  const handleDownload = useCallback(() => {
    if (!savedData) return;

    const blob = new Blob([savedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_metadata.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [savedData, fileName]);

  // Reset
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setTitle('');
    setAuthor('');
    setSubject('');
    setKeywords([]);
    setKeywordInput('');
    setCreationDate(null);
    setModificationDate(null);
    setTitleError(undefined);
    setAuthorError(undefined);
    setSubjectError(undefined);
    setKeywordsError(undefined);
    setSavedData(null);
  }, []);

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleString();
    } catch {
      return '—';
    }
  };

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Edit Metadata
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to view and edit its metadata fields such as title, author, subject, and
          keywords.
        </p>
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
            Edit Metadata
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-secondary-200 bg-white p-6 dark:border-secondary-700 dark:bg-secondary-800">
          <p className="text-secondary-500 dark:text-secondary-400 animate-pulse">
            Loading metadata...
          </p>
        </div>
      ) : (
        <>
          {/* Metadata form */}
          <div className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-6 dark:border-secondary-700 dark:bg-secondary-800">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">
              Document Information
            </h2>
            <div className="space-y-4 max-w-lg">
              <Input
                label="Title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(undefined);
                }}
                error={titleError}
                placeholder="No title set"
                helperText="Maximum 255 characters"
                fullWidth
                maxLength={255}
              />
              <Input
                label="Author"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  if (authorError) setAuthorError(undefined);
                }}
                error={authorError}
                placeholder="No author set"
                helperText="Maximum 255 characters"
                fullWidth
                maxLength={255}
              />
              <Input
                label="Subject"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  if (subjectError) setSubjectError(undefined);
                }}
                error={subjectError}
                placeholder="No subject set"
                helperText="Maximum 255 characters"
                fullWidth
                maxLength={255}
              />
            </div>
          </div>

          {/* Keywords section */}
          <div className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-6 dark:border-secondary-700 dark:bg-secondary-800">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">
              Keywords
            </h2>
            <div className="space-y-3 max-w-lg">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={keywordInput}
                    onChange={(e) => {
                      setKeywordInput(e.target.value);
                      if (keywordsError) setKeywordsError(undefined);
                    }}
                    onKeyDown={handleKeywordKeyDown}
                    error={keywordsError}
                    placeholder="Add a keyword and press Enter"
                    helperText={`${keywords.length}/20 keywords · Max 100 characters each`}
                    fullWidth
                    maxLength={100}
                  />
                </div>
                <div className="pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddKeyword}
                    disabled={!keywordInput.trim() || keywords.length >= 20}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Keywords list */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword, index) => (
                    <span
                      key={`${keyword}-${index}`}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(index)}
                        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-primary-500 hover:bg-primary-200 hover:text-primary-700 dark:hover:bg-primary-800 dark:hover:text-primary-200"
                        aria-label={`Remove keyword "${keyword}"`}
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {keywords.length === 0 && (
                <p className="text-sm text-secondary-400 dark:text-secondary-500 italic">
                  No keywords set
                </p>
              )}
            </div>
          </div>

          {/* Dates (read-only) */}
          <div className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-6 dark:border-secondary-700 dark:bg-secondary-800">
            <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">Dates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                  Creation Date
                </p>
                <p className="text-sm text-text-light dark:text-text-dark">
                  {formatDate(creationDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                  Modification Date
                </p>
                <p className="text-sm text-text-light dark:text-text-dark">
                  {formatDate(modificationDate)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'Saving...' : 'Save Metadata'}
        </Button>
        {savedData && (
          <Button variant="secondary" onClick={handleDownload}>
            Download PDF
          </Button>
        )}
      </div>
    </div>
  );
}

MetadataPage.displayName = 'MetadataPage';
