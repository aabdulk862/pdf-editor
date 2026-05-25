import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import type { LetterheadTemplate, LetterheadTextField, Alignment } from '../types';

// Constants
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const FONT_FAMILIES = ['Helvetica', 'Times', 'Courier'];
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 24;
const MIN_LOGO_WIDTH = 50;
const MAX_LOGO_WIDTH = 300;
const MAX_COMPANY_NAME_CHARS = 100;
const MAX_ADDRESS_LINE_CHARS = 80;
const MAX_PHONE_CHARS = 30;
const MAX_EMAIL_CHARS = 100;
const MAX_WEBSITE_CHARS = 100;
const MAX_ADDRESS_LINES = 3;

export interface LetterheadEditorProps {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}

export function LetterheadEditor({ template, onChange }: LetterheadEditorProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <LogoSection logo={template.logo} onChange={onChange} />
      <TextFieldSection
        label="Company Name"
        field={template.companyName}
        maxChars={MAX_COMPANY_NAME_CHARS}
        onChange={(field) => onChange({ companyName: field })}
      />
      <AddressSection
        addressLines={template.addressLines}
        onChange={(lines) => onChange({ addressLines: lines })}
      />
      <TextFieldSection
        label="Phone"
        field={template.phone}
        maxChars={MAX_PHONE_CHARS}
        onChange={(field) => onChange({ phone: field })}
      />
      <TextFieldSection
        label="Email"
        field={template.email}
        maxChars={MAX_EMAIL_CHARS}
        onChange={(field) => onChange({ email: field })}
      />
      <TextFieldSection
        label="Website"
        field={template.website}
        maxChars={MAX_WEBSITE_CHARS}
        onChange={(field) => onChange({ website: field })}
      />
      <TaglineSection tagline={template.tagline} onChange={(tagline) => onChange({ tagline })} />
      <SeparatorSection
        showSeparator={template.showSeparator ?? false}
        separatorColor={template.separatorColor ?? '#E5E7EB'}
        onChange={onChange}
      />
    </div>
  );
}

// ─── Logo Section ────────────────────────────────────────────────────────────

interface LogoSectionProps {
  logo: LetterheadTemplate['logo'];
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}

