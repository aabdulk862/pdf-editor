import type { QuickAction } from './types';

export type SuggestionMap = Record<string, QuickAction[]>;

const suggestionMap: SuggestionMap = {
  merge: [
    {
      id: 'compress',
      label: 'Compress the result',
      operationRoute: '/compress',
      icon: 'compress',
      ariaLabel: 'Compress the merged PDF',
    },
    {
      id: 'add-page-numbers',
      label: 'Add page numbers',
      operationRoute: '/add-page-numbers',
      icon: 'page-numbers',
      ariaLabel: 'Add page numbers to the merged PDF',
    },
  ],
  compress: [
    {
      id: 'download',
      label: 'Download',
      operationRoute: '/download',
      icon: 'download',
      ariaLabel: 'Download the compressed PDF',
    },
    {
      id: 'linearize',
      label: 'Linearize for web',
      operationRoute: '/linearize',
      icon: 'linearize',
      ariaLabel: 'Linearize the compressed PDF for web viewing',
    },
  ],
  redact: [
    {
      id: 'encrypt',
      label: 'Encrypt document',
      operationRoute: '/encrypt',
      icon: 'encrypt',
      ariaLabel: 'Encrypt the redacted PDF',
    },
    {
      id: 'flatten',
      label: 'Flatten annotations',
      operationRoute: '/flatten',
      icon: 'flatten',
      ariaLabel: 'Flatten annotations in the redacted PDF',
    },
  ],
  'add-page-numbers': [
    {
      id: 'compress',
      label: 'Compress',
      operationRoute: '/compress',
      icon: 'compress',
      ariaLabel: 'Compress the PDF with page numbers',
    },
    {
      id: 'add-headers',
      label: 'Add headers',
      operationRoute: '/add-headers',
      icon: 'headers',
      ariaLabel: 'Add headers to the PDF',
    },
  ],
};

/**
 * Returns 2-3 contextual follow-up suggestions based on the
 * completed operation type. Returns an empty array for unknown
 * operation types.
 */
export function getSuggestions(operationType: string): QuickAction[] {
  if (Object.hasOwn(suggestionMap, operationType)) {
    return suggestionMap[operationType];
  }
  return [];
}
