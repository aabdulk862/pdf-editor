import { describe, it, expect } from 'vitest';
import { fuzzyMatch, fuzzyMatchBest, MatchQuality } from './fuzzy-match';

describe('fuzzyMatch', () => {
  describe('empty query', () => {
    it('matches everything with Exact quality when query is empty', () => {
      const result = fuzzyMatch('', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Exact);
    });

    it('matches empty target with Exact quality', () => {
      const result = fuzzyMatch('', '');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Exact);
    });
  });

  describe('exact match', () => {
    it('returns Exact quality for identical strings', () => {
      const result = fuzzyMatch('merge', 'merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Exact);
    });

    it('is case-insensitive for exact match', () => {
      const result = fuzzyMatch('Merge', 'merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Exact);
    });

    it('is case-insensitive for exact match (reverse)', () => {
      const result = fuzzyMatch('merge', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Exact);
    });
  });

  describe('starts-with match', () => {
    it('returns StartsWith quality when target starts with query', () => {
      const result = fuzzyMatch('mer', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.StartsWith);
    });

    it('is case-insensitive for starts-with', () => {
      const result = fuzzyMatch('MER', 'merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.StartsWith);
    });

    it('matches single character at start', () => {
      const result = fuzzyMatch('m', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.StartsWith);
    });
  });

  describe('contains match', () => {
    it('returns Contains quality when target contains query as substring', () => {
      const result = fuzzyMatch('erg', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Contains);
    });

    it('matches at the end of target', () => {
      const result = fuzzyMatch('rge', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Contains);
    });

    it('is case-insensitive for contains', () => {
      const result = fuzzyMatch('ERG', 'merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Contains);
    });

    it('matches multi-word substring', () => {
      const result = fuzzyMatch('to pdf', 'Image to PDF');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Contains);
    });
  });

  describe('fuzzy match', () => {
    it('returns Fuzzy quality when characters appear in order', () => {
      const result = fuzzyMatch('mrg', 'Merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Fuzzy);
    });

    it('matches characters spread across the target', () => {
      const result = fuzzyMatch('ptpdf', 'Password Protect');
      expect(result.matches).toBe(false); // 'pdf' chars not all in 'Password Protect'
    });

    it('matches "wm" against "Watermarks"', () => {
      const result = fuzzyMatch('wm', 'Watermarks');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Fuzzy);
    });

    it('matches "ocrs" against "OCR Scan"', () => {
      const result = fuzzyMatch('ocrs', 'OCR Scan');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Fuzzy);
    });

    it('matches "xtimg" against "Extract Images"', () => {
      const result = fuzzyMatch('xtimg', 'Extract Images');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Fuzzy);
    });

    it('is case-insensitive for fuzzy match', () => {
      const result = fuzzyMatch('MRG', 'merge');
      expect(result.matches).toBe(true);
      expect(result.quality).toBe(MatchQuality.Fuzzy);
    });
  });

  describe('no match', () => {
    it('returns None quality when no match is found', () => {
      const result = fuzzyMatch('xyz', 'Merge');
      expect(result.matches).toBe(false);
      expect(result.quality).toBe(MatchQuality.None);
    });

    it('does not match when characters are in wrong order', () => {
      const result = fuzzyMatch('egm', 'Merge');
      expect(result.matches).toBe(false);
      expect(result.quality).toBe(MatchQuality.None);
    });

    it('does not match when query is longer than target', () => {
      const result = fuzzyMatch('merging files', 'Merge');
      expect(result.matches).toBe(false);
      expect(result.quality).toBe(MatchQuality.None);
    });
  });

  describe('quality ranking', () => {
    it('ranks Exact > StartsWith > Contains > Fuzzy > None', () => {
      expect(MatchQuality.Exact).toBeGreaterThan(MatchQuality.StartsWith);
      expect(MatchQuality.StartsWith).toBeGreaterThan(MatchQuality.Contains);
      expect(MatchQuality.Contains).toBeGreaterThan(MatchQuality.Fuzzy);
      expect(MatchQuality.Fuzzy).toBeGreaterThan(MatchQuality.None);
    });
  });
});

describe('fuzzyMatchBest', () => {
  it('returns the best match quality across multiple fields', () => {
    const result = fuzzyMatchBest('merge', ['Merge', 'Organize']);
    expect(result.matches).toBe(true);
    expect(result.quality).toBe(MatchQuality.Exact);
  });

  it('returns Contains when best match is a substring in second field', () => {
    const result = fuzzyMatchBest('organ', ['Merge', 'Organize']);
    expect(result.matches).toBe(true);
    expect(result.quality).toBe(MatchQuality.StartsWith);
  });

  it('returns Fuzzy when only fuzzy match exists', () => {
    const result = fuzzyMatchBest('mrg', ['Merge', 'Organize']);
    expect(result.matches).toBe(true);
    expect(result.quality).toBe(MatchQuality.Fuzzy);
  });

  it('returns None when no field matches', () => {
    const result = fuzzyMatchBest('xyz', ['Merge', 'Organize']);
    expect(result.matches).toBe(false);
    expect(result.quality).toBe(MatchQuality.None);
  });

  it('short-circuits on exact match', () => {
    const result = fuzzyMatchBest('merge', ['Merge', 'Something Else']);
    expect(result.quality).toBe(MatchQuality.Exact);
  });

  it('handles empty fields array', () => {
    const result = fuzzyMatchBest('test', []);
    expect(result.matches).toBe(false);
    expect(result.quality).toBe(MatchQuality.None);
  });
});
