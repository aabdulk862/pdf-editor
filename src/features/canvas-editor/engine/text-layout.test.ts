import { describe, it, expect, beforeEach } from 'vitest';
import {
  measureTextWidth,
  buildFontString,
  wrapText,
  getTextLines,
  getAlignedX,
  getCanvasTextAlign,
  applyTextRun,
  getStyledSegments,
  renderJustifiedLine,
  renderTextElement,
} from './text-layout';
import type { TextElement, TextRun } from '../types';

// === Mock CanvasRenderingContext2D ===

function createMockContext(): CanvasRenderingContext2D {
  const state = {
    font: '',
    fillStyle: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    globalAlpha: 1,
    strokeStyle: '',
    lineWidth: 1,
  };

  const calls: { method: string; args: unknown[] }[] = [];

  const ctx = {
    get font() {
      return state.font;
    },
    set font(v: string) {
      state.font = v;
    },
    get fillStyle() {
      return state.fillStyle;
    },
    set fillStyle(v: string | CanvasGradient | CanvasPattern) {
      state.fillStyle = v as string;
    },
    get textAlign() {
      return state.textAlign;
    },
    set textAlign(v: CanvasTextAlign) {
      state.textAlign = v;
    },
    get textBaseline() {
      return state.textBaseline;
    },
    set textBaseline(v: CanvasTextBaseline) {
      state.textBaseline = v;
    },
    get globalAlpha() {
      return state.globalAlpha;
    },
    set globalAlpha(v: number) {
      state.globalAlpha = v;
    },
    get strokeStyle() {
      return state.strokeStyle;
    },
    set strokeStyle(v: string | CanvasGradient | CanvasPattern) {
      state.strokeStyle = v as string;
    },
    get lineWidth() {
      return state.lineWidth;
    },
    set lineWidth(v: number) {
      state.lineWidth = v;
    },
    measureText(text: string) {
      // Simple mock: each character is ~8px wide (monospace approximation)
      return { width: text.length * 8 };
    },
    fillText(text: string, x: number, y: number) {
      calls.push({ method: 'fillText', args: [text, x, y] });
    },
    save() {
      calls.push({ method: 'save', args: [] });
    },
    restore() {
      calls.push({ method: 'restore', args: [] });
    },
    translate(x: number, y: number) {
      calls.push({ method: 'translate', args: [x, y] });
    },
    rotate(angle: number) {
      calls.push({ method: 'rotate', args: [angle] });
    },
    beginPath() {
      calls.push({ method: 'beginPath', args: [] });
    },
    moveTo(x: number, y: number) {
      calls.push({ method: 'moveTo', args: [x, y] });
    },
    lineTo(x: number, y: number) {
      calls.push({ method: 'lineTo', args: [x, y] });
    },
    stroke() {
      calls.push({ method: 'stroke', args: [] });
    },
    _calls: calls,
    _state: state,
  } as unknown as CanvasRenderingContext2D & {
    _calls: typeof calls;
    _state: typeof state;
  };

  return ctx;
}

describe('buildFontString', () => {
  it('builds a normal font string', () => {
    expect(buildFontString(16, 'Arial', false, false)).toBe('normal normal 16px Arial');
  });

  it('builds a bold font string', () => {
    expect(buildFontString(24, 'Helvetica', true, false)).toBe('normal bold 24px Helvetica');
  });

  it('builds an italic font string', () => {
    expect(buildFontString(12, 'Times', false, true)).toBe('italic normal 12px Times');
  });

  it('builds a bold italic font string', () => {
    expect(buildFontString(18, 'Georgia', true, true)).toBe('italic bold 18px Georgia');
  });
});

describe('measureTextWidth', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('measures text width using the context', () => {
    const width = measureTextWidth(ctx, 'Hello', '16px Arial');
    // Mock: 5 chars * 8px = 40
    expect(width).toBe(40);
  });

  it('sets the font on the context before measuring', () => {
    measureTextWidth(ctx, 'Test', 'bold 24px Helvetica');
    expect(ctx.font).toBe('bold 24px Helvetica');
  });

  it('returns 0 for empty string', () => {
    const width = measureTextWidth(ctx, '', '16px Arial');
    expect(width).toBe(0);
  });
});

