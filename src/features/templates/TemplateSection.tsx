import { useTemplateStore } from '../../store/templates';

/**
 * Home page section displaying available operation templates.
 * Each template card shows name, description, and list of operation steps.
 * Clicking a template triggers the configuration flow via selectTemplate.
 *
 * Requirements: 8.2, 8.3
 */
export function TemplateSection() {
  const templates = useTemplateStore((state) => state.templates);
  const selectTemplate = useTemplateStore((state) => state.selectTemplate);

  return (
    <section aria-labelledby="templates-heading">
      <h2
        id="templates-heading"
        className="text-lg font-semibold text-text-light dark:text-text-dark mb-3"
      >
        Templates
      </h2>

      {templates.length === 0 ? (
        <p className="text-sm text-secondary-500 dark:text-secondary-400 py-4">
          No templates available
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template.id)}
              className="flex flex-col items-start p-4 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-150 text-left min-h-[44px]"
              aria-label={`Use template: ${template.name}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-shrink-0 p-2 rounded-md bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"
                    />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-text-light dark:text-text-dark">
                  {template.name}
                </h3>
              </div>

              <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">
                {template.description}
              </p>

              <ol className="w-full space-y-1">
                {template.steps.map((step, index) => (
                  <li
                    key={step.id}
                    className="flex items-center gap-2 text-xs text-secondary-600 dark:text-secondary-300"
                  >
                    <span className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 text-[10px] font-medium">
                      {index + 1}
                    </span>
                    <span>{step.label}</span>
                  </li>
                ))}
              </ol>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
