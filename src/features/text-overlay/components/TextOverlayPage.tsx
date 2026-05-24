import { useCallback, useEffect, useRef, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { TextOverlay } from '@/core/pdf-engine/index';

/** Font size constraints (pt) */
const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 144;
/** Maximum text length */
const MAX_TEXT_LENGTH = 1000;
/** Preview debounce delay (ms) - ensures preview within 500ms */
const PREVIEW_DEBOUNCE_MS = 300;

/**
 * TextOverlayPage component for adding text overlays to PDF pages.
 *
 * Features:
 * - Text input with max 1000 characters
 * - Font size selector (6-144pt)
 * - Color picker for text color
 * - Click-to-place on page preview
 * - Preview within 500ms of edit
 * - Validates non-empty text before confirming
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5
 */
export function TextOverlayPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('');

  // Text overlay configuration
  const [text, setText] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(24);
  const [fontColor, setFontColor] = useState<string>('#000000');
  const [placedPosition, setPlacedPosition] = useState<{ x: number; y: number } | null>(null);

  // Preview and processing state
  const [modifiedData, setModifiedData] = useState<ArrayBuffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPlacingText, setIsPlacingText] = useState(false);

  // Debounce timer ref for live preview
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // File upload handlers
  const handleFilesAccepted = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        setPdfData(data);
        setPdfName(file.name);
        setModifiedData(null);
        setPlacedPosition(null);
        setCurrentPage(1);
      };
      reader.onerror = () => {
        toast.error('Failed to read the file. Please try again.');
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

  // Generate preview when text, font size, color, or position changes
  useEffect(() => {
    if (!pdfData || !text.trim() || !placedPosition) {
      return;
    }

    // Debounce preview generation to stay within 500ms requirement
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
    }

    previewTimerRef.current = setTimeout(async () => {
      try {
        const client = getPdfWorkerClient({
          onError: (msg) => toast.warning(msg),
        });

        const overlay: TextOverlay = {
          page: currentPage,
          text: text.slice(0, MAX_TEXT_LENGTH),
          x: placedPosition.x,
          y: placedPosition.y,
          fontSize,
          color: fontColor,
        };

        const result = await client.addTextOverlay(pdfData, [overlay]);

        if (result.success && result.data) {
          setModifiedData(result.data);
        }
      } catch {
        // Silent failure for preview - user can still confirm
      }
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, [pdfData, text, fontSize, fontColor, placedPosition, currentPage, toast]);

  // Handle click-to-place on the preview panel area
  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isPlacingText || !pdfData) return;

      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();

      // Calculate position relative to the preview container
      // Normalize to approximate PDF coordinates (assuming standard page ~612x792 pts)
      const relativeX = ((e.clientX - rect.left) / rect.width) * 612;
      const relativeY = ((e.clientY - rect.top) / rect.height) * 792;

      setPlacedPosition({ x: Math.round(relativeX), y: Math.round(relativeY) });
      setIsPlacingText(false);
    },
    [isPlacingText, pdfData],
  );

  // Confirm and embed the text overlay into the PDF
  const handleConfirm = useCallback(async () => {
    if (!pdfData) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    if (!text.trim()) {
      toast.error('Text content is required. Please enter some text.');
      return;
    }

    if (!placedPosition) {
      toast.error('Please click on the page to place the text overlay.');
      return;
    }

    setProcessing(true);
    try {
      const client = getPdfWorkerClient({
        onError: (msg) => toast.warning(msg),
      });

      const overlay: TextOverlay = {
        page: currentPage,
        text: text.slice(0, MAX_TEXT_LENGTH),
        x: placedPosition.x,
        y: placedPosition.y,
        fontSize,
        color: fontColor,
      };

      const result = await client.addTextOverlay(pdfData, [overlay]);

      if (result.success && result.data) {
        setModifiedData(result.data);
        toast.success('Text overlay added successfully.');
      } else {
        toast.error(result.error ?? 'Failed to add text overlay.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  }, [pdfData, text, placedPosition, currentPage, fontSize, fontColor, toast]);

  // Download the modified PDF
  const handleDownload = useCallback(() => {
    if (!modifiedData) return;

    const blob = new Blob([modifiedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = pdfName.replace(/\.pdf$/i, '');
    link.download = `${baseName}-text-overlay.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [modifiedData, pdfName]);

  // Handle text input change with max length enforcement
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_TEXT_LENGTH) {
      setText(value);
    }
  }, []);

  // Handle font size change with clamping
  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setFontSize(Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, value)));
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Text Overlay
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Add custom text overlays to your PDF pages. Configure the text, font size, and color, then
          click on the page to place it.
        </p>
      </div>

      {/* File Upload */}
      <FileUploadZone
        accept={['application/pdf']}
        maxFiles={1}
        multiple={false}
        onFilesAccepted={handleFilesAccepted}
        onFileRejected={handleFileRejected}
        operationRoute="/text-overlay"
        operationName="Text Overlay"
      />

      {/* Configuration Panel */}
      {pdfData && (
        <div className="space-y-4 rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
            Text Overlay Settings
          </h2>

          {/* Text Input */}
          <div className="space-y-2">
            <label
              htmlFor="overlay-text"
              className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
            >
              Text Content
            </label>
            <textarea
              id="overlay-text"
              value={text}
              onChange={handleTextChange}
              placeholder="Enter text to overlay on the PDF..."
              maxLength={MAX_TEXT_LENGTH}
              rows={3}
              className={[
                'w-full rounded-md border px-3 py-2 text-sm resize-y',
                'border-secondary-300 bg-white text-text-light',
                'dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark',
                'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                'dark:focus:border-primary-400 dark:focus:ring-primary-400',
                'placeholder:text-secondary-400 dark:placeholder:text-secondary-500',
              ].join(' ')}
              aria-describedby="text-char-count"
            />
            <p id="text-char-count" className="text-xs text-secondary-500 dark:text-secondary-400">
              {text.length} / {MAX_TEXT_LENGTH} characters
            </p>
          </div>

          {/* Font Size and Color Row */}
          <div className="flex flex-wrap gap-4">
            {/* Font Size */}
            <div className="space-y-2">
              <label
                htmlFor="font-size"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
              >
                Font Size (pt)
              </label>
              <input
                id="font-size"
                type="number"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={fontSize}
                onChange={handleFontSizeChange}
                className={[
                  'min-h-[44px] w-[120px] rounded-md border px-3 py-2 text-sm',
                  'border-secondary-300 bg-white text-text-light',
                  'dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark',
                  'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                  'dark:focus:border-primary-400 dark:focus:ring-primary-400',
                ].join(' ')}
                aria-describedby="font-size-hint"
              />
              <p id="font-size-hint" className="text-xs text-secondary-500 dark:text-secondary-400">
                {MIN_FONT_SIZE}pt – {MAX_FONT_SIZE}pt
              </p>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <label
                htmlFor="font-color"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
              >
                Text Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="font-color"
                  type="color"
                  value={fontColor}
                  onChange={(e) => setFontColor(e.target.value)}
                  className="min-h-[44px] min-w-[44px] cursor-pointer rounded-md border border-secondary-300 dark:border-secondary-600"
                  aria-label="Select text color"
                />
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  {fontColor}
                </span>
              </div>
            </div>
          </div>

          {/* Placement Controls */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
              Placement
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={isPlacingText ? 'primary' : 'secondary'}
                onClick={() => setIsPlacingText(!isPlacingText)}
                disabled={!text.trim()}
              >
                {isPlacingText ? 'Click on page below...' : 'Place on Page'}
              </Button>
              {placedPosition && (
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  Position: ({placedPosition.x}, {placedPosition.y})
                </span>
              )}
            </div>
            {isPlacingText && (
              <p className="text-xs text-primary-600 dark:text-primary-400">
                Click anywhere on the page preview below to place the text.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant="primary"
              onClick={handleConfirm}
              loading={processing}
              disabled={!pdfData || !text.trim() || !placedPosition || processing}
            >
              Apply Text Overlay
            </Button>
            {modifiedData && (
              <Button variant="secondary" onClick={handleDownload}>
                Download
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Preview with click-to-place support */}
      {pdfData && (
        <div
          onClick={handlePreviewClick}
          className={['relative', isPlacingText ? 'cursor-crosshair' : ''].join(' ')}
          role={isPlacingText ? 'button' : undefined}
          aria-label={isPlacingText ? 'Click to place text overlay on the page' : undefined}
        >
          {isPlacingText && (
            <div className="absolute inset-0 z-10 rounded-lg border-2 border-dashed border-primary-400 bg-primary-50/10 dark:bg-primary-900/10 pointer-events-none" />
          )}
          <PreviewPanel
            originalDoc={pdfData}
            modifiedDoc={modifiedData}
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

TextOverlayPage.displayName = 'TextOverlayPage';
