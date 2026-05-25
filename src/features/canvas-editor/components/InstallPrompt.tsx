import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * InstallPrompt displays a slim, non-intrusive banner prompting the user
 * to install the PWA. Only shown when the browser supports installation
 * and the app is not already installed.
 *
 * Features:
 * - Subtle banner at the top of the viewport
 * - Install button triggers native install prompt
 * - Dismiss button hides the banner for the session
 * - Does not render when app is in standalone mode or dismissed
 *
 * Requirements: 20.4
 */
export function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2 bg-blue-600 text-white text-sm shadow-md"
      role="banner"
      aria-label="Install application"
    >
      <span className="truncate">Install PDF Editor for offline access</span>

      <button
        type="button"
        onClick={promptInstall}
        className="flex-shrink-0 px-3 py-1 min-h-[32px] bg-white text-blue-600 rounded-md text-xs font-medium hover:bg-blue-50 active:bg-blue-100 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
      >
        Install
      </button>

      <button
        type="button"
        onClick={dismiss}
        className="flex-shrink-0 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-normal ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label="Dismiss install prompt"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
        >
          <path d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>
    </div>
  );
}
