import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import type { LetterheadLayout, LetterheadTemplate } from '../types';
import { DEFAULT_LETTER_BODY, getEffectiveLetterBody } from '../utils/defaults';
import { LetterBodyEditor } from './LetterBodyEditor';

export { getEffectiveLetterBody };

// Constants
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
const FONT_FAMILIES = ['Helvetica', 'Times', 'Courier'];
const LAYOUT_OPTIONS: { value: LetterheadLayout; label: string }[] = [
  { value: 'logo-center', label: 'Logo Center (3-column)' },
  { value: 'logo-left', label: 'Logo Left' },
  { value: 'logo-right', label: 'Logo Right' },
  { value: 'centered', label: 'Centered' },
  { value: 'minimal', label: 'Minimal' },
];

export interface LetterheadVisualEditorProps {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}

/**
 * LetterheadVisualEditor — A visual layout editor that renders the letterhead
 * as a mini page preview with clickable/editable zones.
 *
 * Instead of a vertical list of fieldsets, this shows the actual letterhead layout
 * and lets users click into zones to edit content inline.
 */
export function LetterheadVisualEditor({
  template,
  onChange,
}: LetterheadVisualEditorProps): JSX.Element {
  const layout = template.layout ?? 'centered';

  const insertAtCursor = (text: string) => {
    const ta = document.getElementById('letter-body-editor') as HTMLTextAreaElement | null;
    if (!ta) {
      onChange({ letterBody: (template.letterBody ?? '') + text });
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const current = template.letterBody ?? DEFAULT_LETTER_BODY;
    const newBody = current.substring(0, start) + text + current.substring(end);
    onChange({ letterBody: newBody });
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    }, 0);
  };

  const todayDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Toolbar row: layout + helpers */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={layout}
          onChange={(e) => onChange({ layout: e.target.value as LetterheadLayout })}
          className="rounded-md border border-secondary-300 bg-white px-2 py-1.5 text-xs
            focus:outline-none focus:ring-2 focus:ring-primary-500
            dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark"
          aria-label="Header layout"
        >
          {LAYOUT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="h-4 w-px bg-secondary-300 dark:bg-secondary-600" />

        <button
          type="button"
          onClick={() => insertAtCursor(todayDate + '\n\n')}
          className="rounded px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800"
        >
          + Date
        </button>
        <button
          type="button"
          onClick={() =>
            insertAtCursor(
              '[Recipient Name]\n[Title]\n[Organization]\n[Address]\n[City, State ZIP]\n\n',
            )
          }
          className="rounded px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800"
        >
          + Recipient
        </button>
        <button
          type="button"
          onClick={() => insertAtCursor('\n\nSincerely,\n\n[Your Name]\n[Title]')}
          className="rounded px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800"
        >
          + Sign-off
        </button>
      </div>

      {/* Page-like container: looks like real paper */}
      <div className="mx-auto max-w-[8.5in] bg-secondary-100 dark:bg-secondary-900 p-8 rounded-lg">
        <div
          id="letterhead-page-content"
          className="bg-white shadow-[0_2px_20px_rgba(0,0,0,0.12)] rounded-sm"
          style={{
            padding: '0.6in 1in 1in 1in',
            fontFamily: 'Helvetica, Arial, sans-serif',
            minHeight: '11in',
          }}
        >
          {/* Header zone */}
          <HeaderZone template={template} layout={layout} onChange={onChange} />
          {template.showSeparator && (
            <div
              className="mt-3 mb-6 h-px w-full"
              style={{ backgroundColor: template.separatorColor ?? '#E5E7EB' }}
            />
          )}
          {!template.showSeparator && <div className="mt-6" />}

          {/* Letter body — TipTap paginated editor */}
          <LetterBodyEditor
            content={template.letterBody ?? DEFAULT_LETTER_BODY}
            onChange={(text) => onChange({ letterBody: text })}
          />
        </div>
      </div>

      {/* Controls panel below */}
      <ControlsPanel template={template} onChange={onChange} />
    </div>
  );
}

// ─── Header Zone ─────────────────────────────────────────────────────────────

interface HeaderZoneProps {
  template: LetterheadTemplate;
  layout: LetterheadLayout;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}

