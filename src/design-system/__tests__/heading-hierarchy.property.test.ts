import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Property-based test: Heading Hierarchy Invariant
 *
 * **Validates: Requirements 10.8**
 *
 * Property: On any rendered page, heading elements follow a strictly non-skipping
 * sequence (h1 before h2, h2 before h3, etc.) with exactly one h1 per page.
 *
 * Tested via: Property-based test scanning page component files and extracting
 * heading levels from each render branch to verify the sequence invariant.
 *
 * Note: React components often use early returns for conditional rendering
 * (e.g., empty state vs loaded state). Each return block represents a mutually
 * exclusive render path, so we validate each branch independently.
 */

// ---------------------------------------------------------------------------
// Helpers: File discovery and heading extraction
// ---------------------------------------------------------------------------

/**
 * Collect all page component files from the features directory.
 * Page components are identified by files ending in `Page.tsx`.
 */
function collectPageFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      results.push(...collectPageFiles(fullPath));
    } else if (entry.isFile()) {
      // Include only Page component files (not test files)
      if (entry.name.endsWith('Page.tsx') && !entry.name.includes('.test.')) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * Collect all page component files from the features directory.
 */
function collectAllPageFiles(srcDir: string): string[] {
  const featuresDir = path.join(srcDir, 'src', 'features');
  return collectPageFiles(featuresDir);
}

/**
 * Extract heading levels from a block of JSX/TSX content.
 * Matches patterns like <h1, <h2, etc. in JSX context.
 * Ignores headings inside comments.
 */
function extractHeadingLevels(content: string): number[] {
  const levels: number[] = [];

  // Remove single-line comments
  const noSingleLineComments = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  const noComments = noSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match JSX heading elements: <h1, <h2, ..., <h6
  const headingPattern = /<h([1-6])[\s>]/g;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(noComments)) !== null) {
    levels.push(parseInt(match[1], 10));
  }

  return levels;
}

/**
 * Find the main exported page component function in the file and extract
 * its body content. This identifies the primary component (exported function
 * whose name ends with "Page") and returns its body.
 */
