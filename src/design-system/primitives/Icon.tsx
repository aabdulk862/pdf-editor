import { cloneElement, isValidElement, type ReactElement } from 'react';

import { tokens } from '../tokens';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IconProps {
  /** Icon name for registry-based lookup, or pass children directly */
  name?: string;
  /** Enforced icon size in pixels. Must be 16, 20, or 24. Defaults to 20. */
  size?: 16 | 20 | 24;
  /** Additional CSS class names */
  className?: string;
  /** Accessible label — if omitted, icon is treated as decorative (aria-hidden) */
  'aria-label'?: string;
  /** Explicitly mark as decorative. Defaults to true when no aria-label is provided. */
  'aria-hidden'?: boolean;
  /** SVG element to render (alternative to name-based lookup) */
  children?: ReactElement;
}

// ---------------------------------------------------------------------------
// Icon Registry
//
// Maps icon names to SVG path data. This allows name-based usage:
//   <Icon name="chevron-right" size={16} />
//
// For custom/one-off icons, pass children instead:
//   <Icon size={24} aria-label="Close"><svg>...</svg></Icon>
// ---------------------------------------------------------------------------

const iconPaths: Record<string, string[]> = {
  'chevron-right': ['M9 5l5 5-5 5'],
  'chevron-left': ['M11 5l-5 5 5 5'],
  'chevron-down': ['M5 8l5 5 5-5'],
  'chevron-up': ['M5 12l5-5 5 5'],
  close: ['M5 5l10 10', 'M15 5L5 15'],
  plus: ['M10 4v12', 'M4 10h12'],
  minus: ['M4 10h12'],
  search: ['M8.5 3a5.5 5.5 0 100 11 5.5 5.5 0 000-11z', 'M13 13l4 4'],
  check: ['M4 10l4 4 8-8'],
  menu: ['M3 6h14', 'M3 10h14', 'M3 14h14'],
  home: ['M3 10l7-7 7 7', 'M5 10v7a1 1 0 001 1h3v-4h2v4h3a1 1 0 001-1v-7'],
  download: ['M10 3v10', 'M6 9l4 4 4-4', 'M4 15h12'],
  upload: ['M10 13V3', 'M6 7l4-4 4 4', 'M4 15h12'],
  settings: [
    'M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
    'M16.5 10a6.5 6.5 0 01-.4 2.2l1.7 1.3-1.5 2.6-2-.6a6.5 6.5 0 01-3.8 2.2l-.5 2.1h-3l-.5-2.1a6.5 6.5 0 01-3.8-2.2l-2 .6-1.5-2.6 1.7-1.3A6.5 6.5 0 013.5 10c0-.8.1-1.5.4-2.2L2.2 6.5l1.5-2.6 2 .6A6.5 6.5 0 019.5 2.3L10 .2h3l.5 2.1a6.5 6.5 0 013.8 2.2l2-.6 1.5 2.6-1.7 1.3c.3.7.4 1.4.4 2.2z',
  ],
  star: ['M10 2l2.5 5.5L18 8.5l-4 4 1 5.5-5-2.5-5 2.5 1-5.5-4-4 5.5-1z'],
  'arrow-left': ['M15 10H5', 'M9 6l-4 4 4 4'],
  'arrow-right': ['M5 10h10', 'M11 6l4 4-4 4'],
  filter: ['M3 4h14l-5 6v5l-4 2V10L3 4z'],
  'external-link': [
    'M11 3h6v6',
    'M17 3L9 11',
    'M14 9v6a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h6',
  ],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Icon primitive that enforces consistent sizing (16/20/24px) and stroke-width
 * (1.5px) across the application.
 *
 * Usage with registry:
 *   <Icon name="search" size={20} aria-label="Search" />
 *
 * Usage with children:
 *   <Icon size={24} aria-label="Custom icon">
 *     <svg viewBox="0 0 24 24"><path d="..." /></svg>
 *   </Icon>
 *
 * Decorative icons (no aria-label) automatically get aria-hidden="true".
 */
export function Icon({
  name,
  size = 20,
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden,
  children,
}: IconProps) {
  const isDecorative = !ariaLabel;
  const hidden = ariaHidden ?? isDecorative;

  const accessibilityProps = {
    'aria-hidden': hidden || undefined,
    'aria-label': ariaLabel || undefined,
    role: ariaLabel ? 'img' : undefined,
  };

  // Children-based rendering: clone the child SVG with enforced props
  if (children && isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, {
      width: size,
      height: size,
      strokeWidth: tokens.icons.strokeWidth,
      className,
      ...accessibilityProps,
    });
  }

  // Name-based rendering: look up paths from registry
  const paths = name ? iconPaths[name] : undefined;

  if (!paths) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[Icon] Unknown icon name: "${name}". Available icons: ${Object.keys(iconPaths).join(', ')}`,
      );
    }
    return null;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={tokens.icons.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...accessibilityProps}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
