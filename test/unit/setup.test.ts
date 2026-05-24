import { describe, it, expect } from 'vitest';
import { test as fcTest, fc } from '@fast-check/vitest';

describe('Test setup verification', () => {
  it('vitest works with jsdom environment', () => {
    expect(document).toBeDefined();
    expect(window).toBeDefined();
  });

  it('@testing-library/jest-dom matchers are available', () => {
    const div = document.createElement('div');
    div.textContent = 'hello';
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
    document.body.removeChild(div);
  });

  fcTest.prop([fc.integer()])('fast-check property testing works', (n) => {
    expect(typeof n).toBe('number');
    expect(Number.isInteger(n)).toBe(true);
  });
});
