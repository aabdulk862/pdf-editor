import { useCallback, useState } from 'react';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { PreviewPanel } from '@/components/ui/PreviewPanel';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/useToast';
import { getPdfWorkerClient } from '@/workers/pdf-worker-client';
import type { FormField } from '@/types/pdf';

/**
 * FormFillPage component - Allows users to fill in PDF form fields.
 *
 * Features:
 * - Upload a PDF and detect form fields (text, checkbox, dropdown, radio)
 * - Render each field as an editable input mapped to its type
 * - Fill form fields and download the result
 * - Show toast if no form fields are detected
 * - Show toast if the file is not a valid PDF
 *
 * Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
 */
export function FormFillPage(): JSX.Element {
  const toast = useToast();

  // File state
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Form fields state
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string | boolean>>({});
  const [isDetecting, setIsDetecting] = useState(false);

  // Operation state
  const [isFilling, setIsFilling] = useState(false);
  const [filledData, setFilledData] = useState<ArrayBuffer | null>(null);

  // Preview state
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

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
        setFilledData(null);
        setFormFields([]);
        setFieldValues({});
        setCurrentPage(1);

        // Detect form fields
        setIsDetecting(true);
        try {
          const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
          const fields = await client.getFormFields(data);

          if (fields.length === 0) {
            toast.warning('This PDF contains no form fields.');
            setFormFields([]);
          } else {
            setFormFields(fields);
            // Initialize field values with existing values
            const initialValues: Record<string, string | boolean> = {};
            for (const field of fields) {
              initialValues[field.name] = field.value;
            }
            setFieldValues(initialValues);
            toast.success(`Detected ${fields.length} form field${fields.length > 1 ? 's' : ''}.`);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to detect form fields.';
          toast.error(message);
        } finally {
          setIsDetecting(false);
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

  // Update a field value
  const handleFieldChange = useCallback((fieldName: string, value: string | boolean) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  // Fill form fields and produce the output PDF
  const handleFillFields = useCallback(async () => {
    if (!pdfData) return;

    setIsFilling(true);
    setFilledData(null);

    try {
      const client = getPdfWorkerClient({ onError: (msg) => toast.warning(msg) });
      const result = await client.fillFormFields(pdfData, fieldValues);

      if (result.success && result.data) {
        setFilledData(result.data);
        toast.success('Form fields filled successfully.');
      } else {
        toast.error(result.error ?? 'Failed to fill form fields.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(message);
    } finally {
      setIsFilling(false);
    }
  }, [pdfData, fieldValues, toast]);

  // Download the filled PDF
  const handleDownload = useCallback(() => {
    if (!filledData) return;

    const blob = new Blob([filledData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '_filled.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filledData, fileName]);

  // Reset to upload a different file
  const handleReset = useCallback(() => {
    setPdfData(null);
    setFileName('');
    setFormFields([]);
    setFieldValues({});
    setFilledData(null);
    setCurrentPage(1);
  }, []);

  // If no file uploaded, show upload zone
  if (!pdfData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark">
          Form Fill
        </h1>
        <p className="text-secondary-500 dark:text-secondary-400">
          Upload a PDF with form fields to detect and fill them interactively.
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
            Form Fill
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">{fileName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          Upload different file
        </Button>
      </div>

      {/* Detecting indicator */}
      {isDetecting && (
        <div className="flex items-center gap-2 text-sm text-secondary-500 dark:text-secondary-400">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Detecting form fields...
        </div>
      )}

      {/* Form fields list */}
      {formFields.length > 0 && !isDetecting && (
        <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
          <h2 className="text-sm font-medium text-text-light dark:text-text-dark mb-4">
            Form Fields ({formFields.length})
          </h2>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {formFields.map((field) => (
              <FormFieldInput
                key={field.name}
                field={field}
                value={fieldValues[field.name]}
                onChange={handleFieldChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* No form fields message */}
      {formFields.length === 0 && !isDetecting && pdfData && (
        <div className="rounded-lg border border-secondary-200 bg-secondary-50 p-6 dark:border-secondary-700 dark:bg-secondary-900 text-center">
          <p className="text-secondary-500 dark:text-secondary-400">
            No form fields detected in this PDF.
          </p>
        </div>
      )}

      {/* Action buttons */}
      {formFields.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleFillFields}
            loading={isFilling}
            disabled={isFilling}
          >
            {isFilling ? 'Filling...' : 'Fill Form Fields'}
          </Button>
          {filledData && (
            <Button variant="secondary" onClick={handleDownload}>
              Download Filled PDF
            </Button>
          )}
        </div>
      )}

      {/* Preview panel */}
      {pdfData && (
        <PreviewPanel
          originalDoc={pdfData}
          modifiedDoc={filledData}
          zoom={zoom}
          onZoomChange={setZoom}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

FormFillPage.displayName = 'FormFillPage';

// --- Sub-components ---

interface FormFieldInputProps {
  field: FormField;
  value: string | boolean | undefined;
  onChange: (fieldName: string, value: string | boolean) => void;
}

/**
 * Renders the appropriate input control for a form field based on its type.
 * Maps: text → text input, checkbox → checkbox, dropdown → select, radio → radio group
 */
function FormFieldInput({ field, value, onChange }: FormFieldInputProps): JSX.Element {
  const fieldId = `form-field-${field.name}`;

  switch (field.type) {
    case 'text':
      return (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={fieldId}
            className="text-xs font-medium text-secondary-600 dark:text-secondary-400"
          >
            {field.name}
            <span className="ml-1 text-secondary-400 dark:text-secondary-500">(text)</span>
          </label>
          <input
            id={fieldId}
            type="text"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-text-light placeholder-secondary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700 dark:text-text-dark dark:placeholder-secondary-500 dark:focus:border-primary-400 dark:focus:ring-primary-400 min-h-[44px]"
            placeholder={`Enter ${field.name}`}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-3">
          <input
            id={fieldId}
            type="checkbox"
            checked={typeof value === 'boolean' ? value : false}
            onChange={(e) => onChange(field.name, e.target.checked)}
            className="h-5 w-5 min-w-[44px] min-h-[44px] rounded border-secondary-300 text-primary-600 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700 dark:focus:ring-primary-400 cursor-pointer p-2"
          />
          <label
            htmlFor={fieldId}
            className="text-sm text-secondary-600 dark:text-secondary-400 cursor-pointer"
          >
            {field.name}
            <span className="ml-1 text-secondary-400 dark:text-secondary-500">(checkbox)</span>
          </label>
        </div>
      );

    case 'dropdown':
      return (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={fieldId}
            className="text-xs font-medium text-secondary-600 dark:text-secondary-400"
          >
            {field.name}
            <span className="ml-1 text-secondary-400 dark:text-secondary-500">(dropdown)</span>
          </label>
          <select
            id={fieldId}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.name, e.target.value)}
            className="w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm text-text-light focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700 dark:text-text-dark dark:focus:border-primary-400 dark:focus:ring-primary-400 min-h-[44px]"
          >
            <option value="">-- Select --</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      );

    case 'radio':
      return (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
            {field.name}
            <span className="ml-1 text-secondary-400 dark:text-secondary-500">(radio)</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={value === option}
                  onChange={() => onChange(field.name, option)}
                  className="h-4 w-4 border-secondary-300 text-primary-600 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-700 dark:focus:ring-primary-400"
                />
                <span className="text-sm text-text-light dark:text-text-dark">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      );

    default:
      return (
        <div className="text-sm text-secondary-500 dark:text-secondary-400">
          Unsupported field type: {field.type} ({field.name})
        </div>
      );
  }
}
