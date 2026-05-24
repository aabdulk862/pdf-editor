import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { WatermarkConfig } from '@/types/operations';

type WatermarkType = 'text' | 'image';

const MAX_TEXT_LENGTH = 200;
const MIN_OPACITY = 1;
const MAX_OPACITY = 100;
const MIN_ROTATION = 0;
const MAX_ROTATION = 359;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg'];

/**
 * WatermarksPage component - Allows users to add text or image watermarks to PDF pages.
 *
 * Features:
 * - Upload a PDF file via drag-and-drop or click-to-browse
 * - Choose between text watermark (1-200 chars) or image watermark (PNG/JPG)
 * - Configure opacity (1-100%) and rotation (0-359°)
 * - Preview the watermarked result
 * - Download the watermarked PDF
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */
export function WatermarksPage(): JSX.Element {
  const toast = useToast();

  // PDF file state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfName, setPdfName] = useState<string>('');

  // Watermark configuration
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  const [text, setText] = useState<string>('');
  const [imageData, setImageData] = useState<ArrayBuffer | null>(null);
  const [imageName, setImageName] = useState<string>('');
  const [opacity, setOpacity] = useState<number>(50);
  const [rotation, setRotation] = useState<number>(45);

  // Operation state
  const [modifiedData, setModifiedData] = useState<ArrayBuffer | null>(null);
  const [processing, setProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Handle PDF file upload
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

  // Handle watermark image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Invalid image format. Please upload a PNG or JPG file.`);
        e.target.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImageData(reader.result as ArrayBuffer);
        setImageName(file.name);
      };
      reader.onerror = () => {
        toast.error('Failed to read the image file.');
      };
      reader.readAsArrayBuffer(file);
      e.target.value = '';
    },
    [toast],
  );

  // Validate watermark input
  const validate = useCallback((): boolean => {
    if (watermarkType === 'text') {
      if (!text || text.trim().length === 0) {
        toast.error('Please enter watermark text.');
        return false;
      }
      if (text.length > MAX_TEXT_LENGTH) {
        toast.error(`Watermark text must be ${MAX_TEXT_LENGTH} characters or fewer.`);
        return false;
      }
    } else {
      if (!imageData) {
        toast.error('Please upload a valid PNG or JPG image for the watermark.');
        return false;
      }
    }
    return true;
  }, [watermarkType, text, imageData, toast]);

  // Apply watermark
  const handleApply = useCallback(async () => {
    if (!pdfData) {
      toast.error('Please upload a PDF file first.');
      return;
    }

    if (!validate()) return;

    setProcessing(true);
    try {
      const client = getPdfWorkerClient({
        onError: (msg) => toast.warning(msg),
      });

      const config: WatermarkConfig = {
        type: watermarkType,
        text: watermarkType === 'text' ? text : undefined,
        imageData: watermarkType === 'image' ? imageData! : undefined,
        opacity: opacity / 100, // Convert percentage to 0-1 range
        rotation,
      };

      const result = await client.addWatermark(pdfData, config);

      if (result.success && result.data) {
        setModifiedData(result.data);
        toast.success('Watermark applied successfully.');
      } else {
        toast.error(result.error ?? 'Failed to apply watermark.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setProcessing(false);
    }
  }, [pdfData, watermarkType, text, imageData, opacity, rotation, validate, toast]);

  // Download watermarked PDF
  const handleDownload = useCallback(() => {
    if (!modifiedData) return;

    const blob = new Blob([modifiedData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const baseName = pdfName.replace(/\.pdf$/i, '');
    link.download = `${baseName}-watermarked.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [modifiedData, pdfName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setPdfName('');
    setModifiedData(null);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Watermarks
        </h1>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Add a text or image watermark to every page of your PDF.
        </p>
      </div>

      {/* File Upload */}
      {!pdfData && (
        <FileUploadZone
          accept={['application/pdf']}
          maxFiles={1}
          multiple={false}
          onFilesAccepted={handleFilesAccepted}
          onFileRejected={handleFileRejected}
        />
      )}

      {/* Configuration */}
      {pdfData && (
        <>
          {/* File info and reset */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-secondary-600 dark:text-secondary-400">
              File:{' '}
              <span className="font-medium text-text-light dark:text-text-dark">{pdfName}</span>
            </p>
            <Button variant="outline" size="sm" onClick={handleReset}>
              Upload different file
            </Button>
          </div>

          <div className="space-y-4 rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
            <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
              Watermark Settings
            </h2>

            {/* Watermark Type Toggle */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={[
                    'min-h-[44px] min-w-[44px] rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    'dark:focus-visible:ring-offset-background-dark',
                    watermarkType === 'text'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-secondary-300 bg-secondary-50 text-secondary-700 hover:border-primary-400 hover:bg-secondary-100 dark:border-secondary-600 dark:bg-secondary-900 dark:text-secondary-300 dark:hover:border-primary-500 dark:hover:bg-secondary-700',
                  ].join(' ')}
                  aria-pressed={watermarkType === 'text'}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={[
                    'min-h-[44px] min-w-[44px] rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                    'dark:focus-visible:ring-offset-background-dark',
                    watermarkType === 'image'
                      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:border-primary-400 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-secondary-300 bg-secondary-50 text-secondary-700 hover:border-primary-400 hover:bg-secondary-100 dark:border-secondary-600 dark:bg-secondary-900 dark:text-secondary-300 dark:hover:border-primary-500 dark:hover:bg-secondary-700',
                  ].join(' ')}
                  aria-pressed={watermarkType === 'image'}
                >
                  Image
                </button>
              </div>
            </div>

            {/* Text Input */}
            {watermarkType === 'text' && (
              <div className="space-y-2">
                <label
                  htmlFor="watermark-text"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
                >
                  Watermark Text
                </label>
                <input
                  id="watermark-text"
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={MAX_TEXT_LENGTH}
                  placeholder="e.g. CONFIDENTIAL, DRAFT"
                  className={[
                    'min-h-[44px] w-full rounded-md border px-3 py-2 text-sm',
                    'border-secondary-300 bg-white text-text-light placeholder-secondary-400',
                    'dark:border-secondary-600 dark:bg-secondary-900 dark:text-text-dark dark:placeholder-secondary-500',
                    'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500',
                    'dark:focus:border-primary-400 dark:focus:ring-primary-400',
                  ].join(' ')}
                  aria-describedby="watermark-text-hint"
                />
                <p
                  id="watermark-text-hint"
                  className="text-xs text-secondary-500 dark:text-secondary-400"
                >
                  {text.length}/{MAX_TEXT_LENGTH} characters
                </p>
              </div>
            )}

            {/* Image Upload */}
            {watermarkType === 'image' && (
              <div className="space-y-2">
                <label
                  htmlFor="watermark-image"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
                >
                  Watermark Image (PNG or JPG)
                </label>
                <div className="flex items-center gap-3">
                  <label
                    htmlFor="watermark-image"
                    className={[
                      'inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-150',
                      'border-secondary-300 bg-secondary-50 text-secondary-700 hover:border-primary-400 hover:bg-secondary-100',
                      'dark:border-secondary-600 dark:bg-secondary-900 dark:text-secondary-300 dark:hover:border-primary-500 dark:hover:bg-secondary-700',
                      'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
                    ].join(' ')}
                  >
                    Choose Image
                    <input
                      id="watermark-image"
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleImageUpload}
                      className="sr-only"
                    />
                  </label>
                  {imageName && (
                    <span className="text-sm text-secondary-600 dark:text-secondary-400 truncate max-w-[200px]">
                      {imageName}
                    </span>
                  )}
                </div>
                {!imageData && (
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    Upload a PNG or JPG image to use as watermark.
                  </p>
                )}
              </div>
            )}

            {/* Opacity Slider */}
            <div className="space-y-2">
              <label
                htmlFor="watermark-opacity"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
              >
                Opacity: {opacity}%
              </label>
              <input
                id="watermark-opacity"
                type="range"
                min={MIN_OPACITY}
                max={MAX_OPACITY}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-secondary-200 dark:bg-secondary-700 accent-primary-600 dark:accent-primary-400"
                aria-valuemin={MIN_OPACITY}
                aria-valuemax={MAX_OPACITY}
                aria-valuenow={opacity}
                aria-valuetext={`${opacity} percent`}
              />
              <div className="flex justify-between text-xs text-secondary-500 dark:text-secondary-400">
                <span>{MIN_OPACITY}%</span>
                <span>{MAX_OPACITY}%</span>
              </div>
            </div>

            {/* Rotation Input */}
            <div className="space-y-2">
              <label
                htmlFor="watermark-rotation"
                className="block text-sm font-medium text-secondary-700 dark:text-secondary-300"
              >
                Rotation: {rotation}°
              </label>
              <input
                id="watermark-rotation"
                type="range"
                min={MIN_ROTATION}
                max={MAX_ROTATION}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-secondary-200 dark:bg-secondary-700 accent-primary-600 dark:accent-primary-400"
                aria-valuemin={MIN_ROTATION}
                aria-valuemax={MAX_ROTATION}
                aria-valuenow={rotation}
                aria-valuetext={`${rotation} degrees`}
              />
              <div className="flex justify-between text-xs text-secondary-500 dark:text-secondary-400">
                <span>{MIN_ROTATION}°</span>
                <span>{MAX_ROTATION}°</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleApply}
                loading={processing}
                disabled={!pdfData || processing}
              >
                Apply Watermark
              </Button>
              {modifiedData && (
                <Button variant="secondary" onClick={handleDownload}>
                  Download
                </Button>
              )}
            </div>
          </div>

          {/* Preview */}
          <PreviewPanel
            originalDoc={pdfData}
            modifiedDoc={modifiedData}
            zoom={zoom}
            onZoomChange={setZoom}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

WatermarksPage.displayName = 'WatermarksPage';