function LogoSection({ logo, onChange }: LogoSectionProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const validateAndSetLogo = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
        setError('Accepted formats: PNG, JPG, SVG');
        return;
      }

      if (file.size > MAX_LOGO_SIZE) {
        setError('Maximum file size is 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as ArrayBuffer;
        onChange({
          logo: {
            data,
            mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/svg+xml',
            fileName: file.name,
            width: 150,
            alignment: 'left',
          },
        });
      };
      reader.readAsArrayBuffer(file);
    },
    [onChange],
  );

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
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
      const file = e.dataTransfer.files[0];
      if (file) validateAndSetLogo(file);
    },
    [validateAndSetLogo],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSetLogo(file);
      e.target.value = '';
    },
    [validateAndSetLogo],
  );

  const handleRemoveLogo = useCallback(() => {
    onChange({ logo: null });
    setError(null);
  }, [onChange]);

  const handleWidthChange = useCallback(
    (width: number) => {
      if (!logo) return;
      onChange({ logo: { ...logo, width } });
    },
    [logo, onChange],
  );

  const handleAlignmentChange = useCallback(
    (alignment: Alignment) => {
      if (!logo) return;
      onChange({ logo: { ...logo, alignment } });
    },
    [logo, onChange],
  );

  // Generate a preview URL for the logo
  const logoPreviewUrl = logo
    ? URL.createObjectURL(new Blob([logo.data], { type: logo.mimeType }))
    : null;

  return (
    <fieldset className="rounded-lg border border-secondary-200 p-4 dark:border-secondary-700">
      <legend className="px-2 text-sm font-medium text-text-light dark:text-text-dark">Logo</legend>

      {!logo ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload logo. Drag and drop or click to browse. Accepts PNG, JPG, SVG up to 5MB."
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={[
            'flex min-h-[120px] cursor-pointer flex-col items-center justify-center',
            'rounded-md border-2 border-dashed p-4 transition-colors duration-normal ease-in-out',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-offset-background-dark',
            isDragOver
              ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
              : 'border-secondary-300 hover:border-primary-400 dark:border-secondary-600 dark:hover:border-primary-500',
          ].join(' ')}
        >
          <svg
            className="mb-2 h-6 w-6 text-secondary-400 dark:text-secondary-500"
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
          <p className="text-sm text-secondary-600 dark:text-secondary-300">
            <span className="text-primary-600 dark:text-primary-400">Click to browse</span>
            {' or drag and drop'}
          </p>
          <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
            PNG, JPG, SVG — Max 5MB
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {logoPreviewUrl && (
              <img
                src={logoPreviewUrl}
                alt="Logo preview"
                className="h-12 w-auto max-w-[100px] rounded border border-secondary-200 object-contain dark:border-secondary-700"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-light dark:text-text-dark">
                {logo.fileName}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemoveLogo} aria-label="Remove logo">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {/* Width slider */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
              Width: {logo.width}px
            </label>
            <input
              type="range"
              min={MIN_LOGO_WIDTH}
              max={MAX_LOGO_WIDTH}
              value={logo.width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary-200 accent-primary-600 dark:bg-secondary-700"
              aria-label={`Logo width: ${logo.width} pixels`}
            />
          </div>

          {/* Alignment */}
          <AlignmentToggles
            value={logo.alignment}
            onChange={handleAlignmentChange}
            label="Logo alignment"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-error-600 dark:text-error-400">
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </fieldset>
  );
}

// ─── Text Field Section ──────────────────────────────────────────────────────

interface TextFieldSectionProps {
  label: string;
  field: LetterheadTextField;
  maxChars: number;
  onChange: (field: LetterheadTextField) => void;
}

function TextFieldSection({
  label,
  field,
  maxChars,
  onChange,
}: TextFieldSectionProps): JSX.Element {
  const charCount = field.content.length;
  const isOverLimit = charCount > maxChars;

  return (
    <fieldset className="rounded-lg border border-secondary-200 p-4 dark:border-secondary-700">
      <legend className="px-2 text-sm font-medium text-text-light dark:text-text-dark">
        {label}
      </legend>

      <div className="space-y-3">
        <div>
          <Input
            label={label}
            value={field.content}
            onChange={(e) => onChange({ ...field, content: e.target.value })}
            placeholder={`Enter ${label.toLowerCase()}`}
            fullWidth
            error={isOverLimit ? `Exceeds ${maxChars} character limit` : undefined}
            aria-describedby={`${label}-char-count`}
          />
          <p
            id={`${label}-char-count`}
            className={[
              'mt-1 text-xs',
              isOverLimit
                ? 'text-error-600 dark:text-error-400'
                : 'text-secondary-500 dark:text-secondary-400',
            ].join(' ')}
          >
            {charCount}/{maxChars}
          </p>
        </div>

        <FontControls field={field} onChange={onChange} />
      </div>
    </fieldset>
  );
}

// ─── Address Section ─────────────────────────────────────────────────────────

interface AddressSectionProps {
  addressLines: LetterheadTextField[];
  onChange: (lines: LetterheadTextField[]) => void;
}

function AddressSection({ addressLines, onChange }: AddressSectionProps): JSX.Element {
  const handleLineChange = (index: number, field: LetterheadTextField) => {
    const updated = [...addressLines];
    updated[index] = field;
    onChange(updated);
  };

  const handleAddLine = () => {
    if (addressLines.length >= MAX_ADDRESS_LINES) return;
    const defaultLine: LetterheadTextField = {
      content: '',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#000000',
      alignment: 'left',
    };
    onChange([...addressLines, defaultLine]);
  };

  const handleRemoveLine = (index: number) => {
    const updated = addressLines.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <fieldset className="rounded-lg border border-secondary-200 p-4 dark:border-secondary-700">
      <legend className="px-2 text-sm font-medium text-text-light dark:text-text-dark">
        Address Lines
      </legend>

      <div className="space-y-3">
        {addressLines.map((line, index) => {
          const charCount = line.content.length;
          const isOverLimit = charCount > MAX_ADDRESS_LINE_CHARS;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    label={`Line ${index + 1}`}
                    value={line.content}
                    onChange={(e) => handleLineChange(index, { ...line, content: e.target.value })}
                    placeholder={`Address line ${index + 1}`}
                    fullWidth
                    error={
                      isOverLimit ? `Exceeds ${MAX_ADDRESS_LINE_CHARS} character limit` : undefined
                    }
                  />
                  <p
                    className={[
                      'mt-1 text-xs',
                      isOverLimit
                        ? 'text-error-600 dark:text-error-400'
                        : 'text-secondary-500 dark:text-secondary-400',
                    ].join(' ')}
                  >
                    {charCount}/{MAX_ADDRESS_LINE_CHARS}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveLine(index)}
                  aria-label={`Remove address line ${index + 1}`}
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              <FontControls field={line} onChange={(updated) => handleLineChange(index, updated)} />
            </div>
          );
        })}

        {addressLines.length < MAX_ADDRESS_LINES && (
          <Button variant="outline" size="sm" onClick={handleAddLine}>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Line
          </Button>
        )}
      </div>
    </fieldset>
  );
}

// ─── Tagline Section ─────────────────────────────────────────────────────────

interface TaglineSectionProps {
  tagline: LetterheadTextField | null;
  onChange: (tagline: LetterheadTextField | null) => void;
}

function TaglineSection({ tagline, onChange }: TaglineSectionProps): JSX.Element {
  const handleAdd = () => {
    onChange({
      content: '',
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#666666',
      alignment: 'center',
    });
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <fieldset className="rounded-lg border border-secondary-200 p-4 dark:border-secondary-700">
      <legend className="px-2 text-sm font-medium text-text-light dark:text-text-dark">
        Tagline (Optional)
      </legend>

      {!tagline ? (
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Tagline
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                label="Tagline"
                value={tagline.content}
                onChange={(e) => onChange({ ...tagline, content: e.target.value })}
                placeholder="Enter tagline"
                fullWidth
              />
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemove} aria-label="Remove tagline">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
          <FontControls field={tagline} onChange={(updated) => onChange(updated)} />
        </div>
      )}
    </fieldset>
  );
}

