import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { colors } from '../tokens';

/**
 * Property-based test: Color Contrast WCAG Compliance
 *
 * **Validates: Requirements 3.2**
 *
 * Property: For every defined foreground/background color pair in the theme,
 * the computed contrast ratio meets WCAG AA minimums (4.5:1 for normal text,
 * 3:1 for large text).
 */

// ---------------------------------------------------------------------------
// Helpers: Contrast ratio calculation per WCAG 2.1
// ---------------------------------------------------------------------------

/**
 * Parse a hex color string (#RRGGBB) to [R, G, B] in 0–255 range.
 */
function hexToRgb(hex: string): [number, number, number] {
  const cleaned = hex.replace('#', '');
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Linearize an sRGB channel value (0–255) to linear light (0–1).
 */
function linearize(channel: number): number {
  const srgb = channel / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance per WCAG 2.1 definition.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Calculate contrast ratio between two colors.
 * Ratio = (L1 + 0.05) / (L2 + 0.05) where L1 >= L2
 */
function contrastRatio(foreground: string, background: string): number {
  const lum1 = relativeLuminance(foreground);
  const lum2 = relativeLuminance(background);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Color pairs to validate
// ---------------------------------------------------------------------------

interface ColorPair {
  name: string;
  foreground: string;
  background: string;
  /** Minimum required contrast ratio */
  minRatio: number;
  /** Description of the usage context */
  context: string;
}

const colorPairs: ColorPair[] = [
  {
    name: 'text.light on background.light',
    foreground: colors.text.light,
    background: colors.background.light,
    minRatio: 4.5,
    context: 'Normal text on light background',
  },
  {
    name: 'text.dark on background.dark',
    foreground: colors.text.dark,
    background: colors.background.dark,
    minRatio: 4.5,
    context: 'Normal text on dark background',
  },
  {
    name: 'text.muted on background.light',
    foreground: colors.text.muted,
    background: colors.background.light,
    minRatio: 4.5,
    context: 'Muted/secondary text on light background',
  },
  {
    name: 'primary.600 on background.light',
    foreground: colors.primary[600],
    background: colors.background.light,
    minRatio: 4.5,
    context: 'Primary interactive text/links on light background',
  },
  {
    name: 'primary.400 on background.dark',
    foreground: colors.primary[400],
    background: colors.background.dark,
    minRatio: 3,
    context: 'Primary interactive/large text on dark background',
  },
];

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Color Contrast WCAG AA Compliance', () => {
  it('all foreground/background color pairs meet their required WCAG AA contrast ratio', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: colorPairs.length - 1 }), (index) => {
        const pair = colorPairs[index];
        const ratio = contrastRatio(pair.foreground, pair.background);
        return ratio >= pair.minRatio;
      }),
    );
  });

  it('contrast ratios are computed correctly (sanity check: white on white = 1:1)', () => {
    const ratio = contrastRatio('#ffffff', '#ffffff');
    expect(ratio).toBeCloseTo(1, 5);
  });

  it('contrast ratios are computed correctly (sanity check: black on white = 21:1)', () => {
    const ratio = contrastRatio('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });
});
