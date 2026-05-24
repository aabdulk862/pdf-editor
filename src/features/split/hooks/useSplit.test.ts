import { describe, it, expect } from 'vitest';
import { parseRangeInput } from './useSplit';

describe('parseRangeInput', () => {
  it('parses a single range correctly', () => {
    const { ranges, errors } = parseRangeInput('1-3');
    expect(errors).toHaveLength(0);
    expect(ranges).toEqual([{ start: 1, end: 3 }]);
  });

  it('parses multiple ranges correctly', () => {
    const { ranges, errors } = parseRangeInput('1-3, 4-6, 7-10');
    expect(errors).toHaveLength(0);
    expect(ranges).toEqual([
      { start: 1, end: 3 },
      { start: 4, end: 6 },
      { start: 7, end: 10 },
    ]);
  });

  it('parses single page entries', () => {
    const { ranges, errors } = parseRangeInput('5');
    expect(errors).toHaveLength(0);
    expect(ranges).toEqual([{ start: 5, end: 5 }]);
  });

  it('parses mixed ranges and single pages', () => {
    const { ranges, errors } = parseRangeInput('1-3, 5, 7-9');
    expect(errors).toHaveLength(0);
    expect(ranges).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 7, end: 9 },
    ]);
  });

  it('handles overlapping ranges', () => {
    const { ranges, errors } = parseRangeInput('1-5, 3-7');
    expect(errors).toHaveLength(0);
    expect(ranges).toEqual([
      { start: 1, end: 5 },
      { start: 3, end: 7 },
    ]);
  });

  it('returns error for empty input', () => {
    const { ranges, errors } = parseRangeInput('');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('at least one page range');
    expect(ranges).toHaveLength(0);
  });

  it('returns error for non-numeric input', () => {
    const { ranges, errors } = parseRangeInput('abc');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('not a valid number');
    expect(ranges).toHaveLength(0);
  });

  it('returns error for non-numeric start in range', () => {
    const { errors } = parseRangeInput('abc-5');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('start page is not a valid number');
  });

  it('returns error for non-numeric end in range', () => {
    const { errors } = parseRangeInput('1-xyz');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('end page is not a valid number');
  });

  it('returns error when exceeding max 20 ranges', () => {
    const input = Array.from({ length: 21 }, (_, i) => `${i + 1}`).join(', ');
    const { errors } = parseRangeInput(input);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Maximum of 20 ranges');
  });

  it('handles whitespace around ranges', () => {
    const { ranges, errors } = parseRangeInput('  1 - 3 ,  5 - 7  ');
    expect(errors).toHaveLength(0);
    expect(ranges).toEqual([
      { start: 1, end: 3 },
      { start: 5, end: 7 },
    ]);
  });

  it('allows exactly 20 ranges', () => {
    const input = Array.from({ length: 20 }, (_, i) => `${i + 1}`).join(', ');
    const { ranges, errors } = parseRangeInput(input);
    expect(errors).toHaveLength(0);
    expect(ranges).toHaveLength(20);
  });
});
