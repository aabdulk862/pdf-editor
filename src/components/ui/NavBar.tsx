import { Link, useLocation } from 'react-router-dom';
import { useThemeStore } from '../../store/theme';

interface NavRoute {
  path: string;
  label: string;
}

const featureRoutes: NavRoute[] = [
  { path: '/merge', label: 'Merge' },
  { path: '/split', label: 'Split' },
  { path: '/rotate', label: 'Rotate' },
  { path: '/delete-pages', label: 'Delete Pages' },
  { path: '/reorder', label: 'Reorder' },
  { path: '/compress', label: 'Compress' },
  { path: '/image-to-pdf', label: 'Image to PDF' },
  { path: '/page-numbers', label: 'Page Numbers' },
  { path: '/extract-images', label: 'Extract Images' },
  { path: '/text-overlay', label: 'Text Overlay' },
  { path: '/highlight', label: 'Highlight' },
  { path: '/signature', label: 'Signature' },
  { path: '/stamps', label: 'Stamps' },
  { path: '/watermarks', label: 'Watermarks' },
  { path: '/password-protect', label: 'Password Protect' },
  { path: '/unlock', label: 'Unlock' },
  { path: '/redact', label: 'Redact' },
  { path: '/metadata', label: 'Metadata' },
  { path: '/form-fill', label: 'Form Fill' },
  { path: '/compare', label: 'Compare' },
  { path: '/extract-text', label: 'Extract Text' },
  { path: '/pdf-to-image', label: 'PDF to Image' },
  { path: '/flatten', label: 'Flatten' },
  { path: '/crop', label: 'Crop' },
  { path: '/headers-footers', label: 'Headers & Footers' },
  { path: '/bookmarks', label: 'Bookmarks' },
  { path: '/page-size', label: 'Page Size' },
  { path: '/linearize', label: 'Linearize' },
  { path: '/duplicate-pages', label: 'Duplicate Pages' },
];

function ThemeToggleButton() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <button
      onClick={toggleTheme}
      className="min-h-[44px] min-w-[44px] w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-normal ease-in-out"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
    </button>
  );
}

/**
 * Navigation bar component rendered inside the Layout sidebar.
 * Displays route links with active route indicator and a theme toggle.
 *
 * - Desktop (≥768px): rendered in the sidebar as a vertical list
 * - Mobile (<768px): rendered in the hamburger menu drawer
 * - Active route highlighted with primary color background
 * - Theme toggle at the bottom
 *
 * Requirements: 27.1, 27.2, 30.3, 30.4, 30.5
 */
export function NavBar() {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Navigation links */}
      <div className="flex-1 space-y-1">
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
          PDF Tools
        </p>

        <Link
          to="/"
          className={`flex items-center min-h-[44px] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-normal ease-in-out ${
            isActive('/')
              ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
              : 'text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700'
          }`}
        >
          Home
        </Link>

        {featureRoutes.map((route) => (
          <Link
            key={route.path}
            to={route.path}
            className={`flex items-center min-h-[44px] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-normal ease-in-out ${
              isActive(route.path)
                ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                : 'text-text-light dark:text-text-dark hover:bg-secondary-100 dark:hover:bg-secondary-700'
            }`}
          >
            {route.label}
          </Link>
        ))}
      </div>

      {/* Theme toggle at the bottom */}
      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-3 mt-3">
        <ThemeToggleButton />
      </div>
    </div>
  );
}
