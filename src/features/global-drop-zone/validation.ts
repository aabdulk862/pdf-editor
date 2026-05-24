import type { DropValidationResult } from './types';

export const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'] as const;

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

export const MAX_FILES_PER_DROP = 20;

/**
 * Validates a single dropped file against accepted types and size limit.
 */
export function validateDroppedFile(file: File): DropValidationResult {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) {
    return { valid: false, file, reason: 'Unsupported file type' };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, file, reason: 'File exceeds 100 MB size limit' };
  }

  return { valid: true, file };
}

/**
 * Validates a batch of dropped files. Takes only the first MAX_FILES_PER_DROP
 * files and validates each individually.
 */
export function validateDroppedFiles(files: File[]): DropValidationResult[] {
  const limited = files.slice(0, MAX_FILES_PER_DROP);
  return limited.map(validateDroppedFile);
}
