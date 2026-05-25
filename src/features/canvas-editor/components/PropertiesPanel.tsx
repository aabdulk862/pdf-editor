import React, { useCallback, useMemo, useRef, useState } from 'react';

import { useCanvasStore } from '../store/canvas-store';
import type {
  CanvasElement,
  ImageElement,
  ShapeElement,
  ShadowConfig,
  TextElement,
} from '../types';
import { ImageProperties } from './properties/ImageProperties';
import { OpacitySlider } from './properties/OpacitySlider';
import { PageProperties } from './properties/PageProperties';
import { ShadowControls } from './properties/ShadowControls';
import { ShapeProperties } from './properties/ShapeProperties';
import { TextProperties } from './properties/TextProperties';

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ isOpen, onClose }) => {
  const document = useCanvasStore((s) => s.document);
  const selection = useCanvasStore((s) => s.selection);
  const gridEnabled = useCanvasStore((s) => s.gridEnabled);
  const updateElement = useCanvasStore((s) => s.updateElement);
  const setPageSize = useCanvasStore((s) => s.setPageSize);

  // Drag handle state for mobile bottom sheet
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  // Get the active page
  const activePage = useMemo(() => {
    if (!document) return null;
    return document.pages[document.activePageIndex] ?? null;
  }, [document]);

  // Get selected elements
  const selectedElements = useMemo(() => {
    if (!activePage) return [];
    return activePage.elements.filter((el) => selection.selectedIds.includes(el.id));
  }, [activePage, selection.selectedIds]);

  // Determine which sub-panel to show
  const selectedElement = selectedElements.length === 1 ? selectedElements[0] : null;

  // Handlers for element updates
  const handleElementUpdate = useCallback(
    (updates: Partial<CanvasElement>) => {
      if (!selectedElement) return;
      updateElement(selectedElement.id, updates);
    },
    [selectedElement, updateElement],
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      if (!selectedElement) return;
      updateElement(selectedElement.id, { opacity });
    },
    [selectedElement, updateElement],
  );

  const handleShadowChange = useCallback(
    (shadow: ShadowConfig) => {
      if (!selectedElement) return;
      updateElement(selectedElement.id, { shadow });
    },
    [selectedElement, updateElement],
  );

  // Page property handlers
  const handlePageSizeChange = useCallback(
    (width: number, height: number) => {
      if (!document) return;
      setPageSize(document.activePageIndex, width, height);
    },
    [document, setPageSize],
  );

  const handleBackgroundColorChange = useCallback(
    (color: string) => {
      if (!document || !activePage) return;
      // Update page background via store — use setPageSize pattern but for bg color
      // Since the store doesn't have a dedicated action, we update via the page directly
      // For now, we use updateElement pattern — but page bg needs a store action
      // We'll use the store's set method through a workaround
      useCanvasStore.setState((state) => {
        if (!state.document) return state;
        const page = state.document.pages[state.document.activePageIndex];
        if (page) {
          page.backgroundColor = color;
          state.document.updatedAt = Date.now();
        }
        return state;
      });
    },
    [document, activePage],
  );

  const handleGridToggle = useCallback((enabled: boolean) => {
    useCanvasStore.setState((state) => {
      state.gridEnabled = enabled;
      return state;
    });
  }, []);

  // Mobile drag handle
  const handleDragStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  }, []);

  const handleDragMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    setDragOffset(Math.max(0, delta));
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragOffset > 100) {
      onClose();
    }
    setDragOffset(0);
    dragStartY.current = null;
  }, [dragOffset, onClose]);

  // Render the appropriate sub-panel content
  const renderContent = () => {
    if (!selectedElement) {
      // No selection — show page properties
      if (!activePage) return null;
      return (
        <PageProperties
          width={activePage.width}
          height={activePage.height}
          backgroundColor={activePage.backgroundColor}
          gridEnabled={gridEnabled}
          onPageSizeChange={handlePageSizeChange}
          onBackgroundColorChange={handleBackgroundColorChange}
          onGridToggle={handleGridToggle}
        />
      );
    }

    switch (selectedElement.type) {
      case 'text':
        return (
          <>
            <TextProperties
              element={selectedElement as TextElement}
              onChange={handleElementUpdate as (updates: Partial<TextElement>) => void}
            />
            <hr className="border-secondary-200 dark:border-secondary-700" />
            <OpacitySlider value={selectedElement.opacity} onChange={handleOpacityChange} />
            <hr className="border-secondary-200 dark:border-secondary-700" />
            <ShadowControls shadow={selectedElement.shadow} onChange={handleShadowChange} />
          </>
        );

      case 'shape':
        return (
          <>
            <ShapeProperties
              element={selectedElement as ShapeElement}
              onChange={handleElementUpdate as (updates: Partial<ShapeElement>) => void}
            />
            <hr className="border-secondary-200 dark:border-secondary-700" />
            <OpacitySlider value={selectedElement.opacity} onChange={handleOpacityChange} />
            <hr className="border-secondary-200 dark:border-secondary-700" />
            <ShadowControls shadow={selectedElement.shadow} onChange={handleShadowChange} />
          </>
        );

      case 'image':
        return (
          <>
            <ImageProperties
              element={selectedElement as ImageElement}
              onChange={handleElementUpdate as (updates: Partial<ImageElement>) => void}
            />
            <hr className="border-secondary-200 dark:border-secondary-700" />
            <OpacitySlider value={selectedElement.opacity} onChange={handleOpacityChange} />
            <hr className="border-secondary-200 dark:border-secondary-700" />
            <ShadowControls shadow={selectedElement.shadow} onChange={handleShadowChange} />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Desktop panel: fixed right side, 320px wide */}
      <aside
        className={`hidden md:flex fixed right-0 top-0 h-full w-80 bg-white dark:bg-secondary-900 border-l border-secondary-200 dark:border-secondary-700
          shadow-lg flex-col z-40 transition-transform duration-moderate ease-out motion-reduce:transition-none
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Properties panel"
        role="complementary"
        data-testid="properties-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-sm font-semibold text-secondary-800 dark:text-secondary-100">
            {selectedElement
              ? `${selectedElement.type.charAt(0).toUpperCase()}${selectedElement.type.slice(1)} Properties`
              : 'Page Settings'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md
              text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600
              focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-normal ease-in-out"
            aria-label="Close properties panel"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {renderContent()}
        </div>
      </aside>

      {/* Mobile bottom sheet: viewports < 768px */}
      {isOpen && (
        <aside
          className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white dark:bg-secondary-900 border-t border-secondary-200 dark:border-secondary-700
            shadow-[0_-4px_20px_rgba(0,0,0,0.1)] rounded-t-2xl transition-transform duration-moderate ease-out motion-reduce:transition-none"
          style={{
            maxHeight: '50vh',
            transform: `translateY(${dragOffset}px)`,
          }}
          aria-label="Properties panel"
          role="complementary"
        >
          {/* Drag handle */}
          <div
            className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing"
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            role="separator"
            aria-label="Drag to dismiss"
          >
            <div className="w-10 h-1 bg-secondary-300 dark:bg-secondary-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-2">
            <h2 className="text-sm font-semibold text-secondary-800 dark:text-secondary-100">
              {selectedElement
                ? `${selectedElement.type.charAt(0).toUpperCase()}${selectedElement.type.slice(1)} Properties`
                : 'Page Settings'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md
                text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-normal ease-in-out"
              aria-label="Close properties panel"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div
            className="overflow-y-auto px-4 pb-6 flex flex-col gap-4"
            style={{ maxHeight: 'calc(50vh - 80px)' }}
          >
            {renderContent()}
          </div>
        </aside>
      )}
    </>
  );
};
