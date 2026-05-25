import { describe, it } from 'vitest';
import fc from 'fast-check';
import { spacing } from '../tokens';

/**
 * Property-based test: Spacing Token Grid Alignment Invariant
 *
 * **Validates: Requirements 3.4**
 *
 * Property: Every spacing token value in the design system is a multiple of 4
 * (the sub-grid unit). This ensures all spacing aligns to the 4px sub-grid.
 */
describe('Spacing Token Grid Alignment', () => {
  const spacingValues = Object.values(spacing);
  const spacingEntries = Object.entries(spacing);

  it('every spacing token value is a multiple of 4', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: spacingEntries.length - 1 }), (index) => {
        const [, value] = spacingEntries[index];
        return value % 4 === 0;
      }),
    );
  });

  it('spacing tokens contain only non-negative integer values', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: spacingValues.length - 1 }), (index) => {
        const value = spacingValues[index];
        return Number.isInteger(value) && value >= 0;
      }),
    );
  });
});