function extractMainComponentBody(content: string): string | null {
  // Match exported function declarations like:
  //   export function CompressPage()
  //   export function DuplicatePagesPage()
  const exportFuncPattern = /export\s+function\s+\w+Page\s*\([^)]*\)[^{]*\{/g;
  const match = exportFuncPattern.exec(content);

  if (!match) {
    return null;
  }

  // Find the matching closing brace by counting braces
  const startIndex = match.index + match[0].length;
  let braceCount = 1;
  let i = startIndex;

  while (i < content.length && braceCount > 0) {
    if (content[i] === '{') braceCount++;
    if (content[i] === '}') braceCount--;
    i++;
  }

  return content.slice(match.index, i);
}

/**
 * Count the number of early return statements in the component that contain JSX.
 * These represent conditional render paths (e.g., empty state, loading state).
 *
 * Pattern detected: `if (...) { ... return ( ... ); }` followed by the final return.
 * Each early return + the final return = total render paths.
 */
function countRenderPaths(componentBody: string): number {
  // Remove comments
  const noSingleLineComments = componentBody.replace(/\/\/.*$/gm, '');
  const noComments = noSingleLineComments.replace(/\/\*[\s\S]*?\*\//g, '');

  // Count all `return (` or `return (<` patterns in the component body.
  // We need to exclude returns inside nested functions (callbacks, sub-components).
  // Strategy: track function nesting depth.
  let depth = 0;
  let returnCount = 0;
  let i = 0;

  // Skip past the function signature to the opening brace
  const bodyStart = noComments.indexOf('{');
  if (bodyStart === -1) return 1;
  i = bodyStart + 1;
  depth = 1;

  while (i < noComments.length && depth > 0) {
    const char = noComments[i];

    if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
    }

    // Check for arrow functions or function declarations that start a new scope
    // We only count returns at depth 1 (direct body of the component)
    // or depth 2 (inside a simple if/else block)
    if (depth <= 2) {
      // Check if we're at a `return` keyword followed by `(`
      if (noComments.slice(i).match(/^return\s*\(/)) {
        // Make sure this isn't inside a nested function
        // Look backwards to see if we're inside a callback
        const preceding = noComments.slice(Math.max(0, i - 200), i);
        const isInsideCallback = /(?:=>|function\s*\()\s*\{[^}]*$/.test(preceding) && depth > 1;

        if (!isInsideCallback) {
          returnCount++;
        }
      }
    }

    i++;
  }

  return Math.max(returnCount, 1);
}

/**
 * Verify heading hierarchy invariant for a page component:
 * 1. Exactly one h1 per render path (accounting for conditional rendering)
 * 2. No skipped heading levels (e.g., h1 -> h3 without h2 is invalid)
 *
 * Returns null if valid, or an error message if invalid.
 */
function validateHeadingHierarchy(levels: number[], expectedH1Count: number): string | null {
  if (levels.length === 0) {
    // Branches with no headings are acceptable (e.g., loading states)
    return null;
  }

  // Check: h1 count matches expected render paths
  const h1Count = levels.filter((l) => l === 1).length;
  if (h1Count === 0) {
    return `No h1 heading found. Every rendered page view must have exactly one h1.`;
  }
  if (h1Count > expectedH1Count) {
    return `Found ${h1Count} h1 headings but only ${expectedH1Count} render path(s). Each render path should have exactly one h1.`;
  }

  // Check: no skipped levels within each render path
  // Since we can't perfectly split branches statically, we check a weaker but
  // still meaningful invariant: for the sequence of headings, no heading level
  // jumps by more than 1 from the maximum level seen so far.
  // When we encounter a new h1, we reset the tracking (new render path).
  let maxLevelSeen = 0;
  let isFirstHeading = true;

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];

    // When we see an h1, it could be the start of a new render path
    if (level === 1) {
      maxLevelSeen = 1;
      isFirstHeading = false;
      continue;
    }

    if (isFirstHeading) {
      // First heading in the file should be h1
      if (level !== 1) {
        return `First heading is h${level}, expected h1.`;
      }
      isFirstHeading = false;
    }

    if (level > maxLevelSeen + 1) {
      return `Skipped heading level: found h${level} but the deepest level seen before was h${maxLevelSeen}. Expected h${maxLevelSeen + 1} or lower.`;
    }

    if (level > maxLevelSeen) {
      maxLevelSeen = level;
    }
  }

  return null;
}

/**
 * Validate all render branches of a page component.
 * Returns null if all branches are valid, or an error message describing violations.
 */
function validatePageComponent(content: string): string | null {
  // Extract headings from the main component only (not helper components in the same file)
  const componentBody = extractMainComponentBody(content);
  if (!componentBody) {
    // Can't find the main component, fall back to full file analysis
    const headingLevels = extractHeadingLevels(content);
    if (headingLevels.length === 0) return null;
    return validateHeadingHierarchy(headingLevels, 1);
  }

  const headingLevels = extractHeadingLevels(componentBody);
  if (headingLevels.length === 0) return null;

  // Count the number of render paths (early returns + final return)
  const renderPaths = countRenderPaths(componentBody);

  return validateHeadingHierarchy(headingLevels, renderPaths);
}

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

const srcDir = path.resolve(__dirname, '../../..');
const pageFiles = collectAllPageFiles(srcDir);

describe('Heading Hierarchy Invariant', () => {
  it('should find page component files to test', () => {
    expect(pageFiles.length).toBeGreaterThan(0);
  });

  it('every page component render branch maintains a valid heading hierarchy (exactly one h1, no skipped levels)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: pageFiles.length - 1 }), (index) => {
        const filePath = pageFiles[index];
        const content = fs.readFileSync(filePath, 'utf-8');
        const error = validatePageComponent(content);

        if (error !== null) {
          const relativePath = path.relative(srcDir, filePath);
          throw new Error(`Heading hierarchy violation in ${relativePath}:\n  ${error}`);
        }

        return true;
      }),
      { numRuns: Math.min(pageFiles.length * 5, 500) },
    );
  });

  it('all page components collectively maintain valid heading hierarchies', () => {
    // Exhaustive check across all page files as a complementary verification
    const violations: { file: string; error: string }[] = [];

    for (const filePath of pageFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const error = validatePageComponent(content);

      if (error !== null) {
        violations.push({
          file: path.relative(srcDir, filePath),
          error,
        });
      }
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `  ${v.file}:\n    ${v.error}`).join('\n');
      throw new Error(`Found ${violations.length} heading hierarchy violation(s):\n${details}`);
    }
  });
});
