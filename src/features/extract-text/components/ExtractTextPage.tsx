import { useCallback, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { PdfjsRenderEngine } from '@/core/render-engine/renderer';

/**
 * ExtractTextPage component - Extracts all text content from a PDF.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Trigger text extraction using pdfjs-dist render engine
 * - Display extracted text in a selectable text area with copy support
 * - Download extracted text as a UTF-8 .txt file
 * - Show toast if no extractable text found
 * - Indicate pages with no text
 * - Complete within 5s for ≤100 pages
 *
 * Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6
 */
export function ExtractTextPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [emptyPages, setEmptyPages] = useState<number[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  // Ref for the text area to support copy
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Handle file upload
  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        setFileName(file.name);
        setExtractedText('');
        setEmptyPages([]);
        setHasExtracted(false);
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

  // Extract text
  const handleExtract = useCallback(async () => {
    if (!pdfData) return;

    setIsExtracting(true);
    setExtractedText('');
    setEmptyPages([]);
    setHasExtracted(false);

    try {
      const renderEngine = new PdfjsRenderEngine();
      const doc = await renderEngine.loadDocument(pdfData);
      const pageCount = renderEngine.getPageCount(doc);

      // Extract text page by page to identify empty pages
      const pageTexts: string[] = [];
      const pagesWithNoText: number[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const pageText = await renderEngine.extractText(doc, i);
        pageTexts.push(pageText);

        if (pageText.trim() === '') {
          pagesWithNoText.push(i);
        }
      }

      // Join with page delimiters
      const fullText = pageTexts.join('\n\n--- Page Break ---\n\n');

      setEmptyPages(pagesWithNoText);
      setHasExtracted(true);

      // Check if no text was found at all
      if (fullText.replace(/--- Page Break ---/g, '').trim() === '') {
        setExtractedText('');
        toast.warning('This PDF contains no extractable text (e.g., scanned images only).');
      } else {
        setExtractedText(fullText);

        // Notify about pages with no text if it's a mix
        if (pagesWithNoText.length > 0 && pagesWithNoText.length < pageCount) {
          const pageList =
            pagesWithNoText.length <= 5
              ? pagesWithNoText.join(', ')
              : `${pagesWithNoText.slice(0, 5).join(', ')}... and ${pagesWithNoText.length - 5} more`;
          toast.warning(`Pages with no extractable text: ${pageList}`);
        }

        toast.success('Text extracted successfully.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed to extract text: ${message}`);
    } finally {
      setIsExtracting(false);
    }
  }, [pdfData, toast]);

  // Copy text to clipboard
  const handleCopy = useCallback(async () => {
    if (!extractedText) return;

    try {
      await navigator.clipboard.writeText(extractedText);
      toast.success('Text copied to clipboard.');
    } catch {
      // Fallback: select all text in textarea
      if (textAreaRef.current) {
        textAreaRef.current.select();
        document.execCommand('copy');
        toast.success('Text copied to clipboard.');
      } else {
        toast.error('Failed to copy text to clipboard.');
      }
    }
  }, [extractedText, toast]);

  // Download as .txt file
  const handleDownload = useCallback(() => {
    if (!extractedText) return;

    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_extracted.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [extractedText, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setExtractedText('');
    setEmptyPages([]);
    setHasExtracted(false);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Extract Text
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF to extract all text content. The extracted text can be copied or downloaded
          as a .txt file.
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
            Extract Text
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Extract trigger */}
      {!hasExtracted && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleExtract}
            loading={isExtracting}
            disabled={isExtracting}
          >
            {isExtracting ? 'Extracting...' : 'Extract Text'}
          </Button>
        </div>
      )}

      {/* Results */}
      {hasExtracted && (
        <div className="space-y-4">
          {/* Empty pages indicator */}
          {emptyPages.length > 0 && extractedText && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">Pages with no text:</span>{' '}
                {emptyPages.length <= 10
                  ? emptyPages.join(', ')
                  : `${emptyPages.slice(0, 10).join(', ')}... and ${emptyPages.length - 10} more`}
              </p>
            </div>
          )}

          {/* Text area with extracted content */}
          {extractedText ? (
            <>
              <div className="relative">
                <textarea
                  ref={textAreaRef}
                  readOnly
                  value={extractedText}
                  className="w-full min-h-[300px] max-h-[600px] resize-y rounded-lg border border-secondary-200 bg-white p-4 font-mono text-sm text-text-light dark:border-secondary-700 dark:bg-secondary-800 dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Extracted text content"
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={handleCopy}>
                  Copy to Clipboard
                </Button>
                <Button variant="secondary" onClick={handleDownload}>
                  Download as .txt
                </Button>
                <Button variant="outline" onClick={handleExtract} disabled={isExtracting}>
                  Re-extract
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-secondary-200 bg-white p-6 text-center dark:border-secondary-700 dark:bg-secondary-800">
              <p className="text-secondary-500 dark:text-secondary-400">
                No extractable text found in this PDF. The document may contain only scanned images.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ExtractTextPage.displayName = 'ExtractTextPage';
