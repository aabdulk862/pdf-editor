import { beforeEach, describe, expect, it } from 'vitest';

import {
  MAX_PAGES,
  MAX_SAVED_COLORS,
  PAGE_DIMENSION_MAX,
  PAGE_DIMENSION_MIN,
  ZOOM_MAX,
  ZOOM_MIN,
} from '../constants';
import type { CanvasDocument, ShapeElement } from '../types';

import { useCanvasStore } from './canvas-store';

function createTestElement(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: `el-${Math.random().toString(36).slice(2, 8)}`,
    type: 'shape',
    shapeType: 'rectangle',
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 100,
    zIndex: 0,
    locked: false,
    visible: true,
    fill: '#FF0000',
    stroke: '#000000',
    strokeWidth: 1,
    borderStyle: 'solid',
    ...overrides,
  };
}

describe('Canvas Store', () => {
  beforeEach(() => {
    useCanvasStore.setState(useCanvasStore.getInitialState());
  });

  describe('Document Actions', () => {
    it('createDocument creates a document with one blank A4 page', () => {
      useCanvasStore.getState().createDocument();
      const state = useCanvasStore.getState();

      expect(state.document).not.toBeNull();
      expect(state.document!.name).toBe('Untitled Design');
      expect(state.document!.pages).toHaveLength(1);
      expect(state.document!.pages[0].width).toBe(210);
      expect(state.document!.pages[0].height).toBe(297);
      expect(state.document!.activePageIndex).toBe(0);
    });

    it('createDocument accepts a custom name', () => {
      useCanvasStore.getState().createDocument('My Design');
      expect(useCanvasStore.getState().document!.name).toBe('My Design');
    });

    it('loadDocument replaces the current document', () => {
      const doc: CanvasDocument = {
        id: 'test-doc',
        name: 'Loaded Doc',
        pages: [{ id: 'p1', width: 300, height: 400, backgroundColor: '#FFFFFF', elements: [] }],
        activePageIndex: 0,
        createdAt: 1000,
        updatedAt: 2000,
      };

      useCanvasStore.getState().loadDocument(doc);
      const state = useCanvasStore.getState();

      expect(state.document!.id).toBe('test-doc');
      expect(state.document!.name).toBe('Loaded Doc');
      expect(state.selection.selectedIds).toHaveLength(0);
    });

    it('saveToLocalStorage persists document under correct key', () => {
      useCanvasStore.getState().createDocument();
      const docId = useCanvasStore.getState().document!.id;

      useCanvasStore.getState().saveToLocalStorage();

      const stored = localStorage.getItem(`canvas-editor-document-${docId}`);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.id).toBe(docId);
    });

    it('saveToLocalStorage does nothing when no document', () => {
      const keysBefore = localStorage.length;
      useCanvasStore.getState().saveToLocalStorage();
      expect(localStorage.length).toBe(keysBefore);
    });
  });

  describe('Page Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('addPage adds a page after the active page', () => {
      useCanvasStore.getState().addPage();
      const state = useCanvasStore.getState();

      expect(state.document!.pages).toHaveLength(2);
      expect(state.document!.activePageIndex).toBe(1);
    });

    it('addPage respects afterIndex parameter', () => {
      useCanvasStore.getState().addPage(); // now 2 pages
      useCanvasStore.getState().addPage(0); // insert after index 0

      const state = useCanvasStore.getState();
      expect(state.document!.pages).toHaveLength(3);
      expect(state.document!.activePageIndex).toBe(1);
    });

    it('addPage rejects when at MAX_PAGES', () => {
      // Fill to max
      for (let i = 1; i < MAX_PAGES; i++) {
        useCanvasStore.getState().addPage();
      }
      expect(useCanvasStore.getState().document!.pages).toHaveLength(MAX_PAGES);

      useCanvasStore.getState().addPage();
      expect(useCanvasStore.getState().document!.pages).toHaveLength(MAX_PAGES);
    });

    it('removePage removes the specified page', () => {
      useCanvasStore.getState().addPage();
      expect(useCanvasStore.getState().document!.pages).toHaveLength(2);

      useCanvasStore.getState().removePage(1);
      expect(useCanvasStore.getState().document!.pages).toHaveLength(1);
    });

    it('removePage does not remove the last page', () => {
      useCanvasStore.getState().removePage(0);
      expect(useCanvasStore.getState().document!.pages).toHaveLength(1);
    });

    it('setActivePage changes the active page index', () => {
      useCanvasStore.getState().addPage();
      useCanvasStore.getState().setActivePage(0);
      expect(useCanvasStore.getState().document!.activePageIndex).toBe(0);
    });

    it('setActivePage rejects invalid index', () => {
      useCanvasStore.getState().setActivePage(5);
      expect(useCanvasStore.getState().document!.activePageIndex).toBe(0);
    });

    it('setPageSize updates dimensions within valid range', () => {
      useCanvasStore.getState().setPageSize(0, 300, 400);
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.width).toBe(300);
      expect(page.height).toBe(400);
    });

    it('setPageSize rejects dimensions below minimum', () => {
      useCanvasStore.getState().setPageSize(0, PAGE_DIMENSION_MIN - 1, 200);
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.width).toBe(210); // unchanged
    });

    it('setPageSize rejects dimensions above maximum', () => {
      useCanvasStore.getState().setPageSize(0, PAGE_DIMENSION_MAX + 1, 200);
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.width).toBe(210); // unchanged
    });
  });

  describe('Element Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('addElement adds an element to the active page', () => {
      const el = createTestElement();
      useCanvasStore.getState().addElement(el);

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].id).toBe(el.id);
    });

    it('updateElement modifies element properties', () => {
      const el = createTestElement();
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().updateElement(el.id, { x: 200, y: 300 });

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].x).toBe(200);
      expect(page.elements[0].y).toBe(300);
    });

    it('removeElements removes specified elements', () => {
      const el1 = createTestElement({ id: 'el-1' });
      const el2 = createTestElement({ id: 'el-2' });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().removeElements(['el-1']);
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].id).toBe('el-2');
    });

    it('duplicateElements creates offset copies with new IDs and highest z-index', () => {
      const el = createTestElement({ id: 'el-1', x: 50, y: 50, zIndex: 5 });
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().duplicateElements(['el-1']);

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(2);

      const duplicate = page.elements[1];
      expect(duplicate.id).not.toBe('el-1');
      expect(duplicate.x).toBe(60); // +10 offset
      expect(duplicate.y).toBe(60); // +10 offset
      expect(duplicate.zIndex).toBe(6); // maxZ + 1
    });
  });

  describe('Selection Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('select sets selectedIds', () => {
      useCanvasStore.getState().select(['a', 'b']);
      expect(useCanvasStore.getState().selection.selectedIds).toEqual(['a', 'b']);
    });

    it('selectAll selects all elements on active page', () => {
      const el1 = createTestElement({ id: 'el-1' });
      const el2 = createTestElement({ id: 'el-2' });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().selectAll();
      expect(useCanvasStore.getState().selection.selectedIds).toEqual(['el-1', 'el-2']);
    });

    it('deselect clears selection', () => {
      useCanvasStore.getState().select(['a']);
      useCanvasStore.getState().deselect();
      expect(useCanvasStore.getState().selection.selectedIds).toEqual([]);
    });
  });

  describe('Transform Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('moveElements applies delta to element positions', () => {
      const el = createTestElement({ id: 'el-1', x: 100, y: 100 });
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().moveElements(['el-1'], 20, -10);

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].x).toBe(120);
      expect(page.elements[0].y).toBe(90);
    });

    it('resizeElement updates width and height with minimum of 1', () => {
      const el = createTestElement({ id: 'el-1' });
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().resizeElement('el-1', 200, 150);

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].width).toBe(200);
      expect(page.elements[0].height).toBe(150);
    });

    it('resizeElement clamps to minimum of 1', () => {
      const el = createTestElement({ id: 'el-1' });
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().resizeElement('el-1', -5, 0);

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].width).toBe(1);
      expect(page.elements[0].height).toBe(1);
    });

    it('rotateElement normalizes angle to 0-359', () => {
      const el = createTestElement({ id: 'el-1' });
      useCanvasStore.getState().addElement(el);

      useCanvasStore.getState().rotateElement('el-1', 370);
      expect(useCanvasStore.getState().document!.pages[0].elements[0].rotation).toBe(10);

      useCanvasStore.getState().rotateElement('el-1', -30);
      expect(useCanvasStore.getState().document!.pages[0].elements[0].rotation).toBe(330);
    });
  });

  describe('Z-Order Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('bringToFront assigns highest z-index + 1', () => {
      const el1 = createTestElement({ id: 'el-1', zIndex: 1 });
      const el2 = createTestElement({ id: 'el-2', zIndex: 5 });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().bringToFront('el-1');
      const page = useCanvasStore.getState().document!.pages[0];
      const el = page.elements.find((e) => e.id === 'el-1')!;
      expect(el.zIndex).toBe(6);
    });

    it('sendToBack assigns lowest z-index - 1', () => {
      const el1 = createTestElement({ id: 'el-1', zIndex: 3 });
      const el2 = createTestElement({ id: 'el-2', zIndex: 1 });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().sendToBack('el-1');
      const page = useCanvasStore.getState().document!.pages[0];
      const el = page.elements.find((e) => e.id === 'el-1')!;
      expect(el.zIndex).toBe(0);
    });

    it('moveLayerUp swaps z-index with element above', () => {
      const el1 = createTestElement({ id: 'el-1', zIndex: 1 });
      const el2 = createTestElement({ id: 'el-2', zIndex: 3 });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().moveLayerUp('el-1');
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements.find((e) => e.id === 'el-1')!.zIndex).toBe(3);
      expect(page.elements.find((e) => e.id === 'el-2')!.zIndex).toBe(1);
    });

    it('moveLayerDown swaps z-index with element below', () => {
      const el1 = createTestElement({ id: 'el-1', zIndex: 1 });
      const el2 = createTestElement({ id: 'el-2', zIndex: 3 });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().moveLayerDown('el-2');
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements.find((e) => e.id === 'el-1')!.zIndex).toBe(3);
      expect(page.elements.find((e) => e.id === 'el-2')!.zIndex).toBe(1);
    });
  });

  describe('Grouping Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('groupElements creates a group from multiple elements', () => {
      const el1 = createTestElement({ id: 'el-1', x: 10, y: 10, width: 50, height: 50 });
      const el2 = createTestElement({ id: 'el-2', x: 80, y: 80, width: 50, height: 50 });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().groupElements(['el-1', 'el-2']);
      const page = useCanvasStore.getState().document!.pages[0];

      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('group');
      expect((page.elements[0] as unknown as { children: unknown[] }).children).toHaveLength(2);
    });

    it('groupElements requires at least 2 elements', () => {
      const el1 = createTestElement({ id: 'el-1' });
      useCanvasStore.getState().addElement(el1);

      useCanvasStore.getState().groupElements(['el-1']);
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(1);
      expect(page.elements[0].type).toBe('shape'); // not grouped
    });

    it('ungroupElement restores children with absolute positions', () => {
      const el1 = createTestElement({ id: 'el-1', x: 10, y: 10, width: 50, height: 50 });
      const el2 = createTestElement({ id: 'el-2', x: 80, y: 80, width: 50, height: 50 });
      useCanvasStore.getState().addElement(el1);
      useCanvasStore.getState().addElement(el2);

      useCanvasStore.getState().groupElements(['el-1', 'el-2']);
      const groupId = useCanvasStore.getState().document!.pages[0].elements[0].id;

      useCanvasStore.getState().ungroupElement(groupId);
      const page = useCanvasStore.getState().document!.pages[0];

      expect(page.elements).toHaveLength(2);
      // Children should have absolute positions restored
      const positions = page.elements.map((e) => ({ x: e.x, y: e.y }));
      expect(positions).toContainEqual({ x: 10, y: 10 });
      expect(positions).toContainEqual({ x: 80, y: 80 });
    });
  });

  describe('Lock/Visibility Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
      useCanvasStore.getState().addElement(createTestElement({ id: 'el-1' }));
    });

    it('lockElement sets locked to true', () => {
      useCanvasStore.getState().lockElement('el-1');
      expect(useCanvasStore.getState().document!.pages[0].elements[0].locked).toBe(true);
    });

    it('unlockElement sets locked to false', () => {
      useCanvasStore.getState().lockElement('el-1');
      useCanvasStore.getState().unlockElement('el-1');
      expect(useCanvasStore.getState().document!.pages[0].elements[0].locked).toBe(false);
    });

    it('hideElement sets visible to false', () => {
      useCanvasStore.getState().hideElement('el-1');
      expect(useCanvasStore.getState().document!.pages[0].elements[0].visible).toBe(false);
    });

    it('showElement sets visible to true', () => {
      useCanvasStore.getState().hideElement('el-1');
      useCanvasStore.getState().showElement('el-1');
      expect(useCanvasStore.getState().document!.pages[0].elements[0].visible).toBe(true);
    });
  });

  describe('Viewport Actions', () => {
    it('setZoom clamps to valid range', () => {
      useCanvasStore.getState().setZoom(5.0);
      expect(useCanvasStore.getState().viewport.zoom).toBe(ZOOM_MAX);

      useCanvasStore.getState().setZoom(0.01);
      expect(useCanvasStore.getState().viewport.zoom).toBe(ZOOM_MIN);
    });

    it('setZoom quantizes to ZOOM_STEP', () => {
      useCanvasStore.getState().setZoom(1.53);
      const zoom = useCanvasStore.getState().viewport.zoom;
      // Should be rounded to nearest 0.05 → 1.55
      expect(zoom).toBe(1.55);
    });

    it('zoomBy increments zoom', () => {
      useCanvasStore.getState().setZoom(1.0);
      useCanvasStore.getState().zoomBy(0.1);
      expect(useCanvasStore.getState().viewport.zoom).toBeCloseTo(1.1, 10);
    });

    it('pan updates viewport offsets', () => {
      useCanvasStore.getState().pan(50, -30);
      expect(useCanvasStore.getState().viewport.panX).toBe(50);
      expect(useCanvasStore.getState().viewport.panY).toBe(-30);
    });

    it('pan does not affect element positions', () => {
      useCanvasStore.getState().createDocument();
      const el = createTestElement({ id: 'el-1', x: 100, y: 100 });
      useCanvasStore.getState().addElement(el);

      useCanvasStore.getState().pan(200, 200);
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements[0].x).toBe(100);
      expect(page.elements[0].y).toBe(100);
    });
  });

  describe('Clipboard Actions', () => {
    beforeEach(() => {
      useCanvasStore.getState().createDocument();
    });

    it('copy stores selected elements in clipboard', () => {
      const el = createTestElement({ id: 'el-1' });
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().select(['el-1']);
      useCanvasStore.getState().copy();

      expect(useCanvasStore.getState().clipboard).toHaveLength(1);
    });

    it('paste inserts clipboard elements with offset and new IDs', () => {
      const el = createTestElement({ id: 'el-1', x: 50, y: 50, zIndex: 3 });
      useCanvasStore.getState().addElement(el);
      useCanvasStore.getState().select(['el-1']);
      useCanvasStore.getState().copy();
      useCanvasStore.getState().paste();

      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(2);

      const pasted = page.elements[1];
      expect(pasted.id).not.toBe('el-1');
      expect(pasted.x).toBe(60); // +10 offset
      expect(pasted.y).toBe(60); // +10 offset
      expect(pasted.zIndex).toBe(4); // maxZ + 1
    });

    it('paste does nothing when clipboard is empty', () => {
      useCanvasStore.getState().paste();
      const page = useCanvasStore.getState().document!.pages[0];
      expect(page.elements).toHaveLength(0);
    });
  });

  describe('Tool Actions', () => {
    it('setActiveTool changes the active tool', () => {
      useCanvasStore.getState().setActiveTool('text');
      expect(useCanvasStore.getState().activeTool).toBe('text');

      useCanvasStore.getState().setActiveTool('rectangle');
      expect(useCanvasStore.getState().activeTool).toBe('rectangle');
    });
  });

  describe('Color Actions', () => {
    it('saveColor adds a color to savedColors', () => {
      useCanvasStore.getState().saveColor('#FF0000');
      expect(useCanvasStore.getState().savedColors).toContain('#FF0000');
    });

    it('saveColor moves existing color to front', () => {
      useCanvasStore.getState().saveColor('#FF0000');
      useCanvasStore.getState().saveColor('#00FF00');
      useCanvasStore.getState().saveColor('#FF0000');

      const colors = useCanvasStore.getState().savedColors;
      expect(colors[0]).toBe('#FF0000');
      expect(colors).toHaveLength(2);
    });

    it('saveColor evicts oldest when exceeding MAX_SAVED_COLORS', () => {
      for (let i = 0; i < MAX_SAVED_COLORS + 5; i++) {
        useCanvasStore.getState().saveColor(`#${i.toString(16).padStart(6, '0')}`);
      }

      expect(useCanvasStore.getState().savedColors).toHaveLength(MAX_SAVED_COLORS);
    });
  });
});
