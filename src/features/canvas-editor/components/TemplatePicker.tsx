import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useCanvasStore } from '../store/canvas-store';
import {
  CATEGORY_LABELS,
  getAllTemplates,
  getTemplateById,
  getTemplateCategories,
} from '../templates';
import type { CanvasTemplate, TemplateCategory } from '../types';

export interface TemplatePickerProps {
  /** Whether the picker modal is open */
  isOpen: boolean;
  /** Callback when the picker should close */
  onClose: () => void;
  /** Optional callback after a template is selected and document created */
  onSelect?: (templateId: string) => void;
}

/**
 * TemplatePicker — modal overlay for browsing and selecting document templates.
 *
 * Displays templates categorized by type with visual thumbnail previews (min 120×160px).
 * Selecting a template creates an independent deep copy of the document (no reference
 * to the original template data).
 *
 * Requirements: 8.1, 8.2, 8.4, 8.5
 */
export function TemplatePicker({ isOpen, onClose, onSelect }: TemplatePickerProps): ReactNode {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [activeCategory, setActiveCategory] = useState<TemplateCategory | 'all'>('all');
  const [isCreating, setIsCreating] = useState(false);

  const loadDocument = useCanvasStore((state) => state.loadDocument);

  // Get templates and categories
  const allTemplates = useMemo(() => getAllTemplates(), []);
  const categories = useMemo(() => getTemplateCategories(), []);

  // Filter templates by active category
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return allTemplates;
    return allTemplates.filter((t) => t.category === activeCategory);
  }, [allTemplates, activeCategory]);

  // Group templates by category for display
  const groupedTemplates = useMemo(() => {
    if (activeCategory !== 'all') {
      return [{ category: activeCategory as TemplateCategory, templates: filteredTemplates }];
    }

    const groups: { category: TemplateCategory; templates: CanvasTemplate[] }[] = [];
    for (const cat of categories) {
      const catTemplates = allTemplates.filter((t) => t.category === cat);
      if (catTemplates.length > 0) {
        groups.push({ category: cat, templates: catTemplates });
      }
    }
    return groups;
  }, [activeCategory, filteredTemplates, allTemplates, categories]);

  // Open/close the dialog element
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else {
      dialog.close();
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Handle native cancel event (Escape key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  // Handle click on backdrop
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle template selection — creates an independent copy
  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      const template = getTemplateById(templateId);
      if (!template) return;

      setIsCreating(true);

      // Use structuredClone to create a fully independent deep copy
      const clonedPages = structuredClone(template.pages);

      // Generate new unique IDs for the document and all pages/elements
      const timestamp = Date.now();
      const newDoc = {
        id: `${timestamp}-${Math.random().toString(36).slice(2, 11)}`,
        name: template.name,
        pages: clonedPages.map((page, pageIdx) => ({
          ...page,
          id: `${timestamp}-page-${pageIdx}-${Math.random().toString(36).slice(2, 9)}`,
          elements: page.elements.map((el, elIdx) => ({
            ...el,
            id: `${timestamp}-el-${pageIdx}-${elIdx}-${Math.random().toString(36).slice(2, 9)}`,
          })),
        })),
        activePageIndex: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      loadDocument(newDoc);
      setIsCreating(false);
      onSelect?.(templateId);
      onClose();
    },
    [loadDocument, onSelect, onClose],
  );

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="template-picker-title"
      className={[
        'fixed inset-0 m-auto rounded-xl border-none p-0 shadow-level-4',
        'backdrop:bg-black/50 backdrop:backdrop-blur-sm',
        'bg-white dark:bg-secondary-800',
        'w-[calc(100%-2rem)] max-w-3xl max-h-[85vh]',
        'animate-in fade-in duration-normal motion-reduce:animate-none',
      ].join(' ')}
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-secondary-200 px-6 py-4 dark:border-secondary-700">
          <h2
            id="template-picker-title"
            className="text-lg font-semibold text-text-light dark:text-text-dark"
          >
            Choose a Template
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close template picker"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-secondary-500 transition-colors duration-normal ease-in-out hover:bg-secondary-100 hover:text-secondary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-200"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        {/* Category Filter Tabs */}
        <div className="border-b border-secondary-200 px-6 py-3 dark:border-secondary-700">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              aria-pressed={activeCategory === 'all'}
              className={[
                'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-normal ease-in-out',
                'min-h-[44px] md:min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                activeCategory === 'all'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700 dark:hover:text-secondary-100',
              ].join(' ')}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
                className={[
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors duration-normal ease-in-out',
                  'min-h-[44px] md:min-h-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  activeCategory === cat
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700 dark:hover:text-secondary-100',
                ].join(' ')}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Template Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {groupedTemplates.map((group) => (
            <div key={group.category} className="mb-6 last:mb-0">
              {activeCategory === 'all' && (
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary-500 dark:text-secondary-400">
                  {CATEGORY_LABELS[group.category]}
                </h3>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {group.templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onSelect={handleSelectTemplate}
                    disabled={isCreating}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}

// === Template Card ===

interface TemplateCardProps {
  template: CanvasTemplate;
  onSelect: (templateId: string) => void;
  disabled: boolean;
}

function TemplateCard({ template, onSelect, disabled }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      disabled={disabled}
      aria-label={`Use ${template.name} template`}
      className={[
        'group flex flex-col items-center gap-2 rounded-lg border border-secondary-200 p-3',
        'transition-[transform,border-color,box-shadow] duration-normal ease-in-out motion-reduce:transition-none motion-reduce:transform-none',
        'hover:border-primary-300 hover:shadow-level-2 hover:scale-[1.02]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'dark:border-secondary-600 dark:hover:border-primary-500',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ].join(' ')}
    >
      {/* Thumbnail Preview — min 120×160px */}
      <div className="flex min-h-[160px] min-w-[120px] items-center justify-center overflow-hidden rounded-md bg-secondary-50 dark:bg-secondary-700">
        <img
          src={template.thumbnail}
          alt={`${template.name} template preview`}
          className="h-[160px] w-[120px] object-contain"
          loading="lazy"
        />
      </div>

      {/* Template Name */}
      <span className="text-center text-sm font-medium text-secondary-700 group-hover:text-primary-700 dark:text-secondary-200 dark:group-hover:text-primary-300">
        {template.name}
      </span>
    </button>
  );
}
