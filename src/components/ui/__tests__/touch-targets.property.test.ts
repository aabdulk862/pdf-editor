import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property-based test: Touch Target Minimum Size
 *
 * **Validates: Requirements 7.3**
 *
 * Property: All interactive component variants rendered at mobile breakpoint
 * have computed min-height and min-width of at least 44px (via CSS class inspection).
 *
 * Tested via: Property-based test generating all button/link size variants and
 * verifying minimum dimension classes are present.
 *
 * The WCAG 2.5.5 (AAA) and Apple HIG recommend a minimum touch target of 44x44px.
 * Our Button component must enforce this across all variant/size combinations.
 */

// ---------------------------------------------------------------------------
// Button component configuration (mirrors src/components/ui/Button.tsx)
// ---------------------------------------------------------------------------

const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;

type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
type ButtonSize = (typeof BUTTON_SIZES)[number];

/** Minimum touch target size in pixels (per WCAG / Apple HIG) */
const MIN_TOUCH_TARGET_PX = 44;

/**
 * Size classes as defined in the Button component.
 * Each size must include min-h and min-w classes that meet the 44px minimum.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm',
  md: 'min-h-[44px] min-w-[44px] px-4 py-3 text-base',
  lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-lg',
};

/**
 * Extract the pixel value from a Tailwind min-h or min-w class.
 * Supports patterns like: min-h-[44px], min-h-[48px], min-h-11 (44px = 2.75rem = 11 * 4px)
 */
function extractMinDimensionPx(classes: string, prefix: 'min-h' | 'min-w'): number | null {
  // Match arbitrary value: min-h-[44px] or min-w-[48px]
  const arbitraryMatch = classes.match(new RegExp(`${prefix}-\\[(\\d+)px\\]`));
  if (arbitraryMatch) {
    return parseInt(arbitraryMatch[1], 10);
  }

  // Match Tailwind scale value: min-h-11 = 44px (11 * 4px)
  const scaleMatch = classes.match(new RegExp(`${prefix}-(\\d+)`));
  if (scaleMatch) {
    return parseInt(scaleMatch[1], 10) * 4;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Touch Target Minimum Size', () => {
  // Arbitraries for generating all combinations
  const variantArb = fc.constantFrom(...BUTTON_VARIANTS);
  const sizeArb = fc.constantFrom(...BUTTON_SIZES);

  it('all button variant/size combinations include min-h >= 44px class', () => {
    fc.assert(
      fc.property(variantArb, sizeArb, (_variant: ButtonVariant, size: ButtonSize) => {
        const classes = sizeClasses[size];
        const minHeight = extractMinDimensionPx(classes, 'min-h');

        expect(minHeight).not.toBeNull();
        expect(minHeight!).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('all button variant/size combinations include min-w >= 44px class', () => {
    fc.assert(
      fc.property(variantArb, sizeArb, (_variant: ButtonVariant, size: ButtonSize) => {
        const classes = sizeClasses[size];
        const minWidth = extractMinDimensionPx(classes, 'min-w');

        expect(minWidth).not.toBeNull();
        expect(minWidth!).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  it('property: for any button variant and size, the component always includes minimum 44px dimension classes', () => {
    fc.assert(
      fc.property(variantArb, sizeArb, (variant: ButtonVariant, size: ButtonSize) => {
        const classes = sizeClasses[size];

        const minHeight = extractMinDimensionPx(classes, 'min-h');
        const minWidth = extractMinDimensionPx(classes, 'min-w');

        // Both dimensions must be present
        if (minHeight === null || minWidth === null) {
          throw new Error(
            `Button variant="${variant}" size="${size}" is missing min dimension classes. ` +
              `Found classes: "${classes}"`,
          );
        }

        // Both dimensions must meet the 44px minimum
        if (minHeight < MIN_TOUCH_TARGET_PX) {
          throw new Error(
            `Button variant="${variant}" size="${size}" has min-height ${minHeight}px < ${MIN_TOUCH_TARGET_PX}px. ` +
              `Classes: "${classes}"`,
          );
        }

        if (minWidth < MIN_TOUCH_TARGET_PX) {
          throw new Error(
            `Button variant="${variant}" size="${size}" has min-width ${minWidth}px < ${MIN_TOUCH_TARGET_PX}px. ` +
              `Classes: "${classes}"`,
          );
        }

        return true;
      }),
      { numRuns: 200 },
    );
  });

  it('the actual Button component sizeClasses match our test expectations', async () => {
    // Verify that the sizeClasses we test against match the actual component
    // by checking the source file directly
    const fs = await import('node:fs');
    const path = await import('node:path');

    const buttonPath = path.resolve(__dirname, '../Button.tsx');
    const content = fs.readFileSync(buttonPath, 'utf-8');

    // Verify each size class string exists in the Button source
    for (const size of BUTTON_SIZES) {
      const expectedClasses = sizeClasses[size];
      expect(content).toContain(expectedClasses);
    }
  });

  it('no size variant has touch target below 44px', () => {
    // Exhaustive check across all combinations (not just random sampling)
    for (const variant of BUTTON_VARIANTS) {
      for (const size of BUTTON_SIZES) {
        const classes = sizeClasses[size];
        const minHeight = extractMinDimensionPx(classes, 'min-h');
        const minWidth = extractMinDimensionPx(classes, 'min-w');

        expect(
          minHeight,
          `variant="${variant}" size="${size}" should have min-h class`,
        ).not.toBeNull();
        expect(
          minWidth,
          `variant="${variant}" size="${size}" should have min-w class`,
        ).not.toBeNull();
        expect(minHeight!).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
        expect(minWidth!).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      }
    }
  });
});
