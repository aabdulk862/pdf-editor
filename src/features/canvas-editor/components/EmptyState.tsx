import React, { useCallback } from 'react';

import { DEFAULT_TEXT_WIDTH } from '../constants';
import { useCanvasStore } from '../store/canvas-store';
import type { CanvasTool, ShapeElement, TextElement } from '../types';

interface EmptyStateProps {
  /** Callback to open the template picker modal */
  onOpenTemplatePicker?: () => void;
}

interface QuickAction {
  label: string;
  tool?: CanvasTool;
  icon: React.ReactNode;
  isTemplate?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Add Text',
    tool: 'text',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 4h12M10 4v12M7 16h6" />
      </svg>
    ),
  },
  {
    label: 'Add Image',
    tool: 'image',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <circle cx="7" cy="8" r="1.5" />
        <path d="M3 14l4-4 2.5 2.5 4.5-4.5L17 12" />
      </svg>
    ),
  },
  {
    label: 'Add Shape',
    tool: 'rectangle',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="5" width="14" height="10" rx="1.5" />
      </svg>
    ),
  },
  {
    label: 'Use Template',
    isTemplate: true,
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="11" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="11" width="6" height="6" rx="1" />
        <rect x="11" y="11" width="6" height="6" rx="1" />
      </svg>
    ),
  },
];

/**
 * EmptyState is displayed when the current page has no elements.
 * It provides a centered prompt with quick-action buttons to help
 * users start designing.
 */
export function EmptyState({ onOpenTemplatePicker }: EmptyStateProps) {
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const addElement = useCanvasStore((state) => state.addElement);
  const select = useCanvasStore((state) => state.select);
  const document = useCanvasStore((state) => state.document);

  const handleAction = useCallback(
    (action: QuickAction) => {
      if (action.isTemplate) {
        onOpenTemplatePicker?.();
        return;
      }

      if (!document) return;
      const page = document.pages[document.activePageIndex];
      if (!page) return;

      // Place elements at the center of the page
      const centerX = page.width / 2;
      const centerY = page.height / 2;

      if (action.tool === 'text') {
        const textElement: TextElement = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          type: 'text',
          x: centerX - DEFAULT_TEXT_WIDTH / 2,
          y: centerY - 15,
          width: DEFAULT_TEXT_WIDTH,
          height: 30,
          rotation: 0,
          opacity: 100,
          zIndex: page.elements.length,
          locked: false,
          visible: true,
          content: 'Type here',
          fontFamily: 'Inter',
          fontSize: 16,
          fontColor: '#000000',
          bold: false,
          italic: false,
          underline: false,
          alignment: 'left',
        };
        addElement(textElement);
        select([textElement.id]);
        setActiveTool('select');
      } else if (action.tool === 'rectangle') {
        const shapeElement: ShapeElement = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
          type: 'shape',
          shapeType: 'rectangle',
          x: centerX - 50,
          y: centerY - 35,
          width: 100,
          height: 70,
          rotation: 0,
          opacity: 100,
          zIndex: page.elements.length,
          locked: false,
          visible: true,
          fill: '#4A90D9',
          stroke: '#2C5F8A',
          strokeWidth: 2,
          borderStyle: 'solid',
        };
        addElement(shapeElement);
        select([shapeElement.id]);
        setActiveTool('select');
      } else if (action.tool === 'image') {
        // Set tool to image — the canvas click handler will open the file picker
        setActiveTool('image');
      } else if (action.tool) {
        setActiveTool(action.tool);
      }
    },
    [setActiveTool, addElement, select, document, onOpenTemplatePicker],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="flex flex-col items-center gap-6 pointer-events-auto">
        {/* Large canvas icon */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-secondary-100 dark:bg-secondary-800 text-secondary-400 dark:text-secondary-500">
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="6" width="32" height="28" rx="3" />
            <path d="M4 14h32" />
            <circle cx="8" cy="10" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="16" cy="10" r="1.5" fill="currentColor" stroke="none" />
            <path d="M12 22l4-4 3 3 5-5 4 4" />
            <circle cx="13" cy="26" r="2.5" />
          </svg>
        </div>

        {/* Heading and subtitle */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-secondary-800 dark:text-secondary-100">
            Start designing
          </h2>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Add elements to your canvas to get started
          </p>
        </div>

        {/* Quick-action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className="flex items-center gap-2 px-4 min-h-[44px] border border-secondary-200 dark:border-secondary-600 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-200 bg-white dark:bg-secondary-800 hover:bg-secondary-50 dark:hover:bg-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-500 hover:text-secondary-900 dark:hover:text-secondary-100 active:bg-secondary-100 dark:active:bg-secondary-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              onClick={() => handleAction(action)}
              aria-label={action.label}
            >
              <span className="text-secondary-500 dark:text-secondary-400">{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
