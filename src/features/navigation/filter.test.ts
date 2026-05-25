import { describe, it, expect } from 'vitest';
import { filterNavigation } from './filter';
import { NAV_CATEGORIES } from './categories';

describe('filterNavigation', () => {
  it('returns all categories when query is empty', () => {
    const result = filterNavigation('');
    expect(result.categories).toBe(NAV_CATEGORIES);
    expect(result.hasResults).toBe(true);
  });

  it('returns all categories when query is whitespace only', () => {
    const result = filterNavigation('   ');
    expect(result.categories).toBe(NAV_CATEGORIES);
    expect(result.hasResults).toBe(true);
  });

  it('matches tool labels case-insensitively', () => {
    const result = filterNavigation('merge');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Merge')).toBe(true);
  });

  it('matches with uppercase query', () => {
    const result = filterNavigation('MERGE');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Merge')).toBe(true);
  });

  it('matches with mixed case query', () => {
    const result = filterNavigation('MeRgE');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Merge')).toBe(true);
  });

  it('includes entire category when category label matches', () => {
    const result = filterNavigation('protect');
    expect(result.hasResults).toBe(true);
    const protectCategory = result.categories.find((c) => c.id === 'protect');
    expect(protectCategory).toBeDefined();
    // All tools in the category should be included
    expect(protectCategory!.tools.length).toBe(3);
  });

  it('includes only matching tools when category label does not match', () => {
    const result = filterNavigation('split');
    expect(result.hasResults).toBe(true);
    const organizeCategory = result.categories.find((c) => c.id === 'organize');
    expect(organizeCategory).toBeDefined();
    expect(organizeCategory!.tools.length).toBe(1);
    expect(organizeCategory!.tools[0].label).toBe('Split');
  });

  it('returns hasResults=false when no tools or categories match', () => {
    const result = filterNavigation('zzzznonexistent');
    expect(result.hasResults).toBe(false);
    expect(result.categories).toHaveLength(0);
  });

  it('matches partial tool names', () => {
    const result = filterNavigation('water');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Watermarks')).toBe(true);
  });

  it('matches tools across multiple categories', () => {
    const result = filterNavigation('extract');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Extract Images')).toBe(true);
    expect(tools.some((t) => t.label === 'Extract Text')).toBe(true);
  });

  it('matches category name "OCR" and includes all its tools', () => {
    const result = filterNavigation('ocr');
    expect(result.hasResults).toBe(true);
    const ocrCategory = result.categories.find((c) => c.id === 'ocr');
    expect(ocrCategory).toBeDefined();
    expect(ocrCategory!.tools.length).toBe(2);
  });

  it('does not mutate original NAV_CATEGORIES when filtering tools', () => {
    const originalToolCount = NAV_CATEGORIES.find((c) => c.id === 'organize')!.tools.length;
    filterNavigation('split');
    expect(NAV_CATEGORIES.find((c) => c.id === 'organize')!.tools.length).toBe(originalToolCount);
  });

  it('matches tool descriptions (fuzzy matching across descriptions)', () => {
    // "encrypt" appears in Password Protect's description but not its label
    const result = filterNavigation('encrypt');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Password Protect')).toBe(true);
  });

  it('matches partial description text', () => {
    // "drag-and-drop" appears in Reorder's description
    const result = filterNavigation('drag-and-drop');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Reorder')).toBe(true);
  });

  it('matches description keywords that differ from tool name', () => {
    // "sensitive" appears in Redact's description but not its label
    const result = filterNavigation('sensitive');
    expect(result.hasResults).toBe(true);
    const tools = result.categories.flatMap((c) => c.tools);
    expect(tools.some((t) => t.label === 'Redact')).toBe(true);
  });

  it('ranks label matches higher than description matches', () => {
    // "Compress" is both a label and appears in descriptions
    const result = filterNavigation('compress');
    expect(result.hasResults).toBe(true);
    const analyzeCategory = result.categories.find((c) => c.id === 'analyze');
    expect(analyzeCategory).toBeDefined();
    // Compress should be first in its category since it's an exact label match
    expect(analyzeCategory!.tools[0].label).toBe('Compress');
  });
});
