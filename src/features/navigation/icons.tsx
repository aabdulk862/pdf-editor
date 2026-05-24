import type { FC } from 'react';

interface IconProps {
  className?: string;
}

const defaultProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ─── Category Icons ───────────────────────────────────────────────────────────

/** Category: Organize — folder shape */
export const FolderIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M2 5a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0011.828 6H16a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
  </svg>
);

/** Category: Edit — pencil shape */
export const PencilIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.793 8.793-3.535.707.707-3.535 8.793-8.793z" />
    <path d="M12 5l3 3" />
  </svg>
);

/** Category: Convert — two arrows forming a cycle */
export const ConvertIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 12l2-2m0 0l2 2m-2-2v6" />
    <path d="M16 8l-2 2m0 0l-2-2m2 2V4" />
    <path d="M3 8a7 7 0 0114 0" />
    <path d="M17 12a7 7 0 01-14 0" />
  </svg>
);

/** Category: Protect — shield shape */
export const ShieldIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M10 2l7 3v5c0 4.418-3.134 7.16-7 9-3.866-1.84-7-4.582-7-9V5l7-3z" />
  </svg>
);

/** Category: Analyze — bar chart */
export const ChartIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 17V11" />
    <path d="M8 17V7" />
    <path d="M12 17V9" />
    <path d="M16 17V4" />
  </svg>
);

/** Category: OCR — scan lines */
export const ScanIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M3 7V4a1 1 0 011-1h3" />
    <path d="M13 3h3a1 1 0 011 1v3" />
    <path d="M17 13v3a1 1 0 01-1 1h-3" />
    <path d="M7 17H4a1 1 0 01-1-1v-3" />
    <path d="M3 10h14" />
  </svg>
);

// ─── Organize Tool Icons ──────────────────────────────────────────────────────

/** Merge — two arrows converging into one */
export const MergeIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M5 4v12" />
    <path d="M15 4v4l-5 4v4" />
    <path d="M5 8l5 4" />
  </svg>
);

/** Split/Scissors — scissors shape */
export const ScissorsIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="14" r="2.5" />
    <path d="M8.5 7.5L16 14" />
    <path d="M8.5 12.5L16 6" />
  </svg>
);

/** Rotate — circular arrow */
export const RotateIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M14.5 3.5L17 6l-2.5 2.5" />
    <path d="M17 6h-4a5 5 0 00-5 5v0a5 5 0 005 5h2" />
  </svg>
);

/** Reorder — stacked horizontal lines with arrows */
export const ReorderIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 6h12" />
    <path d="M4 10h12" />
    <path d="M4 14h12" />
    <path d="M17 4l-1.5 2 1.5 2" />
    <path d="M17 12l-1.5 2 1.5 2" />
  </svg>
);

/** Delete/Trash — trash can */
export const TrashIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M5 5h10l-1 12H6L5 5z" />
    <path d="M3 5h14" />
    <path d="M8 5V3h4v2" />
    <path d="M8 8v6" />
    <path d="M12 8v6" />
  </svg>
);

/** Duplicate/Copy — two overlapping rectangles */
export const CopyIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="7" y="7" width="10" height="10" rx="1" />
    <path d="M13 7V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1h3" />
  </svg>
);

// ─── Edit Tool Icons ──────────────────────────────────────────────────────────

/** Text Overlay — letter T */
export const TextIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M5 5h10" />
    <path d="M10 5v11" />
    <path d="M7 16h6" />
  </svg>
);

/** Highlight — marker pen */
export const HighlightIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 16l2-2 4 4-2 2H4v-4z" />
    <path d="M6 14L13 7l3 3-7 7" />
    <path d="M13 7l2-2 3 3-2 2" />
  </svg>
);

/** Signature — cursive line */
export const SignatureIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M3 14c1-3 2-5 3.5-5s1.5 4 3 4 2-6 3.5-6 1.5 3 3 3 2-2 3-3" />
    <path d="M3 17h14" />
  </svg>
);

/** Stamp — rubber stamp shape */
export const StampIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 17h12" />
    <path d="M6 14h8" />
    <path d="M8 14V11a2 2 0 012-2v0a2 2 0 012 2v3" />
    <rect x="6" y="4" width="8" height="5" rx="1" />
  </svg>
);

/** Watermark — water droplet */
export const WatermarkIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M10 3l5 7a5 5 0 11-10 0l5-7z" />
  </svg>
);

/** Headers & Footers — page with top/bottom lines */
export const HeaderIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="3" y="3" width="14" height="14" rx="1" />
    <path d="M3 6h14" />
    <path d="M3 14h14" />
  </svg>
);

/** Crop — crop marks */
export const CropIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M5 2v13a1 1 0 001 1h12" />
    <path d="M2 5h13a1 1 0 011 1v12" />
  </svg>
);

/** Letterhead — document with header decoration */
export const LetterheadIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="4" y="2" width="12" height="16" rx="1" />
    <path d="M7 5h6" />
    <path d="M7 7.5h4" />
    <path d="M7 11h6" />
    <path d="M7 13h4" />
  </svg>
);