function HeaderZone({ template, layout, onChange }: HeaderZoneProps): JSX.Element {
  switch (layout) {
    case 'logo-center':
      return <LogoCenterHeader template={template} onChange={onChange} />;
    case 'logo-left':
      return <LogoSideHeader template={template} onChange={onChange} side="left" />;
    case 'logo-right':
      return <LogoSideHeader template={template} onChange={onChange} side="right" />;
    case 'centered':
      return <CenteredHeader template={template} onChange={onChange} />;
    case 'minimal':
      return <MinimalHeader template={template} onChange={onChange} />;
  }
}

// ─── Logo Center Layout ──────────────────────────────────────────────────────

function LogoCenterHeader({
  template,
  onChange,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}): JSX.Element {
  return (
    <div className="space-y-2">
      {/* Three-column: left text | logo | right text */}
      <div className="grid grid-cols-3 items-center gap-2">
        <EditableZone
          value={template.headerLeftText ?? ''}
          placeholder="Left text..."
          onChange={(val) => onChange({ headerLeftText: val })}
          className="text-right text-xs"
          style={{
            fontFamily: template.companyName.fontFamily,
            color: template.companyName.color,
          }}
        />
        <LogoDropZone template={template} onChange={onChange} />
        <EditableZone
          value={template.headerRightText ?? ''}
          placeholder="Right text..."
          onChange={(val) => onChange({ headerRightText: val })}
          className="text-left text-xs"
          style={{
            fontFamily: template.companyName.fontFamily,
            color: template.companyName.color,
          }}
        />
      </div>
      {/* Contact bar */}
      <ContactBarZone template={template} onChange={onChange} />
    </div>
  );
}

// ─── Logo Side Layout ────────────────────────────────────────────────────────

