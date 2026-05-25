import { Button } from '../../../components/ui/Button';
import { STARTER_TEMPLATES, type StarterTemplateData } from '../starter-templates';

export interface StarterTemplatePickerProps {
  onSelect: (data: StarterTemplateData) => void;
  onSelectBlank: () => void;
  onCancel: () => void;
}

/**
 * StarterTemplatePicker — Shows a grid of starter template options + a blank option.
 * Displayed when the user clicks "New Letterhead" instead of immediately creating a blank template.
 */
export function StarterTemplatePicker({
  onSelect,
  onSelectBlank,
  onCancel,
}: StarterTemplatePickerProps): JSX.Element {
  return (
    <div className="rounded-lg border border-secondary-200 bg-white p-6 dark:border-secondary-700 dark:bg-secondary-800">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">
            Choose a Starting Point
          </h2>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Pick a starter template or start from scratch.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} aria-label="Cancel">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Blank template option */}
        <button
          type="button"
          onClick={onSelectBlank}
          className={[
            'group flex flex-col items-center gap-3 rounded-lg border-2 border-dashed',
            'border-secondary-300 p-5 text-center transition-all duration-fast ease-in-out',
            'hover:border-primary-400 hover:bg-primary-50',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
            'dark:border-secondary-600 dark:hover:border-primary-500 dark:hover:bg-primary-900/20',
            'dark:focus-visible:ring-offset-background-dark',
          ].join(' ')}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-100 text-secondary-500 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-secondary-700 dark:text-secondary-400 dark:group-hover:bg-primary-900 dark:group-hover:text-primary-400">
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
          </div>
          <div>
            <p className="text-sm font-medium text-text-light dark:text-text-dark">Blank</p>
            <p className="mt-0.5 text-xs text-secondary-500 dark:text-secondary-400">
              Start from scratch
            </p>
          </div>
        </button>

        {/* Starter templates */}
        {STARTER_TEMPLATES.map((starter) => (
          <button
            key={starter.key}
            type="button"
            onClick={() => onSelect(starter.create())}
            className={[
              'group flex flex-col items-center gap-3 rounded-lg border',
              'border-secondary-200 p-5 text-center transition-all duration-fast ease-in-out',
              'hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
              'dark:border-secondary-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/20',
              'dark:focus-visible:ring-offset-background-dark',
            ].join(' ')}
          >
            <StarterTemplateIcon templateKey={starter.key} />
            <div>
              <p className="text-sm font-medium text-text-light dark:text-text-dark">
                {starter.name}
              </p>
              <p className="mt-0.5 text-xs text-secondary-500 dark:text-secondary-400">
                {starter.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Simple icon representations for each starter template style.
 */
function StarterTemplateIcon({ templateKey }: { templateKey: string }): JSX.Element {
  const baseClass = 'h-10 w-10 rounded bg-secondary-50 p-1.5 dark:bg-secondary-700/50';

  switch (templateKey) {
    case 'classic':
      return (
        <svg className={baseClass} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="8" height="6" rx="1" fill="#6b7280" />
          <rect x="20" y="5" width="16" height="3" rx="1" fill="#374151" />
          <rect x="24" y="10" width="12" height="2" rx="0.5" fill="#9ca3af" />
          <line x1="4" y1="18" x2="36" y2="18" stroke="#374151" strokeWidth="1" />
          <rect x="4" y="22" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="26" width="24" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="30" width="20" height="1.5" rx="0.5" fill="#e5e7eb" />
        </svg>
      );
    case 'modern':
      return (
        <svg className={baseClass} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="14" y="4" width="12" height="6" rx="1" fill="#6b7280" />
          <rect x="10" y="12" width="20" height="3" rx="1" fill="#374151" />
          <rect x="12" y="17" width="16" height="1.5" rx="0.5" fill="#9ca3af" />
          <rect x="4" y="24" width="32" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="28" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="32" width="24" height="1.5" rx="0.5" fill="#e5e7eb" />
        </svg>
      );
    case 'creative':
      return (
        <svg className={baseClass} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="8" height="6" rx="1" fill="#7c3aed" />
          <rect x="4" y="12" width="16" height="2.5" rx="0.5" fill="#7c3aed" />
          <rect x="4" y="16" width="12" height="1.5" rx="0.5" fill="#9ca3af" />
          <line x1="4" y1="22" x2="36" y2="22" stroke="#7c3aed" strokeWidth="1.5" />
          <rect x="4" y="26" width="32" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="30" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="34" width="24" height="1.5" rx="0.5" fill="#e5e7eb" />
        </svg>
      );
    case 'minimal':
      return (
        <svg className={baseClass} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect x="4" y="6" width="14" height="3" rx="1" fill="#374151" />
          <line x1="4" y1="14" x2="36" y2="14" stroke="#e5e7eb" strokeWidth="1" />
          <rect x="4" y="20" width="32" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="24" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="28" width="24" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="32" width="20" height="1.5" rx="0.5" fill="#e5e7eb" />
        </svg>
      );
    case 'organization':
      return (
        <svg className={baseClass} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          {/* Centered logo placeholder */}
          <rect x="15" y="3" width="10" height="8" rx="1.5" fill="#1e3a5f" />
          {/* Centered org name */}
          <rect x="8" y="13" width="24" height="2.5" rx="0.5" fill="#1e3a5f" />
          {/* Tagline */}
          <rect x="11" y="17" width="18" height="1.5" rx="0.5" fill="#9ca3af" />
          {/* Contact bar */}
          <rect x="6" y="21" width="28" height="1.5" rx="0.5" fill="#6b7280" />
          {/* Separator */}
          <line x1="4" y1="25" x2="36" y2="25" stroke="#1e3a5f" strokeWidth="1" />
          {/* Body lines */}
          <rect x="4" y="29" width="32" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="33" width="28" height="1.5" rx="0.5" fill="#e5e7eb" />
          <rect x="4" y="37" width="24" height="1.5" rx="0.5" fill="#e5e7eb" />
        </svg>
      );
    default:
      return <div className={baseClass} aria-hidden="true" />;
  }
}

StarterTemplatePicker.displayName = 'StarterTemplatePicker';
