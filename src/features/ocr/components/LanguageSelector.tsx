import { useOcrStore } from '../store/ocr-store';
import { LANGUAGE_OPTIONS } from '../types';
import { ProgressBar } from '../../../components/ui/ProgressBar';

const MAX_LANGUAGES = 3;

/**
 * Multi-select language control for OCR processing.
 *
 * - Renders checkboxes for 8 supported languages
 * - Limits selection to 3 languages maximum
 * - Shows download progress bar when engine is initializing (loading language packs)
 * - Persists selection to localStorage via the OCR store
 *
 * Validates: Requirements 4.1, 4.4, 4.5
 */
export function LanguageSelector(): JSX.Element {
  const selectedLanguages = useOcrStore((s) => s.selectedLanguages);
  const setLanguages = useOcrStore((s) => s.setLanguages);
  const engineStatus = useOcrStore((s) => s.engineStatus);
  const initProgress = useOcrStore((s) => s.initProgress);

  const isAtLimit = selectedLanguages.length >= MAX_LANGUAGES;
  const isInitializing = engineStatus === 'initializing';

  function handleToggle(code: string) {
    if (selectedLanguages.includes(code)) {
      // Always allow deselection (but keep at least 1 selected)
      if (selectedLanguages.length > 1) {
        setLanguages(selectedLanguages.filter((lang) => lang !== code));
      }
    } else {
      // Only allow adding if under the limit
      if (!isAtLimit) {
        setLanguages([...selectedLanguages, code]);
      }
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-text-light dark:text-text-dark">
        Recognition Languages
      </legend>

      <div className="space-y-2">
        {LANGUAGE_OPTIONS.map((lang) => {
          const isSelected = selectedLanguages.includes(lang.code);
          const isDisabled = !isSelected && isAtLimit;

          return (
            <label
              key={lang.code}
              className={[
                'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors duration-150',
                isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/30'
                  : 'hover:bg-secondary-50 dark:hover:bg-secondary-800',
                isDisabled ? 'opacity-50 cursor-not-allowed' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isDisabled}
                onChange={() => handleToggle(lang.code)}
                className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 dark:border-secondary-600 dark:bg-secondary-800 dark:checked:bg-primary-500"
                aria-label={`Select ${lang.label} for OCR`}
              />
              <span className="text-sm text-text-light dark:text-text-dark">{lang.label}</span>
            </label>
          );
        })}
      </div>

      {isAtLimit && (
        <p
          className="text-xs text-warning-600 dark:text-warning-400"
          role="status"
          aria-live="polite"
        >
          Maximum 3 languages
        </p>
      )}

      {isInitializing && initProgress !== null && (
        <div className="pt-2">
          <ProgressBar
            progress={initProgress}
            label="Loading language pack..."
            ariaLabel="Language pack download progress"
          />
        </div>
      )}
    </fieldset>
  );
}