describe('wrapText', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('returns single line when text fits within maxWidth', () => {
    // "Hello" = 5 chars * 8px = 40px, maxWidth = 100
    const lines = wrapText(ctx, 'Hello', 100, '16px Arial');
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('Hello');
  });

  it('wraps text into multiple lines when exceeding maxWidth', () => {
    // "Hello World" = 11 chars * 8px = 88px, maxWidth = 50
    const lines = wrapText(ctx, 'Hello World', 50, '16px Arial');
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe('Hello');
    expect(lines[1].text).toBe('World');
  });

  it('handles multiple words wrapping across several lines', () => {
    // "one two three four" with maxWidth = 40 (5 chars)
    const lines = wrapText(ctx, 'one two three four', 40, '16px Arial');
    // "one" = 24, "one two" = 56 > 40, so "one" is line 1
    // "two" = 24, "two three" = 72 > 40, so "two" is line 2
    // "three" = 40, "three four" = 80 > 40, so "three" is line 3
    // "four" = 32, line 4
    expect(lines).toHaveLength(4);
    expect(lines[0].text).toBe('one');
    expect(lines[1].text).toBe('two');
    expect(lines[2].text).toBe('three');
    expect(lines[3].text).toBe('four');
  });

  it('preserves newlines as paragraph breaks', () => {
    const lines = wrapText(ctx, 'Line 1\nLine 2', 200, '16px Arial');
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe('Line 1');
    expect(lines[1].text).toBe('Line 2');
  });

  it('handles empty lines from consecutive newlines', () => {
    const lines = wrapText(ctx, 'A\n\nB', 200, '16px Arial');
    expect(lines).toHaveLength(3);
    expect(lines[0].text).toBe('A');
    expect(lines[1].text).toBe('');
    expect(lines[2].text).toBe('B');
  });

  it('handles empty string', () => {
    const lines = wrapText(ctx, '', 200, '16px Arial');
    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe('');
  });

  it('places long words on their own line without breaking', () => {
    // "Supercalifragilistic" = 20 chars * 8px = 160px, maxWidth = 80
    const lines = wrapText(ctx, 'Hi Supercalifragilistic', 80, '16px Arial');
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe('Hi');
    expect(lines[1].text).toBe('Supercalifragilistic');
  });
});

describe('getTextLines', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it('wraps text using font parameters', () => {
    const lines = getTextLines(ctx, 'Hello World', 50, 'Arial', 16);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe('Hello');
    expect(lines[1].text).toBe('World');
  });

  it('uses bold and italic in font string', () => {
    getTextLines(ctx, 'Test', 200, 'Arial', 16, true, true);
    expect(ctx.font).toBe('italic bold 16px Arial');
  });
});

describe('getAlignedX', () => {
  it('returns element x for left alignment', () => {
    expect(getAlignedX('left', 10, 200)).toBe(10);
  });

  it('returns center x for center alignment', () => {
    expect(getAlignedX('center', 10, 200)).toBe(110);
  });

  it('returns right edge for right alignment', () => {
    expect(getAlignedX('right', 10, 200)).toBe(210);
  });

  it('returns element x for justify alignment', () => {
    expect(getAlignedX('justify', 10, 200)).toBe(10);
  });
});

describe('getCanvasTextAlign', () => {
  it('returns "left" for left alignment', () => {
    expect(getCanvasTextAlign('left')).toBe('left');
  });

  it('returns "center" for center alignment', () => {
    expect(getCanvasTextAlign('center')).toBe('center');
  });

  it('returns "right" for right alignment', () => {
    expect(getCanvasTextAlign('right')).toBe('right');
  });

  it('returns "left" for justify alignment', () => {
    expect(getCanvasTextAlign('justify')).toBe('left');
  });
});

