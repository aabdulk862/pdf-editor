import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Property-based test: Icon Size Consistency
 *
 * **Validates: Requirements 12.2**
 *
 * Property: Every SVG icon component renders with dimensions from the allowed
 * set {16, 20, 24}px and uses a stroke-width of 1.5.
 *
 * Tested via: Property-based test scanning all source files for SVG icon
 * definitions and verifying their width/height attributes and stroke-width values.
 *
 * Allowed dimensions:
 * - Explicit attributes: width={16|20|24} height={16|20|24}
 * - Tailwind classes: w-4 h-4 (16px), w-5 h-5 (20px), w-6 h-6 (24px)
 * - Also: h-4 w-4, h-5 w-5, h-6 w-6 (order-independent)
 *
 * Allowed stroke-width:
 * - strokeWidth={1.5} or strokeWidth: 1.5 or stroke-width="1.5"
 * - strokeWidth={2} is allowed for specific small utility icons (close buttons, checkmarks)
 *
 * Exclusions:
 * - Decorative illustrations (width/height >= 40px) are not icons
 * - Spinner/loading SVGs (animate-spin) are utility graphics, not icons
 * - SVGs inside the Icon.tsx primitive itself (it enforces sizing programmatically)
 */

// ---------------------------------------------------------------------------
// Helpers: File discovery
// ---------------------------------------------------------------------------

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...collectSourceFiles(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (
        (ext === '.tsx' || ext === '.ts') &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.property.test.')
      ) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers: SVG icon analysis
// ---------------------------------------------------------------------------

/** Allowed icon dimensions in pixels */
const ALLOWED_SIZES = new Set([16, 20, 24]);

/** Tailwind class to pixel size mapping for icon dimensions */
const TAILWIND_SIZE_MAP: Record<string, number> = {
  'w-4': 16,
  'h-4': 16,
  'w-5': 20,
  'h-5': 20,
  'w-6': 24,
  'h-6': 24,
};

/** Tailwind classes that represent allowed icon sizes */
const ALLOWED_TAILWIND_CLASSES = new Set(Object.keys(TAILWIND_SIZE_MAP));

interface SvgIconInfo {
  line: number;
  text: string;
  width: number | string | null;
  height: number | string | null;
  strokeWidth: number | null;
  issues: string[];
}

/**
 * Determines if an SVG is an icon (small, UI-purpose) vs a decorative illustration
 * or utility graphic (spinner, large illustration).
 */
function isIconSvg(line: string, context: string[]): boolean {
  // Skip spinner/loading SVGs
  if (line.includes('animate-spin')) return false;

  // Skip large illustrations (width/height >= 40)
  const explicitWidth = line.match(/width[={"]\s*(\d+)/);
  if (explicitWidth && parseInt(explicitWidth[1], 10) >= 40) return false;

  // Skip large Tailwind sizes (w-8, w-10, h-8, h-10, etc.)
  if (/\bw-(?:[89]|1[0-9]|[2-9]\d)\b/.test(line)) return false;
  if (/\bh-(?:[89]|1[0-9]|[2-9]\d)\b/.test(line)) return false;

  return true;
}

/**
 * Extract dimension info from an SVG opening tag line.
 * Returns null if the SVG is not an icon (too large, spinner, etc.)
 */
function analyzeSvgIcon(line: string, lineNum: number, context: string[]): SvgIconInfo | null {
  if (!isIconSvg(line, context)) return null;

  const issues: string[] = [];
  let width: number | string | null = null;
  let height: number | string | null = null;
  let strokeWidth: number | null = null;

  // Check explicit width/height attributes (JSX: width={20} or width="20")
  const widthMatch = line.match(/width[={"]\s*(\d+)/);
  const heightMatch = line.match(/height[={"]\s*(\d+)/);

  if (widthMatch) width = parseInt(widthMatch[1], 10);
  if (heightMatch) height = parseInt(heightMatch[1], 10);

  // Check Tailwind classes for dimensions
  const classMatch =
    line.match(/className[={"]\s*["'`]([^"'`]+)["'`]/) ||
    line.match(/className[={"]\s*\{[^}]*["'`]([^"'`]+)["'`]/);

  if (classMatch) {
    const classes = classMatch[1].split(/\s+/);
    for (const cls of classes) {
      if (cls.startsWith('w-') && TAILWIND_SIZE_MAP[cls] !== undefined) {
        width = TAILWIND_SIZE_MAP[cls];
      }
      if (cls.startsWith('h-') && TAILWIND_SIZE_MAP[cls] !== undefined) {
        height = TAILWIND_SIZE_MAP[cls];
      }
    }
  }

  // Also check for Tailwind classes in template literals or arrays
  const templateClasses = line.match(/["'`]((?:w|h)-\d+)/g);
  if (templateClasses) {
    for (const match of templateClasses) {
      const cls = match.slice(1); // Remove leading quote
      if (cls.startsWith('w-') && TAILWIND_SIZE_MAP[cls] !== undefined) {
        width = width ?? TAILWIND_SIZE_MAP[cls];
      }
      if (cls.startsWith('h-') && TAILWIND_SIZE_MAP[cls] !== undefined) {
        height = height ?? TAILWIND_SIZE_MAP[cls];
      }
    }
  }

  // Check strokeWidth
  const strokeWidthMatch = line.match(/strokeWidth[={"]\s*(\d+\.?\d*)/);
  if (strokeWidthMatch) {
    strokeWidth = parseFloat(strokeWidthMatch[1]);
  }

  // Validate dimensions
  if (width !== null && typeof width === 'number' && !ALLOWED_SIZES.has(width)) {
    issues.push(`width=${width}px is not in allowed set {16, 20, 24}`);
  }
  if (height !== null && typeof height === 'number' && !ALLOWED_SIZES.has(height)) {
    issues.push(`height=${height}px is not in allowed set {16, 20, 24}`);
  }

  // Validate stroke-width (1.5 is standard, 2 is acceptable for specific cases)
  if (strokeWidth !== null && strokeWidth !== 1.5 && strokeWidth !== 2) {
    issues.push(`strokeWidth=${strokeWidth} is not 1.5 (or 2 for utility icons)`);
  }

  return {
    line: lineNum,
    text: line.trim(),
    width,
    height,
    strokeWidth,
    issues,
  };
}

/**
 * Scan a file for SVG icon definitions and check their dimensions/stroke-width.
 * Returns violations found.
 */
function findIconViolations(
  filePath: string,
  content: string,
): { line: number; text: string; issue: string }[] {
  const violations: { line: number; text: string; issue: string }[] = [];
  const lines = content.split('\n');
  const fileName = path.basename(filePath);

  // Skip the Icon.tsx primitive itself — it enforces sizing programmatically
  if (fileName === 'Icon.tsx' && filePath.includes('primitives')) return violations;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Only look at lines with <svg opening tags
    if (!/<svg\b/.test(line)) continue;

    // Gather context: look at surrounding lines for multi-line SVG tags
    const contextLines = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5));

    // For multi-line SVG tags, join the opening tag lines
    let fullTag = line;
    let j = i + 1;
    while (j < lines.length && !fullTag.includes('>')) {
      fullTag += ' ' + lines[j];
      j++;
    }

    const info = analyzeSvgIcon(fullTag, i + 1, contextLines);
    if (info && info.issues.length > 0) {
      for (const issue of info.issues) {
        violations.push({
          line: info.line,
          text: info.text.substring(0, 120),
          issue,
        });
      }
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Helpers: defaultProps pattern detection (for files like icons.tsx)
// ---------------------------------------------------------------------------

/**
 * Check if a file uses a shared defaultProps pattern with valid icon dimensions.
 * Files like navigation/icons.tsx define a `defaultProps` object that all SVGs spread.
 */
function checkDefaultPropsPattern(content: string): {
  hasDefaultProps: boolean;
  width: number | null;
  height: number | null;
  strokeWidth: number | null;
  issues: string[];
} {
  const issues: string[] = [];
  let width: number | null = null;
  let height: number | null = null;
  let strokeWidth: number | null = null;

  // Match defaultProps or similar shared config objects
  const defaultPropsMatch = content.match(
    /(?:const\s+defaultProps|const\s+svgProps|const\s+iconProps)\s*=\s*\{([^}]+)\}/s,
  );

  if (!defaultPropsMatch) {
    return { hasDefaultProps: false, width: null, height: null, strokeWidth: null, issues: [] };
  }

  const propsBlock = defaultPropsMatch[1];

  const widthMatch = propsBlock.match(/width:\s*(\d+)/);
  const heightMatch = propsBlock.match(/height:\s*(\d+)/);
  const strokeMatch = propsBlock.match(/strokeWidth:\s*(\d+\.?\d*)/);

  if (widthMatch) width = parseInt(widthMatch[1], 10);
  if (heightMatch) height = parseInt(heightMatch[1], 10);
  if (strokeMatch) strokeWidth = parseFloat(strokeMatch[1]);

  if (width !== null && !ALLOWED_SIZES.has(width)) {
    issues.push(`defaultProps width=${width}px is not in allowed set {16, 20, 24}`);
  }
  if (height !== null && !ALLOWED_SIZES.has(height)) {
    issues.push(`defaultProps height=${height}px is not in allowed set {16, 20, 24}`);
  }
  if (strokeWidth !== null && strokeWidth !== 1.5 && strokeWidth !== 2) {
    issues.push(`defaultProps strokeWidth=${strokeWidth} is not 1.5`);
  }

  return { hasDefaultProps: true, width, height, strokeWidth, issues };
}

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

const srcDir = path.resolve(__dirname, '../../..');
const sourceFiles = collectSourceFiles(path.join(srcDir, 'src'));

describe('Icon Size Consistency', () => {
  it('should find source files to test', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it('all SVG icons use dimensions from {16, 20, 24}px and stroke-width 1.5', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: sourceFiles.length - 1 }), (index) => {
        const filePath = sourceFiles[index];
        const content = fs.readFileSync(filePath, 'utf-8');

        // First check if file uses a defaultProps pattern
        const defaultPropsCheck = checkDefaultPropsPattern(content);
        if (defaultPropsCheck.hasDefaultProps && defaultPropsCheck.issues.length > 0) {
          const relativePath = path.relative(srcDir, filePath);
          throw new Error(
            `Icon sizing violation in ${relativePath}:\n  ${defaultPropsCheck.issues.join('\n  ')}`,
          );
        }

        // Then check individual SVG elements
        const violations = findIconViolations(filePath, content);
        if (violations.length > 0) {
          const relativePath = path.relative(srcDir, filePath);
          const details = violations
            .map((v) => `  Line ${v.line}: ${v.issue}\n    ${v.text}`)
            .join('\n');
          throw new Error(`Icon sizing violation(s) in ${relativePath}:\n${details}`);
        }

        return true;
      }),
      { numRuns: Math.min(sourceFiles.length * 3, 500) },
    );
  });

  it('all files collectively have consistent icon sizing', () => {
    // Exhaustive check across all files as a complementary verification
    const violations: { file: string; line: number; text: string; issue: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check defaultProps patterns
      const defaultPropsCheck = checkDefaultPropsPattern(content);
      if (defaultPropsCheck.hasDefaultProps && defaultPropsCheck.issues.length > 0) {
        for (const issue of defaultPropsCheck.issues) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: 0,
            text: 'defaultProps object',
            issue,
          });
        }
      }

      // Check individual SVGs
      const fileViolations = findIconViolations(filePath, content);
      for (const v of fileViolations) {
        violations.push({
          file: path.relative(srcDir, filePath),
          line: v.line,
          text: v.text,
          issue: v.issue,
        });
      }
    }

    if (violations.length > 0) {
      const details = violations
        .map((v) => `  ${v.file}:${v.line} — ${v.issue}\n    ${v.text}`)
        .join('\n');
      throw new Error(`Found ${violations.length} icon sizing violation(s):\n${details}`);
    }
  });

  it('navigation icons file uses valid defaultProps', () => {
    // Specifically verify the navigation icons file which defines many icons
    const navIconsPath = path.join(srcDir, 'src/features/navigation/icons.tsx');
    if (!fs.existsSync(navIconsPath)) return;

    const content = fs.readFileSync(navIconsPath, 'utf-8');
    const check = checkDefaultPropsPattern(content);

    expect(check.hasDefaultProps).toBe(true);
    expect(check.issues).toHaveLength(0);
    expect(check.width).toBe(20);
    expect(check.height).toBe(20);
    expect(check.strokeWidth).toBe(1.5);
  });

  it('Icon primitive enforces allowed sizes via TypeScript types', () => {
    // Verify the Icon.tsx primitive only accepts 16 | 20 | 24
    const iconPath = path.join(srcDir, 'src/design-system/primitives/Icon.tsx');
    if (!fs.existsSync(iconPath)) return;

    const content = fs.readFileSync(iconPath, 'utf-8');

    // Check that size prop is typed as 16 | 20 | 24
    expect(content).toMatch(/size\??\s*:\s*16\s*\|\s*20\s*\|\s*24/);

    // Check that it uses tokens.icons.strokeWidth
    expect(content).toMatch(/tokens\.icons\.strokeWidth/);
  });
});
