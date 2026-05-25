import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Property-based test: Animation Easing Curve Invariant
 *
 * **Validates: Requirements 12.10**
 *
 * Property: No CSS transition or animation definition in the codebase uses the
 * `linear` timing function. All use one of: ease-out, ease-in, ease-in-out,
 * or a cubic-bezier curve.
 *
 * Tested via: Property-based test scanning all component style definitions for
 * transition/animation properties and verifying easing values.
 */

// ---------------------------------------------------------------------------
// Helpers: File discovery and pattern matching
// ---------------------------------------------------------------------------

/**
 * Recursively collect all source files (.tsx, .ts, .css) from a directory.
 */
function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, and test directories
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      // Include .tsx, .ts, .css but exclude test files
      if (
        (ext === '.tsx' || ext === '.ts' || ext === '.css') &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.property.test.')
      ) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Patterns that detect `linear` as a CSS timing function.
 *
 * Matches:
 * - `transition-timing-function: linear` (CSS property)
 * - `animation-timing-function: linear` (CSS property)
 * - `ease-linear` (Tailwind class)
 * - `transition: ... linear` or `animation: ... linear` (shorthand with linear)
 *
 * Does NOT match:
 * - `linear-gradient` (CSS gradient function, not a timing function)
 * - `linearize` or other variable/function names containing "linear"
 */
const LINEAR_TIMING_PATTERNS: RegExp[] = [
  // CSS property: transition-timing-function: linear
  /transition-timing-function\s*:\s*linear/i,
  // CSS property: animation-timing-function: linear
  /animation-timing-function\s*:\s*linear/i,
  // Tailwind class: ease-linear
  /\bease-linear\b/,
  // CSS shorthand: transition: <property> <duration> linear
  // Matches "linear" when preceded by a duration value (e.g., 200ms linear, 0.2s linear)
  /transition\s*:(?![^;]*linear-gradient)[^;]*\d+m?s\s+linear/i,
  // CSS shorthand: animation: <name> <duration> linear
  /animation\s*:(?![^;]*linear-gradient)[^;]*\d+m?s\s+linear/i,
];

/**
 * Check if a file contains any usage of `linear` as a CSS timing function.
 * Returns an array of matches found (empty if none).
 */
function findLinearTimingUsages(
  content: string,
): { line: number; text: string; pattern: string }[] {
  const matches: { line: number; text: string; pattern: string }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of LINEAR_TIMING_PATTERNS) {
      if (pattern.test(line)) {
        matches.push({
          line: i + 1,
          text: line.trim(),
          pattern: pattern.source,
        });
      }
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

const srcDir = path.resolve(__dirname, '../../..');
const sourceFiles = collectSourceFiles(path.join(srcDir, 'src'));

describe('Animation Easing Curve Invariant', () => {
  it('should find source files to test', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('no source file uses `linear` as a CSS timing function', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: sourceFiles.length - 1 }), (index) => {
        const filePath = sourceFiles[index];
        const content = fs.readFileSync(filePath, 'utf-8');
        const usages = findLinearTimingUsages(content);

        if (usages.length > 0) {
          const relativePath = path.relative(srcDir, filePath);
          const details = usages.map((u) => `  Line ${u.line}: ${u.text}`).join('\n');
          throw new Error(`Found linear timing function in ${relativePath}:\n${details}`);
        }

        return true;
      }),
      { numRuns: Math.min(sourceFiles.length * 3, 500) },
    );
  });

  it('all files collectively contain no linear timing function usage', () => {
    // Exhaustive check across all files as a complementary verification
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const usages = findLinearTimingUsages(content);

      for (const usage of usages) {
        violations.push({
          file: path.relative(srcDir, filePath),
          line: usage.line,
          text: usage.text,
        });
      }
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `  ${v.file}:${v.line} — ${v.text}`).join('\n');
      throw new Error(`Found ${violations.length} linear timing function usage(s):\n${details}`);
    }
  });
});
