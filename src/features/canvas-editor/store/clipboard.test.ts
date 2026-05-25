import { describe, it, expect } from 'vitest';

import type { CanvasElement, ShapeElement, TextElement } from '../types';

import { cloneElementsForClipboard, prepareElementsForPaste } from './clipboard';

function makeShape(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: 'shape-1',
    type: 'shape',
    x: 50,
    y: 100,
    width: 200,
    height: 150,
    rotation: 0,
    opacity: 100,
    zIndex: 1,
    locked: false,
    visible: true,
    shapeType: 'rectangle',
    fill: '#ff0000',
    stroke: '#000000',
    strokeWidth: 2,
    borderStyle: 'solid',
    ...overrides,
  };
}

function makeText(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: 'text-1',
    type: 'text',
    x: 10,
    y: 20,
    width: 200,
    height: 50,
    rotation: 0,
    opacity: 100,
    zIndex: 2,
    locked: false,
    visible: true,
    content: 'Hello world',
    fontFamily: 'Inter',
    fontSize: 16,
    fontColor: '#000000',
    bold: false,
    italic: false,
    underline: false,
    alignment: 'left',
    ...overrides,
  };
}

describe('cloneElementsForClipboard', () => {
  it('should deep clone elements producing independent copies', () => {
    const original = makeShape({
      shadow: { offsetX: 5, offsetY: 5, blur: 10, color: '#00000080' },
    });
    const elements: CanvasElement[] = [original];

    const cloned = cloneElementsForClipboard(elements);

    expect(cloned).toHaveLength(1);
    expect(cloned[0]).toEqual(original);
    // Verify it's a deep clone (not the same reference)
    expect(cloned[0]).not.toBe(original);
    expect((cloned[0] as ShapeElement).shadow).not.toBe(original.shadow);
  });

  it('should clone multiple elements', () => {
    const elements: CanvasElement[] = [makeShape(), makeText()];

    const cloned = cloneElementsForClipboard(elements);

    expect(cloned).toHaveLength(2);
    expect(cloned[0]).toEqual(elements[0]);
    expect(cloned[1]).toEqual(elements[1]);
  });

  it('should return an empty array when given no elements', () => {
    const cloned = cloneElementsForClipboard([]);
    expect(cloned).toEqual([]);
  });
});

describe('prepareElementsForPaste', () => {
  it('should assign new unique IDs to pasted elements', () => {
    const clipboard: CanvasElement[] = [makeShape({ id: 'original-id' })];
    const existing: CanvasElement[] = [];

    const pasted = prepareElementsForPaste(clipboard, existing);

    expect(pasted).toHaveLength(1);
    expect(pasted[0].id).not.toBe('original-id');
    expect(pasted[0].id.length).toBeGreaterThan(0);
  });

  it('should offset pasted elements by 10px in both x and y', () => {
    const clipboard: CanvasElement[] = [makeShape({ x: 50, y: 100 })];
    const existing: CanvasElement[] = [];

    const pasted = prepareElementsForPaste(clipboard, existing);

    expect(pasted[0].x).toBe(60);
    expect(pasted[0].y).toBe(110);
  });

  it('should assign z-indices starting from max existing z-index + 1', () => {
    const clipboard: CanvasElement[] = [
      makeShape({ id: 'a', zIndex: 1 }),
      makeText({ id: 'b', zIndex: 2 }),
    ];
    const existing: CanvasElement[] = [
      makeShape({ id: 'existing-1', zIndex: 5 }),
      makeText({ id: 'existing-2', zIndex: 10 }),
    ];

    const pasted = prepareElementsForPaste(clipboard, existing);

    expect(pasted[0].zIndex).toBe(11); // max(5,10) + 1
    expect(pasted[1].zIndex).toBe(12); // max(5,10) + 2
  });

  it('should start z-index at 1 when there are no existing elements', () => {
    const clipboard: CanvasElement[] = [makeShape({ zIndex: 99 })];
    const existing: CanvasElement[] = [];

    const pasted = prepareElementsForPaste(clipboard, existing);

    expect(pasted[0].zIndex).toBe(1); // max of empty = 0, so 0 + 1
  });

  it('should not mutate the original clipboard elements', () => {
    const clipboard: CanvasElement[] = [makeShape({ id: 'keep-me', x: 50, y: 100 })];
    const existing: CanvasElement[] = [makeShape({ zIndex: 3 })];

    prepareElementsForPaste(clipboard, existing);

    expect(clipboard[0].id).toBe('keep-me');
    expect(clipboard[0].x).toBe(50);
    expect(clipboard[0].y).toBe(100);
  });

  it('should generate unique IDs for each pasted element', () => {
    const clipboard: CanvasElement[] = [makeShape({ id: 'same' }), makeText({ id: 'same' })];
    const existing: CanvasElement[] = [];

    const pasted = prepareElementsForPaste(clipboard, existing);

    expect(pasted[0].id).not.toBe(pasted[1].id);
  });
});