// ─── Font Controls ───────────────────────────────────────────────────────────

interface FontControlsProps {
  field: LetterheadTextField;
  onChange: (field: LetterheadTextField) => void;
}

function FontControls({ field, onChange }: FontControlsProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {/* Font Family */}
      <div className="min-w-[120px]">
        <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
          Font
        </label>
        <select
          value={field.fontFamily}
          onChange={(e) => onChange({ ...field, fontFamily: e.target.value })}
          className={[
            'min-h-[44px] w-full rounded-md border border-secondary-300 bg-white px-3 py-2 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
            'dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark',
          ].join(' ')}
          aria-label="Font family"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="min-w-[100px]">
        <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
          Size: {field.fontSize}pt
        </label>
        <input
          type="range"
          min={MIN_FONT_SIZE}
          max={MAX_FONT_SIZE}
          value={field.fontSize}
          onChange={(e) => onChange({ ...field, fontSize: Number(e.target.value) })}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary-200 accent-primary-600 dark:bg-secondary-700"
          aria-label={`Font size: ${field.fontSize} points`}
        />
      </div>

      {/* Color Picker */}
      <div>
        <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
          Color
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={field.color}
            onChange={(e) => onChange({ ...field, color: e.target.value })}
            className="h-[44px] w-[44px] cursor-pointer rounded-md border border-secondary-300 p-1 dark:border-secondary-600"
            aria-label="Text color"
          />
          <span className="text-xs text-secondary-500 dark:text-secondary-400">{field.color}</span>
        </div>
      </div>

      {/* Alignment */}
      <AlignmentToggles
        value={field.alignment}
        onChange={(alignment) => onChange({ ...field, alignment })}
        label="Text alignment"
      />
    </div>
  );
}

// ─── Alignment Toggles ───────────────────────────────────────────────────────

interface AlignmentTogglesProps {
  value: Alignment;
  onChange: (alignment: Alignment) => void;
  label: string;
}

function AlignmentToggles({ value, onChange, label }: AlignmentTogglesProps): JSX.Element {
  const alignments: { key: Alignment; icon: JSX.Element; ariaLabel: string }[] = [
    {
      key: 'left',
      ariaLabel: 'Align left',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h10.5M3.75 17.25h16.5"
          />
        </svg>
      ),
    },
    {
      key: 'center',
      ariaLabel: 'Align center',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M6.75 12h10.5M3.75 17.25h16.5"
          />
        </svg>
      ),
    },
    {
      key: 'right',
      ariaLabel: 'Align right',
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M7.5 12h13.5M3.75 17.25h16.5"
          />
        </svg>
      ),
    },
  ];

  return (
    <div role="group" aria-label={label}>
      <span className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
        Align
      </span>
      <div className="inline-flex rounded-md border border-secondary-300 dark:border-secondary-600">
        {alignments.map(({ key, icon, ariaLabel }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={ariaLabel}
            aria-pressed={value === key}
            className={[
              'inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-3 py-2',
              'transition-colors duration-normal ease-in-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
              'first:rounded-l-md last:rounded-r-md',
              value === key
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                : 'bg-white text-secondary-600 hover:bg-secondary-50 dark:bg-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700',
            ].join(' ')}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Separator Section ───────────────────────────────────────────────────────

interface SeparatorSectionProps {
  showSeparator: boolean;
  separatorColor: string;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}

function SeparatorSection({
  showSeparator,
  separatorColor,
  onChange,
}: SeparatorSectionProps): JSX.Element {
  return (
    <fieldset className="rounded-lg border border-secondary-200 p-4 dark:border-secondary-700">
      <legend className="px-2 text-sm font-medium text-text-light dark:text-text-dark">
        Separator Line
      </legend>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={showSeparator}
            onChange={(e) => onChange({ showSeparator: e.target.checked })}
            className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 dark:border-secondary-600"
          />
          <span className="text-sm text-text-light dark:text-text-dark">
            Show horizontal line between header and body
          </span>
        </label>

        {showSeparator && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-text-light dark:text-text-dark">
              Line Color
            </label>
            <input
              type="color"
              value={separatorColor}
              onChange={(e) => onChange({ separatorColor: e.target.value })}
              className="h-[36px] w-[36px] cursor-pointer rounded border border-secondary-300 p-0.5 dark:border-secondary-600"
              aria-label="Separator line color"
            />
            <span className="text-xs text-secondary-500 dark:text-secondary-400">
              {separatorColor}
            </span>
          </div>
        )}
      </div>
    </fieldset>
  );
}

LetterheadEditor.displayName = 'LetterheadEditor';
