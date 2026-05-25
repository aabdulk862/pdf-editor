import React, { useState, useRef, useCallback, useEffect } from 'react';

import { useCanvasStore } from '../store/canvas-store';
import type { CanvasTool } from '../types';

// === Tool Definitions ===

interface ToolDefinition {
  id: CanvasTool | 'zoom-in' | 'zoom-out' | 'fit-page';
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}

interface ToolGroup {
  id: string;
  tools: ToolDefinition[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'selection',
    tools: [
      {
        id: 'select',
        label: 'Select',
        shortcut: 'V',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 2l3 12 2.5-4.5L13 7z" />
          </svg>
        ),
      },
      {
        id: 'pan',
        label: 'Pan',
        shortcut: 'Space',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M8 2v4M8 10v4M2 8h4M10 8h4" />
            <circle cx="8" cy="8" r="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'shapes',
    tools: [
      {
        id: 'rectangle',
        label: 'Rectangle',
        shortcut: 'R',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="3" width="12" height="10" rx="1" />
          </svg>
        ),
      },
      {
        id: 'circle',
        label: 'Circle',
        shortcut: 'C',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="8" cy="8" r="6" />
          </svg>
        ),
      },
      {
        id: 'line',
        label: 'Line',
        shortcut: 'L',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="2" y1="14" x2="14" y2="2" />
          </svg>
        ),
      },
      {
        id: 'arrow',
        label: 'Arrow',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="2" y1="14" x2="14" y2="2" />
            <polyline points="8,2 14,2 14,8" />
          </svg>
        ),
      },
      {
        id: 'star',
        label: 'Star',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polygon points="8,1 10,6 15,6 11,9.5 12.5,14.5 8,11.5 3.5,14.5 5,9.5 1,6 6,6" />
          </svg>
        ),
      },
      {
        id: 'polygon',
        label: 'Polygon',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polygon points="8,1 14,5 12,12 4,12 2,5" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'content',
    tools: [
      {
        id: 'text',
        label: 'Text',
        shortcut: 'T',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 3h10M8 3v10M5 13h6" />
          </svg>
        ),
      },
      {
        id: 'image',
        label: 'Image',
        shortcut: 'I',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="2" y="3" width="12" height="10" rx="1" />
            <circle cx="5.5" cy="6" r="1.5" />
            <path d="M2 11l3-3 2 2 4-4 3 3" />
          </svg>
        ),
      },
    ],
  },
  {
    id: 'zoom',
    tools: [
      {
        id: 'zoom-in',
        label: 'Zoom In',
        shortcut: '+',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14" y2="14" />
            <line x1="5" y1="7" x2="9" y2="7" />
            <line x1="7" y1="5" x2="7" y2="9" />
          </svg>
        ),
      },
      {
        id: 'zoom-out',
        label: 'Zoom Out',
        shortcut: '-',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="5" />
            <line x1="11" y1="11" x2="14" y2="14" />
            <line x1="5" y1="7" x2="9" y2="7" />
          </svg>
        ),
      },
      {
        id: 'fit-page',
        label: 'Fit to Page',
        icon: (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="10" height="10" rx="1" />
            <path d="M3 6h10M6 3v10" />
          </svg>
        ),
      },
    ],
  },
];

// === Tooltip Component ===

interface TooltipProps {
  label: string;
  shortcut?: string;
  visible: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}

function Tooltip({ label, shortcut, visible, anchorRef }: TooltipProps) {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (visible && anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPosition({
        left: rect.left + rect.width / 2,
        top: rect.bottom + 6,
      });
    }
  }, [visible, anchorRef]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-[9999] pointer-events-none px-2 py-1 rounded bg-secondary-900 dark:bg-secondary-700 text-white text-xs whitespace-nowrap shadow-lg"
      style={{ left: position.left, top: position.top, transform: 'translateX(-50%)' }}
      role="tooltip"
    >
      {label}
      {shortcut && <span className="ml-1.5 text-secondary-400">({shortcut})</span>}
    </div>
  );
}

// === ToolButton Component ===

interface ToolButtonProps {
  tool: ToolDefinition;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ tool, isActive, onClick }: ToolButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setShowTooltip(true);
    }, 500);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setShowTooltip(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`
          flex items-center justify-center min-w-[44px] min-h-[44px] md:min-w-[36px] md:min-h-[36px] rounded-lg transition-colors duration-normal ease-in-out
          ${
            isActive
              ? 'bg-blue-500/20 text-blue-500'
              : 'text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-secondary-100'
          }
          active:bg-secondary-200 dark:active:bg-secondary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        `}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
        aria-label={tool.label}
        aria-pressed={isActive}
        title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
      >
        {tool.icon}
      </button>
      <Tooltip
        label={tool.label}
        shortcut={tool.shortcut}
        visible={showTooltip}
        anchorRef={buttonRef}
      />
    </>
  );
}

// === FloatingToolbar Component ===

export function FloatingToolbar() {
  const activeTool = useCanvasStore((state) => state.activeTool);
  const setActiveTool = useCanvasStore((state) => state.setActiveTool);
  const zoomBy = useCanvasStore((state) => state.zoomBy);
  const setZoom = useCanvasStore((state) => state.setZoom);

  const handleToolClick = useCallback(
    (toolId: string) => {
      // Handle zoom controls separately
      if (toolId === 'zoom-in') {
        zoomBy(0.1);
        return;
      }
      if (toolId === 'zoom-out') {
        zoomBy(-0.1);
        return;
      }
      if (toolId === 'fit-page') {
        setZoom(1.0);
        return;
      }
      // Set active tool for all other tools
      setActiveTool(toolId as CanvasTool);
    },
    [setActiveTool, zoomBy, setZoom],
  );

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 md:gap-1 px-1.5 md:px-2 py-1 md:py-1.5 bg-white/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-xl shadow-md border border-secondary-200/60 dark:border-secondary-700/60 max-w-[calc(100vw-2rem)] overflow-x-auto"
      role="toolbar"
      aria-label="Canvas tools"
    >
      {TOOL_GROUPS.map((group, groupIndex) => (
        <React.Fragment key={group.id}>
          {groupIndex > 0 && (
            <div
              className="w-px h-6 bg-secondary-300 dark:bg-secondary-600 mx-0.5 md:mx-1"
              aria-hidden="true"
            />
          )}
          <div className="flex items-center gap-0.5">
            {group.tools.map((tool) => (
              <ToolButton
                key={tool.id}
                tool={tool}
                isActive={activeTool === tool.id}
                onClick={() => handleToolClick(tool.id)}
              />
            ))}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