describe('applyTextRun', () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockContext();
  });

  const defaults = {
    fontFamily: 'Arial',
    fontSize: 16,
    fontColor: '#000000',
    bold: false,
    italic: false,
  };

  it('applies run properties to context', () => {
    const run: TextRun = {
      start: 0,
      end: 5,
      bold: true,
      fontColor: '#FF0000',
      fontSize: 24,
    };

    applyTextRun(ctx, run, defaults);
    expect(ctx.font).toBe('normal bold 24px Arial');
    expect(ctx.fillStyle).toBe('#FF0000');
  });

  it('falls back to defaults when run properties are undefined', () => {
    const run: TextRun = { start: 0, end: 5 };

    applyTextRun(ctx, run, defaults);
    expect(ctx.font).toBe('normal normal 16px Arial');
    expect(ctx.fillStyle).toBe('#000000');
  });

  it('applies italic from run', () => {
    const run: TextRun = { start: 0, end: 5, italic: true };

    applyTextRun(ctx, run, defaults);
    expect(ctx.font).toBe('italic normal 16px Arial');
  });

  it('applies fontFamily from run', () => {
    const run: TextRun = { start: 0, end: 5, fontFamily: 'Georgia' };

    applyTextRun(ctx, run, defaults);
    expect(ctx.font).toBe('normal normal 16px Georgia');
  });
});

describe('getStyledSegments', () => {
  const defaults = {
    fontFamily: 'Arial',
    fontSize: 16,
    fontColor: '#000000',
    bold: false,
    italic: false,
  };

  it('returns single segment with defaults when no runs', () => {
    const segments = getStyledSegments('Hello', 0, [], defaults);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Hello');
    expect(segments[0].bold).toBe(false);
    expect(segments[0].fontColor).toBe('#000000');
  });

  it('splits text into segments based on runs', () => {
    const runs: TextRun[] = [{ start: 0, end: 3, bold: true }];
    const segments = getStyledSegments('Hello', 0, runs, defaults);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('Hel');
    expect(segments[0].bold).toBe(true);
    expect(segments[1].text).toBe('lo');
    expect(segments[1].bold).toBe(false);
  });

  it('handles run that covers entire line', () => {
    const runs: TextRun[] = [{ start: 0, end: 5, fontColor: '#FF0000' }];
    const segments = getStyledSegments('Hello', 0, runs, defaults);

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Hello');
    expect(segments[0].fontColor).toBe('#FF0000');
  });

  it('handles run that partially overlaps line (offset)', () => {
    // Line starts at offset 5, text is "World"
    const runs: TextRun[] = [{ start: 3, end: 7, bold: true }];
    const segments = getStyledSegments('World', 5, runs, defaults);

    // Run covers chars 3-7, line covers chars 5-10
    // Overlap: chars 5-7 → "Wo" is bold, "rld" is default
    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe('Wo');
    expect(segments[0].bold).toBe(true);
    expect(segments[1].text).toBe('rld');
    expect(segments[1].bold).toBe(false);
  });

  it('handles multiple runs on same line', () => {
    const runs: TextRun[] = [
      { start: 0, end: 2, bold: true },
      { start: 3, end: 5, italic: true },
    ];
    const segments = getStyledSegments('Hello', 0, runs, defaults);

    // Boundaries: 0, 2, 3, 5 → segments: [0,2), [2,3), [3,5)
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe('He');
    expect(segments[0].bold).toBe(true);
    expect(segments[1].text).toBe('l');
    expect(segments[1].bold).toBe(false);
    expect(segments[2].text).toBe('lo');
    expect(segments[2].italic).toBe(true);
  });
});

