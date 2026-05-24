import { describe, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';
import { getSuggestions } from './suggestions';

/**
 * Feature: ux-power-user-features
 * Property 17: Quick actions suggestion mapping
 *
 * For any operation type that has defined follow-up suggestions, the returned
 * suggestions should exactly match the predefined mapping for that operation type,
 * containing 2-3 items. For any operation type without defined suggestions, the
 * result should be an empty array.
 *
 * Validates: Requirements 11.2, 11.9
 */

const knownOperationTypes = ['merge', 'compress', 'redact', 'add-page-numbers'] as const;

const knownOperationTypeArb = fc.constantFrom(...knownOperationTypes);

const unknownOperationTypeArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => !knownOperationTypes.includes(s as (typeof knownOperationTypes)[number]));

describe('Feature: ux-power-user-features, Property 17: Quick actions suggestion mapping', () => {
  fcTest.prop([knownOperationTypeArb], { numRuns: 100 })(
    'known operation types return 2-3 suggestions with required fields',
    (operationType) => {
      const suggestions = getSuggestions(operationType);

      // Should return 2-3 items
      expect(suggestions.length).toBeGreaterThanOrEqual(2);
      expect(suggestions.length).toBeLessThanOrEqual(3);

      // Each suggestion must have all required fields as non-empty strings
      for (const suggestion of suggestions) {
        expect(typeof suggestion.id).toBe('string');
        expect(suggestion.id.length).toBeGreaterThan(0);

        expect(typeof suggestion.label).toBe('string');
        expect(suggestion.label.length).toBeGreaterThan(0);

        expect(typeof suggestion.operationRoute).toBe('string');
        expect(suggestion.operationRoute.length).toBeGreaterThan(0);

        expect(typeof suggestion.icon).toBe('string');
        expect(suggestion.icon.length).toBeGreaterThan(0);

        expect(typeof suggestion.ariaLabel).toBe('string');
        expect(suggestion.ariaLabel.length).toBeGreaterThan(0);
      }
    },
  );

  fcTest.prop([unknownOperationTypeArb], { numRuns: 100 })(
    'unknown operation types return an empty array',
    (operationType) => {
      const suggestions = getSuggestions(operationType);
      expect(suggestions).toEqual([]);
    },
  );

  fcTest.prop([knownOperationTypeArb], { numRuns: 100 })(
    'suggestions for the same operation type are always identical (deterministic)',
    (operationType) => {
      const first = getSuggestions(operationType);
      const second = getSuggestions(operationType);

      expect(first.length).toBe(second.length);
      for (let i = 0; i < first.length; i++) {
        expect(first[i].id).toBe(second[i].id);
        expect(first[i].label).toBe(second[i].label);
        expect(first[i].operationRoute).toBe(second[i].operationRoute);
        expect(first[i].icon).toBe(second[i].icon);
        expect(first[i].ariaLabel).toBe(second[i].ariaLabel);
      }
    },
  );
});
