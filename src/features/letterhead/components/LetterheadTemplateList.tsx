import { useState } from 'react';

import { Button } from '../../../components/ui/Button';
import { useLetterheadStore } from '../store/letterhead-store';

export interface LetterheadTemplateListProps {
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
}

function formatUpdatedDate(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Updated just now';
  if (diffMinutes < 60) return `Updated ${diffMinutes}m ago`;
  if (diffHours < 24) return `Updated ${diffHours}h ago`;
  if (diffDays < 7) return `Updated ${diffDays}d ago`;

  return `Updated ${new Date(timestamp).toLocaleDateString()}`;
}

export function LetterheadTemplateList({
  onSelect,
  onEdit,
  onCreate,
}: LetterheadTemplateListProps) {
  const { templates, activeTemplateId, deleteTemplate, duplicateTemplate, renameTemplate } =
    useLetterheadStore();

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const handleDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = (id: string) => {
    deleteTemplate(id);
    setConfirmDeleteId(null);
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
  };

  const handleDuplicate = (id: string) => {
    duplicateTemplate(id);
  };

  const handleRenameStart = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameConfirm = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed.length > 0 && trimmed.length <= 50) {
      renameTemplate(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-12">
        {/* Empty state icon - document with plus */}
        <svg
          className="h-12 w-12 text-secondary-400 dark:text-secondary-500"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="8" y="4" width="32" height="40" rx="3" stroke="currentColor" strokeWidth="2" />
          <line x1="14" y1="14" x2="34" y2="14" stroke="currentColor" strokeWidth="2" />
          <line x1="14" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="14" y1="26" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
          <line x1="24" y1="32" x2="24" y2="42" stroke="currentColor" strokeWidth="2.5" />
          <line x1="19" y1="37" x2="29" y2="37" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        <p className="text-center text-sm text-secondary-600 dark:text-secondary-400">
          No letterhead templates yet
        </p>
        <Button variant="primary" size="sm" onClick={onCreate}>
          Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {templates.map((template) => {
        const isActive = template.id === activeTemplateId;
        const isDeleting = confirmDeleteId === template.id;
        const isRenaming = renamingId === template.id;

        return (
          <div
            key={template.id}
            className={[
              'group flex flex-col gap-2 rounded-md border px-3 py-2 transition-colors duration-moderate ease-in-out',
              isActive
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30'
                : 'border-secondary-200 bg-white hover:border-secondary-300 dark:border-secondary-700 dark:bg-secondary-800 dark:hover:border-secondary-600',
            ].join(' ')}
          >
            {/* Template info row */}
            <button
              type="button"
              className="flex w-full cursor-pointer flex-col items-start gap-0.5 text-left"
              onClick={() => onSelect(template.id)}
              aria-label={`Select template ${template.name}`}
            >
              {isRenaming ? (
                <div
                  className="flex w-full items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm(template.id);
                      if (e.key === 'Escape') handleRenameCancel();
                    }}
                    maxLength={50}
                    className="flex-1 rounded border border-primary-400 bg-white px-2 py-0.5 text-sm text-secondary-900 outline-none focus:ring-2 focus:ring-primary-500 dark:border-primary-500 dark:bg-secondary-900 dark:text-secondary-100"
                    autoFocus
                    aria-label="Template name"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameConfirm(template.id);
                    }}
                    className="min-h-[44px] min-w-[44px] rounded p-1 text-xs font-medium text-primary-600 hover:bg-primary-100 dark:text-primary-400 dark:hover:bg-primary-900"
                    aria-label="Confirm rename"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameCancel();
                    }}
                    className="min-h-[44px] min-w-[44px] rounded p-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800"
                    aria-label="Cancel rename"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                    {template.name}
                  </span>
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">
                    {formatUpdatedDate(template.updatedAt)}
                  </span>
                </>
              )}
            </button>

            {/* Delete confirmation */}
            {isDeleting && (
              <div className="flex items-center gap-2 rounded bg-error-50 px-2 py-1.5 dark:bg-error-900/30">
                <span className="flex-1 text-xs text-error-700 dark:text-error-300">
                  Are you sure?
                </span>
                <button
                  type="button"
                  onClick={() => confirmDelete(template.id)}
                  className="min-h-[44px] min-w-[44px] rounded px-2 py-1 text-xs font-medium text-error-700 hover:bg-error-100 dark:text-error-300 dark:hover:bg-error-900"
                  aria-label="Confirm delete"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="min-h-[44px] min-w-[44px] rounded px-2 py-1 text-xs font-medium text-secondary-600 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:bg-secondary-800"
                  aria-label="Cancel delete"
                >
                  No
                </button>
              </div>
            )}

            {/* Action buttons row */}
            {!isRenaming && !isDeleting && (
              <div className="flex items-center gap-1 opacity-0 transition-opacity duration-moderate ease-out group-hover:opacity-100 group-focus-within:opacity-100">
                {/* Edit button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(template.id);
                  }}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-100"
                  aria-label={`Edit ${template.name}`}
                  title="Edit"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M14.5 2.5l3 3L6 17H3v-3L14.5 2.5z" />
                  </svg>
                </button>

                {/* Duplicate button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate(template.id);
                  }}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-100"
                  aria-label={`Duplicate ${template.name}`}
                  title="Duplicate"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <rect x="6" y="6" width="11" height="11" rx="1.5" />
                    <path d="M14 6V4.5A1.5 1.5 0 0012.5 3H4.5A1.5 1.5 0 003 4.5v8A1.5 1.5 0 004.5 14H6" />
                  </svg>
                </button>

                {/* Rename button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameStart(template.id, template.name);
                  }}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-400 dark:hover:bg-secondary-700 dark:hover:text-secondary-100"
                  aria-label={`Rename ${template.name}`}
                  title="Rename"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M3 17h14M7 3h6M10 3v14" />
                  </svg>
                </button>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(template.id);
                  }}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-2 text-secondary-600 hover:bg-error-50 hover:text-error-600 dark:text-secondary-400 dark:hover:bg-error-900/30 dark:hover:text-error-400"
                  aria-label={`Delete ${template.name}`}
                  title="Delete"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M4 5h12M8 5V3h4v2M6 5v11a1 1 0 001 1h6a1 1 0 001-1V5" />
                    <line x1="9" y1="8" x2="9" y2="14" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