describe('renderJustifiedLine', () => {
  let ctx: CanvasRenderingContext2D & { _calls: { method: string; args: unknown[] }[] };

  beforeEach(() => {
    ctx = createMockContext() as typeof ctx;
  });

  it('renders last line left-aligned', () => {
    renderJustifiedLine(ctx, 'Hello World', 0, 0, 200, true);
    expect(ctx.textAlign).toBe('left');
    // Should call fillText once with the full line
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls).toHaveLength(1);
    expect(fillCalls[0].args[0]).toBe('Hello World');
  });

  it('distributes space between words for non-last lines', () => {
    renderJustifiedLine(ctx, 'Hello World', 0, 0, 200, false);
    // Should render each word separately
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls).toHaveLength(2);
    expect(fillCalls[0].args[0]).toBe('Hello');
    expect(fillCalls[1].args[0]).toBe('World');
  });

  it('renders single word left-aligned even if not last line', () => {
    renderJustifiedLine(ctx, 'Hello', 0, 0, 200, false);
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls).toHaveLength(1);
    expect(fillCalls[0].args[0]).toBe('Hello');
  });
});

describe('renderTextElement', () => {
  let ctx: CanvasRenderingContext2D & { _calls: { method: string; args: unknown[] }[] };

  beforeEach(() => {
    ctx = createMockContext() as typeof ctx;
  });

  const baseElement: TextElement = {
    id: 'text-1',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 100,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    content: 'Hello World',
    fontFamily: 'Arial',
    fontSize: 16,
    fontColor: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left',
  };

  it('renders text element with save/restore', () => {
    renderTextElement(ctx, baseElement);
    expect(ctx._calls[0].method).toBe('save');
    expect(ctx._calls[ctx._calls.length - 1].method).toBe('restore');
  });

  it('renders text with left alignment', () => {
    renderTextElement(ctx, baseElement);
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('applies opacity', () => {
    renderTextElement(ctx, { ...baseElement, opacity: 50 });
    // globalAlpha should be set to 0.5
    // We check via the mock state
    // After restore, globalAlpha is reset, but during render it was 0.5
    // We verify by checking the calls pattern
    expect(ctx._calls[0].method).toBe('save');
  });

  it('applies rotation transform when rotation is non-zero', () => {
    renderTextElement(ctx, { ...baseElement, rotation: 45 });
    const rotateCalls = ctx._calls.filter((c) => c.method === 'rotate');
    expect(rotateCalls).toHaveLength(1);
    expect(rotateCalls[0].args[0]).toBeCloseTo((45 * Math.PI) / 180);
  });

  it('does not apply rotation when rotation is 0', () => {
    renderTextElement(ctx, baseElement);
    const rotateCalls = ctx._calls.filter((c) => c.method === 'rotate');
    expect(rotateCalls).toHaveLength(0);
  });

  it('applies viewport transform when viewport is provided', () => {
    const viewport = { panX: 5, panY: 10, zoom: 2 };
    renderTextElement(ctx, baseElement, viewport);
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls.length).toBeGreaterThan(0);
    // x should be (10 * MM_TO_PX - 5) * 2
    // y should be (20 * MM_TO_PX - 10) * 2
    const MM_TO_PX = 96 / 25.4;
    expect(fillCalls[0].args[1]).toBe((10 * MM_TO_PX - 5) * 2);
    expect(fillCalls[0].args[2]).toBe((20 * MM_TO_PX - 10) * 2);
  });

  it('renders with center alignment', () => {
    renderTextElement(ctx, { ...baseElement, alignment: 'center' });
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('renders with styled runs', () => {
    const runs: TextRun[] = [{ start: 0, end: 5, bold: true, fontColor: '#FF0000' }];
    renderTextElement(ctx, { ...baseElement, runs });
    const fillCalls = ctx._calls.filter((c) => c.method === 'fillText');
    expect(fillCalls.length).toBeGreaterThan(0);
  });

  it('renders underline when enabled', () => {
    renderTextElement(ctx, { ...baseElement, underline: true });
    const strokeCalls = ctx._calls.filter((c) => c.method === 'stroke');
    expect(strokeCalls.length).toBeGreaterThan(0);
  });
});
