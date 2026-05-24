import { describe, it, expect } from 'vitest';
import { formatFileSize, calculatePercentChange } from '@/utils/file-size';

describe('formatFileSize', () => {
  it('returns bytes for values under 1024', () => {
    expect(formatFileSize(0)).toBe('0 bytes');
    expect(formatFileSize(1)).toBe('1 bytes');
    expect(formatFileSize(512)).toBe('512 bytes');
    expect(formatFileSize(1023)).toBe('1023 bytes');
  });

  it('returns KB with 1 decimal for values in [1024, 1MB)', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(10240)).toBe('10.0 KB');
    expect(formatFileSize(1048575)).toBe('1024.0 KB');
  });

  it('returns MB with 1 decimal for values >= 1MB', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
    expect(formatFileSize(10485760)).toBe('10.0 MB');
    expect(formatFileSize(104857600)).toBe('100.0 MB');
  });
});

describe('calculatePercentChange', () => {
  it('returns "0.0%" when original equals modified', () => {
    expect(calculatePercentChange(100, 100)).toBe('0.0%');
    expect(calculatePercentChange(1048576, 1048576)).toBe('0.0%');
  });

  it('returns "+" prefix for size increases', () => {
    expect(calculatePercentChange(100, 150)).toBe('+50.0%');
    expect(calculatePercentChange(1000, 1100)).toBe('+10.0%');
  });

  it('returns "\u2212" (Unicode minus) prefix for size decreases', () => {
    expect(calculatePercentChange(200, 100)).toBe('\u221250.0%');
    expect(calculatePercentChange(1000, 750)).toBe('\u221225.0%');
  });

  it('rounds to 1 decimal place', () => {
    expect(calculatePercentChange(3, 1)).toBe('\u221266.7%');
    expect(calculatePercentChange(3, 4)).toBe('+33.3%');
  });
});
