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
          className="h-5 w-5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 10a7 7 0 01-9.9 6.4A7 7 0 0110 3.1a5.5 5.5 0 007 6.9z" />
        </svg>
      ) : (
        <svg
          className="h-5 w-5 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="4" />
          <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" />
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
