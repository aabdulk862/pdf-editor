import { useCallback, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/hooks/useToast';
import { PdfjsRenderEngine } from '@/core/render-engine/renderer';
import { OcrEngine } from '@/core/ocr-engine/ocr-engine';
import { useOcrIntegration, mergeNativeAndOcrText } from '@/features/ocr/hooks/useOcrIntegration';

/**
 * ExtractTextPage component - Extracts all text content from a PDF.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Trigger text extraction using pdfjs-dist render engine
 * - Detect scanned pages and offer OCR processing
 * - Display extracted text in a selectable text area with copy support
 * - Download extracted text as a UTF-8 .txt file
 * - Show OCR summary label with page numbers and confidence
 *
 * Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
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
  const [nativePageTexts, setNativePageTexts] = useState<string[]>([]);

  // OCR integration state
  const [showOcrPrompt, setShowOcrPrompt] = useState(false);
  const [ocrSkipped, setOcrSkipped] = useState(false);

  // OCR hook
  const {
    isProcessing: isOcrProcessing,
    isInitializing: isOcrInitializing,
    progress: ocrProgress,
    ocrResults,
    initializeOcr,
    processPages: ocrProcessPages,
    cancel: cancelOcr,
  } = useOcrIntegration();

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
        setNativePageTexts([]);
        setShowOcrPrompt(false);
        setOcrSkipped(false);
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
    setShowOcrPrompt(false);
    setOcrSkipped(false);
    setNativePageTexts([]);

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

        // Classify as scanned if fewer than 10 non-whitespace characters (Req 2.2)
        const nonWhitespace = pageText.replace(/\s/g, '');
        if (nonWhitespace.length < 10) {
          pagesWithNoText.push(i);
        }
      }

      setNativePageTexts(pageTexts);
      setEmptyPages(pagesWithNoText);
      setHasExtracted(true);

      // Join with page delimiters
      const fullText = pageTexts.join('\n\n--- Page Break ---\n\n');

      // Check if there are scanned pages that could benefit from OCR (Req 7.1)
      if (pagesWithNoText.length > 0) {
        // Show OCR prompt banner
        setShowOcrPrompt(true);

        // Still show the native text for pages that have it
        if (fullText.replace(/--- Page Break ---/g, '').trim() === '') {
          setExtractedText('');
        } else {
          setExtractedText(fullText);
        }
      } else {
        // No scanned pages — just show the text
        setExtractedText(fullText);
        toast.success('Text extracted successfully.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(`Failed to extract text: ${message}`);
    } finally {
      setIsExtracting(false);
    }
  }, [pdfData, toast]);

  // Handle OCR acceptance (Req 7.3)
  const handleRunOcr = useCallback(async () => {
    if (!pdfData || emptyPages.length === 0) return;

    setShowOcrPrompt(false);

    try {
      // Initialize OCR engine
      await initializeOcr();

      // Process scanned pages
      await ocrProcessPages(pdfData, emptyPages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR processing failed';
      toast.error(`OCR failed: ${message}`);
    }
  }, [pdfData, emptyPages, initializeOcr, ocrProcessPages, toast]);

  // Handle OCR skip (Req 7.2)
  const handleSkipOcr = useCallback(() => {
    setShowOcrPrompt(false);
    setOcrSkipped(true);

    // Show native text with placeholders for skipped pages
    if (nativePageTexts.length > 0) {
      const fullText = nativePageTexts.join('\n\n--- Page Break ---\n\n');
      if (fullText.replace(/--- Page Break ---/g, '').trim() === '') {
        setExtractedText('');
        toast.warning('This PDF contains no extractable text (e.g., scanned images only).');
      } else {
        setExtractedText(fullText);
        toast.success('Text extracted successfully (scanned pages skipped).');
      }
    }
  }, [nativePageTexts, toast]);

  // Compute merged result when OCR completes (Req 7.4)
  const currentMergedResult =
    ocrResults && nativePageTexts.length > 0 && !ocrSkipped
      ? mergeNativeAndOcrText(nativePageTexts, ocrResults, emptyPages)
      : null;

  // Copy text to clipboard (Req 7.7)
  const handleCopy = useCallback(async () => {
    const textToCopy = currentMergedResult?.text || extractedText;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
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
  }, [currentMergedResult, extractedText, toast]);

  // Download as .txt file (Req 7.7)
  const handleDownload = useCallback(() => {
    const textToDownload = currentMergedResult?.text || extractedText;
    if (!textToDownload) return;

    const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_extracted.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentMergedResult, extractedText, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setExtractedText('');
    setEmptyPages([]);
    setHasExtracted(false);
    setNativePageTexts([]);
    setShowOcrPrompt(false);
    setOcrSkipped(false);
  }, []);

  // Format ETA for progress display
  const formatEta = (ms: number): string => {
    return OcrEngine.formatEta(ms);
  };

  // Determine what text to show in the textarea
  const textToDisplay = currentMergedResult?.text || extractedText;

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
          operationRoute="/extract-text"
          operationName="Extract Text"
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

      {/* OCR Prompt Banner (Req 7.1, 7.2) */}
      {showOcrPrompt && !isOcrProcessing && !isOcrInitializing && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-700 dark:bg-primary-900/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary-800 dark:text-primary-200">
                {emptyPages.length} {emptyPages.length === 1 ? 'page appears' : 'pages appear'} to
                be scanned. Run OCR to extract text?
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-300 mt-1">
                OCR will attempt to recognize text from scanned page images.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleRunOcr}>
                Run OCR
              </Button>
              <Button variant="outline" size="sm" onClick={handleSkipOcr}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* OCR Initializing State */}
      {isOcrInitializing && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <ProgressBar
            progress={null}
            label="Loading OCR engine..."
            ariaLabel="OCR engine initialization in progress"
          />
        </div>
      )}

      {/* OCR Processing Progress (Req 7.3) */}
      {isOcrProcessing && ocrProgress && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 shadow-level-3 dark:border-secondary-700 dark:bg-secondary-800">
          <ProgressBar
            progress={ocrProgress.percentComplete}
            label={`Processing page ${ocrProgress.currentPage} of ${ocrProgress.totalPages}`}
            ariaLabel={`OCR processing progress: ${ocrProgress.percentComplete}% complete`}
          />
          {ocrProgress.estimatedTimeRemainingMs !== null && (
            <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-300">
              Estimated time remaining: {formatEta(ocrProgress.estimatedTimeRemainingMs)}
            </p>
          )}
          <div className="mt-3">
            <Button
              variant="danger"
              size="sm"
              onClick={cancelOcr}
              className="min-h-[44px] min-w-[44px]"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      {hasExtracted && !isOcrProcessing && !isOcrInitializing && (
        <div className="space-y-4">
          {/* OCR Summary Label (Req 7.6) */}
          {currentMergedResult && currentMergedResult.ocrPageNumbers.length > 0 && (
            <div className="rounded-lg border border-success-200 bg-success-50 p-3 dark:border-success-700 dark:bg-success-900/20">
              <p className="text-sm text-success-800 dark:text-success-200">
                <span className="font-medium">
                  Pages {currentMergedResult.ocrPageNumbers.join(', ')} used OCR
                </span>
                {currentMergedResult.averageConfidence !== null && (
                  <span> (avg confidence: {currentMergedResult.averageConfidence}%)</span>
                )}
              </p>
              {currentMergedResult.failedPageNumbers.length > 0 && (
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Pages {currentMergedResult.failedPageNumbers.join(', ')} failed OCR recognition.
                </p>
              )}
            </div>
          )}

          {/* Empty pages indicator (only when OCR not run) */}
          {emptyPages.length > 0 && !currentMergedResult && ocrSkipped && textToDisplay && (
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
          {textToDisplay ? (
            <>
              <div className="relative">
                <textarea
                  ref={textAreaRef}
                  readOnly
                  value={textToDisplay}
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
