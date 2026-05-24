/**
 * Validation utilities for the PDF Editor application.
 * Each validator returns { valid: boolean; error?: string }.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// --- Constants ---

const ACCEPTED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

const DEFAULT_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

const PASSWORD_MIN_LENGTH = 1;
const PASSWORD_MAX_LENGTH = 128;

const METADATA_FIELD_MAX_LENGTH = 255;
const KEYWORDS_MAX_COUNT = 20;
const KEYWORD_MAX_LENGTH = 100;

const BOOKMARK_TITLE_MIN_LENGTH = 1;
const BOOKMARK_TITLE_MAX_LENGTH = 200;

const DIMENSION_MIN_MM = 25;
const DIMENSION_MAX_MM = 3000;

// --- File Validation ---

/**
 * Validates that a file has an accepted MIME type (PDF, PNG, or JPG).
 */
export function validateFileType(file: File): ValidationResult {
  if (ACCEPTED_MIME_TYPES.includes(file.type as (typeof ACCEPTED_MIME_TYPES)[number])) {
    return { valid: true };
  }
  return {
    valid: false,
    error: `Unsupported file type "${file.type || 'unknown'}". Accepted types: PDF, PNG, JPG.`,
  };
}

/**
 * Validates that a file does not exceed the maximum allowed size.
 * @param file - The file to validate
 * @param maxBytes - Maximum allowed size in bytes (default: 100 MB)
 */
export function validateFileSize(
  file: File,
  maxBytes: number = DEFAULT_MAX_FILE_SIZE_BYTES,
): ValidationResult {
  if (file.size <= maxBytes) {
    return { valid: true };
  }
  const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
  return {
    valid: false,
    error: `File size exceeds the maximum allowed size of ${maxMB} MB.`,
  };
}

// --- Page Range Validation ---

/**
 * Validates a page range: start >= 1, start <= end, end <= totalPages.
 */
export function validatePageRange(
  start: number,
  end: number,
  totalPages: number,
): ValidationResult {
  if (!Number.isInteger(start) || !Number.isInteger(end) || !Number.isInteger(totalPages)) {
    return { valid: false, error: 'Page numbers must be integers.' };
  }
  if (start < 1) {
    return { valid: false, error: 'Start page must be at least 1.' };
  }
  if (start > end) {
    return { valid: false, error: 'Start page must not be greater than end page.' };
  }
  if (end > totalPages) {
    return {
      valid: false,
      error: `End page must not exceed total pages (${totalPages}).`,
    };
  }
  return { valid: true };
}

// --- Password Validation ---

/**
 * Validates a password: must be between 1 and 128 characters.
 */
export function validatePassword(password: string): ValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return { valid: false, error: 'Password must be at least 1 character.' };
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return {
      valid: false,
      error: `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

// --- Metadata Validation ---

/**
 * Validates a metadata field (title, author, or subject): max 255 characters.
 */
export function validateMetadataField(
  field: 'title' | 'author' | 'subject',
  value: string,
): ValidationResult {
  if (value.length > METADATA_FIELD_MAX_LENGTH) {
    return {
      valid: false,
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} must not exceed ${METADATA_FIELD_MAX_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

/**
 * Validates keywords: max 20 entries, each max 100 characters.
 */
export function validateKeywords(keywords: string[]): ValidationResult {
  if (keywords.length > KEYWORDS_MAX_COUNT) {
    return {
      valid: false,
      error: `Keywords must not exceed ${KEYWORDS_MAX_COUNT} entries.`,
    };
  }
  for (let i = 0; i < keywords.length; i++) {
    if (keywords[i].length > KEYWORD_MAX_LENGTH) {
      return {
        valid: false,
        error: `Keyword at position ${i + 1} must not exceed ${KEYWORD_MAX_LENGTH} characters.`,
      };
    }
  }
  return { valid: true };
}

// --- Bookmark Validation ---

/**
 * Validates a bookmark title: must be between 1 and 200 characters.
 */
export function validateBookmarkTitle(title: string): ValidationResult {
  if (title.length < BOOKMARK_TITLE_MIN_LENGTH) {
    return { valid: false, error: 'Bookmark title must not be empty.' };
  }
  if (title.length > BOOKMARK_TITLE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Bookmark title must not exceed ${BOOKMARK_TITLE_MAX_LENGTH} characters.`,
    };
  }
  return { valid: true };
}

// --- Dimension Validation ---

/**
 * Validates a page dimension value: must be between 25mm and 3000mm.
 */
export function validateDimension(value: number): ValidationResult {
  if (value < DIMENSION_MIN_MM) {
    return {
      valid: false,
      error: `Dimension must be at least ${DIMENSION_MIN_MM}mm.`,
    };
  }
  if (value > DIMENSION_MAX_MM) {
    return {
      valid: false,
      error: `Dimension must not exceed ${DIMENSION_MAX_MM}mm.`,
    };
  }
  return { valid: true };
}

// --- Crop Region Validation ---

/**
 * Validates a crop region: must be within page bounds and have non-zero area.
 */
export function validateCropRegion(
  region: { x: number; y: number; width: number; height: number },
  pageWidth: number,
  pageHeight: number,
): ValidationResult {
  if (region.width <= 0 || region.height <= 0) {
    return { valid: false, error: 'Crop region must have a positive width and height.' };
  }
  if (region.x < 0 || region.y < 0) {
    return { valid: false, error: 'Crop region must not start outside page bounds.' };
  }
  if (region.x + region.width > pageWidth) {
    return { valid: false, error: 'Crop region extends beyond the page width.' };
  }
  if (region.y + region.height > pageHeight) {
    return { valid: false, error: 'Crop region extends beyond the page height.' };
  }
  return { valid: true };
}