function LogoSideHeader({
  template,
  onChange,
  side,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
  side: 'left' | 'right';
}): JSX.Element {
  const logoZone = <LogoDropZone template={template} onChange={onChange} />;
  const textZone = (
    <div className="flex flex-col justify-center gap-1">
      <EditableZone
        value={template.companyName.content}
        placeholder="Company Name"
        onChange={(val) => onChange({ companyName: { ...template.companyName, content: val } })}
        className="text-sm font-bold"
        style={{
          fontFamily: template.companyName.fontFamily,
          fontSize: `${template.companyName.fontSize}px`,
          color: template.companyName.color,
        }}
      />
      {template.tagline && (
        <EditableZone
          value={template.tagline.content}
          placeholder="Tagline..."
          onChange={(val) =>
            onChange({ tagline: template.tagline ? { ...template.tagline, content: val } : null })
          }
          className="text-xs italic"
          style={{
            fontFamily: template.tagline.fontFamily,
            color: template.tagline.color,
          }}
        />
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {side === 'left' ? (
          <>
            {logoZone}
            {textZone}
          </>
        ) : (
          <>
            {textZone}
            <div className="ml-auto">{logoZone}</div>
          </>
        )}
      </div>
      <ContactBarZone template={template} onChange={onChange} />
    </div>
  );
}

// ─── Centered Layout ─────────────────────────────────────────────────────────

function CenteredHeader({
  template,
  onChange,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center space-y-2">
      <LogoDropZone template={template} onChange={onChange} />
      <EditableZone
        value={template.companyName.content}
        placeholder="Company Name"
        onChange={(val) => onChange({ companyName: { ...template.companyName, content: val } })}
        className="text-center text-sm font-bold"
        style={{
          fontFamily: template.companyName.fontFamily,
          fontSize: `${template.companyName.fontSize}px`,
          color: template.companyName.color,
        }}
      />
      {template.tagline && (
        <EditableZone
          value={template.tagline.content}
          placeholder="Tagline..."
          onChange={(val) =>
            onChange({ tagline: template.tagline ? { ...template.tagline, content: val } : null })
          }
          className="text-center text-xs italic"
          style={{
            fontFamily: template.tagline.fontFamily,
            color: template.tagline.color,
          }}
        />
      )}
      <ContactBarZone template={template} onChange={onChange} />
    </div>
  );
}

// ─── Minimal Layout ──────────────────────────────────────────────────────────

function MinimalHeader({
  template,
  onChange,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}): JSX.Element {
  return (
    <div>
      <EditableZone
        value={template.companyName.content}
        placeholder="Company Name"
        onChange={(val) => onChange({ companyName: { ...template.companyName, content: val } })}
        className="text-sm font-bold"
        style={{
          fontFamily: template.companyName.fontFamily,
          fontSize: `${template.companyName.fontSize}px`,
          color: template.companyName.color,
        }}
      />
    </div>
  );
}

// ─── Contact Bar Zone ────────────────────────────────────────────────────────

function ContactBarZone({
  template,
  onChange,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}): JSX.Element {
  const parts: string[] = [];
  if (template.phone.content) parts.push(template.phone.content);
  if (template.email.content) parts.push(template.email.content);
  if (template.website.content) parts.push(template.website.content);

  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <div className="space-y-1 rounded border border-primary-300 bg-primary-50/50 p-2 dark:border-primary-700 dark:bg-primary-900/20">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={template.phone.content}
            onChange={(e) => onChange({ phone: { ...template.phone, content: e.target.value } })}
            placeholder="Phone"
            className="flex-1 rounded border border-secondary-200 px-2 py-1 text-xs
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark"
          />
          <input
            type="text"
            value={template.email.content}
            onChange={(e) => onChange({ email: { ...template.email, content: e.target.value } })}
            placeholder="Email"
            className="flex-1 rounded border border-secondary-200 px-2 py-1 text-xs
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={template.website.content}
            onChange={(e) =>
              onChange({ website: { ...template.website, content: e.target.value } })
            }
            placeholder="Website"
            className="flex-1 rounded border border-secondary-200 px-2 py-1 text-xs
              focus:outline-none focus:ring-1 focus:ring-primary-500
              dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark"
          />
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className="group w-full min-h-[28px] rounded border border-transparent px-2 py-1 text-center text-xs
        transition-colors hover:border-dashed hover:border-secondary-300
        dark:hover:border-secondary-600"
      style={{ color: template.phone.color || '#6b7280' }}
      aria-label="Edit contact information"
    >
      {parts.length > 0 ? (
        <span>{parts.join('  •  ')}</span>
      ) : (
        <span className="text-secondary-400 italic">Click to add contact info</span>
      )}
    </button>
  );
}

// ─── Contact Footer Zone (for minimal layout) ───────────────────────────────

// ─── Editable Zone ───────────────────────────────────────────────────────────

interface EditableZoneProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

function EditableZone({
  value,
  placeholder,
  onChange,
  className = '',
  style,
}: EditableZoneProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    setIsEditing(true);
    // Focus the input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }, []);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full rounded border border-primary-400 bg-white px-1 py-0.5 outline-none
          ring-2 ring-primary-200 dark:border-primary-600 dark:bg-secondary-800
          dark:text-text-dark dark:ring-primary-800 ${className}`}
        style={style}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`min-h-[24px] w-full cursor-text rounded border border-transparent px-1 py-0.5
        text-left transition-colors hover:border-dashed hover:border-secondary-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        dark:hover:border-secondary-600 ${className}`}
      style={style}
      aria-label={`Edit ${placeholder}`}
    >
      {value || <span className="text-secondary-400 italic">{placeholder}</span>}
    </button>
  );
}

// ─── Logo Drop Zone ──────────────────────────────────────────────────────────

function LogoDropZone({
  template,
  onChange,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const validateAndSetLogo = useCallback(
    (file: File) => {
      setError(null);
      if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
        setError('PNG, JPG, SVG only');
        return;
      }
      if (file.size > MAX_LOGO_SIZE) {
        setError('Max 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        onChange({
          logo: {
            data: reader.result as ArrayBuffer,
            mimeType: file.type as 'image/png' | 'image/jpeg' | 'image/svg+xml',
            fileName: file.name,
            width: 150,
            alignment: 'center',
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

  // Generate preview URL
  const logoPreviewUrl = template.logo
    ? URL.createObjectURL(new Blob([template.logo.data], { type: template.logo.mimeType }))
    : null;

  if (template.logo && logoPreviewUrl) {
    return (
      <div className="group relative flex min-h-[60px] items-center justify-center">
        <img
          src={logoPreviewUrl}
          alt="Logo"
          className="max-h-[60px] max-w-[100px] object-contain"
        />
        <button
          type="button"
          onClick={() => onChange({ logo: null })}
          className="absolute -right-1 -top-1 hidden rounded-full bg-error-500 p-0.5 text-white
            shadow-sm group-hover:block"
          aria-label="Remove logo"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload logo. Drag and drop or click to browse."
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
        'flex min-h-[60px] min-w-[80px] cursor-pointer flex-col items-center justify-center',
        'rounded border-2 border-dashed p-2 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        isDragOver
          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
          : 'border-secondary-300 hover:border-primary-400 dark:border-secondary-600',
      ].join(' ')}
    >
      <svg
        className="h-5 w-5 text-secondary-400"
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
      <span className="mt-1 text-[9px] text-secondary-400">Logo</span>
      {error && <span className="text-[9px] text-error-500">{error}</span>}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_LOGO_TYPES.join(',')}
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

// ─── Controls Panel ──────────────────────────────────────────────────────────

function ControlsPanel({
  template,
  onChange,
}: {
  template: LetterheadTemplate;
  onChange: (updates: Partial<LetterheadTemplate>) => void;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-4 dark:border-secondary-700 dark:bg-secondary-800">
      <h3 className="mb-3 text-sm font-medium text-text-light dark:text-text-dark">
        Style & Details
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Template name */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
            Template Name
          </label>
          <input
            type="text"
            value={template.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full rounded-md border border-secondary-300 px-3 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500
              dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark"
          />
        </div>

        {/* Font family */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
            Font Family
          </label>
          <select
            value={template.companyName.fontFamily}
            onChange={(e) => {
              const fontFamily = e.target.value;
              onChange({
                companyName: { ...template.companyName, fontFamily },
                phone: { ...template.phone, fontFamily },
                email: { ...template.email, fontFamily },
                website: { ...template.website, fontFamily },
                ...(template.tagline ? { tagline: { ...template.tagline, fontFamily } } : {}),
              });
            }}
            className="w-full rounded-md border border-secondary-300 px-3 py-1.5 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500
              dark:border-secondary-600 dark:bg-secondary-800 dark:text-text-dark"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {/* Company name color */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
            Brand Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={template.companyName.color}
              onChange={(e) =>
                onChange({ companyName: { ...template.companyName, color: e.target.value } })
              }
              className="h-[32px] w-[32px] cursor-pointer rounded border border-secondary-300 p-0.5
                dark:border-secondary-600"
              aria-label="Brand color"
            />
            <span className="text-xs text-secondary-500">{template.companyName.color}</span>
          </div>
        </div>

        {/* Separator toggle */}
        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={template.showSeparator ?? false}
              onChange={(e) => onChange({ showSeparator: e.target.checked })}
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500
                dark:border-secondary-600"
            />
            <span className="text-xs font-medium text-text-light dark:text-text-dark">
              Show separator line
            </span>
          </label>
          {template.showSeparator && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="color"
                value={template.separatorColor ?? '#E5E7EB'}
                onChange={(e) => onChange({ separatorColor: e.target.value })}
                className="h-[24px] w-[24px] cursor-pointer rounded border border-secondary-300 p-0.5
                  dark:border-secondary-600"
                aria-label="Separator color"
              />
              <span className="text-xs text-secondary-500">
                {template.separatorColor ?? '#E5E7EB'}
              </span>
            </div>
          )}
        </div>

        {/* Tagline toggle */}
        <div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={template.tagline !== null}
              onChange={(e) => {
                if (e.target.checked) {
                  onChange({
                    tagline: {
                      content: '',
                      fontFamily: template.companyName.fontFamily,
                      fontSize: 10,
                      color: '#9ca3af',
                      alignment: 'center',
                    },
                  });
                } else {
                  onChange({ tagline: null });
                }
              }}
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500
                dark:border-secondary-600"
            />
            <span className="text-xs font-medium text-text-light dark:text-text-dark">
              Include tagline
            </span>
          </label>
        </div>

        {/* Font size */}
        <div>
          <label className="mb-1 block text-xs font-medium text-text-light dark:text-text-dark">
            Name Size: {template.companyName.fontSize}pt
          </label>
          <input
            type="range"
            min={8}
            max={24}
            value={template.companyName.fontSize}
            onChange={(e) =>
              onChange({
                companyName: { ...template.companyName, fontSize: Number(e.target.value) },
              })
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary-200
              accent-primary-600 dark:bg-secondary-700"
            aria-label="Company name font size"
          />
        </div>
      </div>
    </div>
  );
}

LetterheadVisualEditor.displayName = 'LetterheadVisualEditor';