/** Form Fill — document with checkboxes */
export const FormIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="4" y="2" width="12" height="16" rx="1" />
    <rect x="6" y="5" width="2.5" height="2.5" rx="0.5" />
    <path d="M10.5 6.25h4" />
    <rect x="6" y="9" width="2.5" height="2.5" rx="0.5" />
    <path d="M10.5 10.25h4" />
    <rect x="6" y="13" width="2.5" height="2.5" rx="0.5" />
    <path d="M10.5 14.25h4" />
  </svg>
);

// ─── Convert Tool Icons ───────────────────────────────────────────────────────

/** Image to PDF — image/photo icon */
export const ImageIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="3" y="3" width="14" height="14" rx="1" />
    <circle cx="7.5" cy="7.5" r="1.5" />
    <path d="M3 13l4-4 3 3 4-4 3 3" />
  </svg>
);

/** PDF to Image / Export Image — image with arrow out */
export const ExportImageIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="3" y="5" width="11" height="11" rx="1" />
    <path d="M3 13l3-3 2 2 3-3" />
    <path d="M14 3h3v3" />
    <path d="M17 3l-4 4" />
  </svg>
);

/** Extract Images — image with pull-out arrow */
export const ExtractIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="3" y="3" width="10" height="10" rx="1" />
    <path d="M15 8h2" />
    <path d="M15 11h2" />
    <path d="M15 14h2" />
    <path d="M13 15v2H5a1 1 0 01-1-1" />
  </svg>
);

/** Extract Text — document with text lines and arrow */
export const ExtractTextIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4" />
    <path d="M6 8h6" />
    <path d="M6 11h4" />
    <path d="M6 14h5" />
    <path d="M2 12l-1 1.5L2 15" />
  </svg>
);

/** Flatten — layers being compressed */
export const FlattenIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M3 14l7-3 7 3" />
    <path d="M3 10l7-3 7 3" />
    <path d="M10 17v-3" />
    <path d="M7 16l3 2 3-2" />
  </svg>
);

/** Linearize — horizontal arrow through lines */
export const LinearizeIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M3 5h14" />
    <path d="M3 10h14" />
    <path d="M3 15h14" />
    <path d="M14 7l3 3-3 3" />
  </svg>
);

// ─── Protect Tool Icons ───────────────────────────────────────────────────────

/** Password Protect — locked padlock */
export const LockIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="4" y="9" width="12" height="8" rx="1" />
    <path d="M7 9V6a3 3 0 016 0v3" />
    <circle cx="10" cy="13" r="1" />
  </svg>
);

/** Unlock — open padlock */
export const UnlockIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="4" y="9" width="12" height="8" rx="1" />
    <path d="M7 9V6a3 3 0 016 0" />
    <circle cx="10" cy="13" r="1" />
  </svg>
);

/** Redact — black rectangle with strikethrough */
export const RedactIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="3" y="7" width="14" height="6" rx="1" />
    <path d="M3 10h14" />
    <path d="M6 4l8 12" />
  </svg>
);

// ─── Analyze Tool Icons ───────────────────────────────────────────────────────

/** Compare — two documents side by side */
export const CompareIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <rect x="2" y="3" width="6" height="14" rx="1" />
    <rect x="12" y="3" width="6" height="14" rx="1" />
    <path d="M8 8h4" />
    <path d="M8 12h4" />
  </svg>
);

/** Bookmarks — bookmark ribbon */
export const BookmarkIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M5 3h10a1 1 0 011 1v14l-6-3-6 3V4a1 1 0 011-1z" />
  </svg>
);

/** Metadata/Info — circle with i */
export const InfoIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <circle cx="10" cy="10" r="7" />
    <path d="M10 9v4" />
    <circle cx="10" cy="7" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

/** Page Numbers — hash/number sign */
export const HashIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M7 3l-2 14" />
    <path d="M15 3l-2 14" />
    <path d="M4 7h13" />
    <path d="M3 13h13" />
  </svg>
);

/** Page Size / Resize — expand arrows */
export const ResizeIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M3 8V3h5" />
    <path d="M3 3l5 5" />
    <path d="M17 12v5h-5" />
    <path d="M17 17l-5-5" />
  </svg>
);

/** Compress — inward arrows */
export const CompressIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 4l4 4" />
    <path d="M8 4v4H4" />
    <path d="M16 16l-4-4" />
    <path d="M12 16v-4h4" />
    <path d="M16 4l-4 4" />
    <path d="M12 4v4h4" />
    <path d="M4 16l4-4" />
    <path d="M8 16v-4H4" />
  </svg>
);

// ─── OCR Tool Icons ───────────────────────────────────────────────────────────

/** Searchable PDF — document with magnifying glass */
export const SearchDocIcon: FC<IconProps> = ({ className }) => (
  <svg {...defaultProps} className={className} aria-hidden="true">
    <path d="M4 3h8l4 4v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" />
    <circle cx="9" cy="11" r="3" />
    <path d="M11.5 13.5L14 16" />
  </svg>
);
