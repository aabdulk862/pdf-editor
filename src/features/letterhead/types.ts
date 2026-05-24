/**
 * Letterhead template types for the letterhead creator/editor feature.
 * These types define the data models for designing, storing, and applying
 * letterhead layouts to PDF documents.
 */

/** Text alignment options for letterhead elements */
export type Alignment = 'left' | 'center' | 'right';

/**
 * A configurable text field within a letterhead template.
 * Used for company name, address lines, phone, email, website, and tagline.
 */
export interface LetterheadTextField {
  /** The text content of the field */
  content: string;
  /** Font family name (from available system fonts) */
  fontFamily: string;
  /**
   * Font size in points.
   * @minimum 8
   * @maximum 24
   */
  fontSize: number;
  /** Text color as a hex color string (e.g., "#000000") */
  color: string;
  /** Horizontal alignment of the text within the header area */
  alignment: Alignment;
}

/**
 * A logo image within a letterhead template.
 * Supports PNG, JPG, and SVG formats with a maximum file size of 5MB.
 */
export interface LetterheadLogo {
  /** Raw image data (PNG, JPG, or SVG) */
  data: ArrayBuffer;
  /** MIME type of the logo image. Accepted formats: PNG, JPEG, SVG */
  mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  /** Original filename of the uploaded logo */
  fileName: string;
  /**
   * Display width of the logo in pixels. Aspect ratio is maintained automatically.
   * @minimum 50
   * @maximum 300
   */
  width: number;
  /** Horizontal alignment of the logo within the header area */
  alignment: Alignment;
}

/**
 * A complete letterhead template that can be saved, edited, and applied to PDF documents.
 * Templates are stored in localStorage with a maximum of 20 saved templates.
 */
export interface LetterheadTemplate {
  /** Unique identifier for the template */
  id: string;
  /**
   * User-provided template name.
   * @minLength 1
   * @maxLength 50
   */
  name: string;
  /** Creation timestamp (Unix milliseconds) */
  createdAt: number;
  /** Last update timestamp (Unix milliseconds) */
  updatedAt: number;
  /** Logo image, or null if no logo is configured */
  logo: LetterheadLogo | null;
  /**
   * Company name text field.
   * @maxLength 100 characters for content
   */
  companyName: LetterheadTextField;
  /**
   * Address lines (up to 3 lines).
   * @maxItems 3
   * @maxLength 80 characters per line content
   */
  addressLines: LetterheadTextField[];
  /**
   * Phone number text field.
   * @maxLength 30 characters for content
   */
  phone: LetterheadTextField;
  /**
   * Email address text field.
   * @maxLength 100 characters for content
   */
  email: LetterheadTextField;
  /**
   * Website URL text field.
   * @maxLength 100 characters for content
   */
  website: LetterheadTextField;
  /**
   * Optional tagline text field, or null if not configured.
   * No specific character limit defined.
   */
  tagline: LetterheadTextField | null;
}

/**
 * Specifies which pages of a PDF document the letterhead should be applied to.
 * - 'first': Apply to the first page only
 * - 'all': Apply to all pages
 * - 'custom': Apply to a specific set of page numbers (1-indexed)
 */
export type LetterheadPageTarget =
  | { type: 'first' }
  | { type: 'all' }
  | { type: 'custom'; pages: number[] };
