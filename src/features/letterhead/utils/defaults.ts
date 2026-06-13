/**
 * Shared default values for the letterhead feature.
 */

export const DEFAULT_LETTER_BODY = `[Recipient Name]
[Recipient Title]
[Organization]
[Address]
[City, State ZIP]

Dear [Recipient Name],

[Write your letter here...]



Sincerely,

[Your Name]
[Your Title]`;

export function getEffectiveLetterBody(template: { letterBody?: string }): string {
  return template.letterBody ?? DEFAULT_LETTER_BODY;
}

/** Generate today's date in formal letter format */
export function getTodayFormatted(): string {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
