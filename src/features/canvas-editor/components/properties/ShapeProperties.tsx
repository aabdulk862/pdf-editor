import React, { useCallback } from 'react';

import {
  POLYGON_SIDES_MAX,
  POLYGON_SIDES_MIN,
  STROKE_WIDTH_MAX,
  STROKE_WIDTH_MIN,
} from '../../constants';
import type { BorderStyle, ShapeElement } from '../../types';
import { ColorPicker } from './ColorPicker';

interface ShapePropertiesProps {
  element: ShapeElement;
  onChange: (updates: Partial<ShapeElement>) => void;
}

const BORDER_STYLES: { value: BorderStyle; label: string }[] = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

export const ShapeProperties: React.FC<ShapePropertiesProps> = ({ element, onChange }) => {
  const handleFillChange = useCallback(
    (fill: string) => {
      onChange({ fill });
    },
    [onChange],
  );

  const handleStrokeChange = useCallback(
    (stroke: string) => {
      onChange({ stroke });
    },
    [onChange],
  );

  const handleStrokeWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const width = Math.max(STROKE_WIDTH_MIN, Math.min(STROKE_WIDTH_MAX, Number(e.target.value)));
      onChange({ strokeWidth: width });
    },
    [onChange],
  );

  const handleBorderStyleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ borderStyle: e.target.value as BorderStyle });
    },
    [onChange],
  );

  const handlePolygonSidesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const sides = Math.max(
        POLYGON_SIDES_MIN,
        Math.min(POLYGON_SIDES_MAX, Math.round(Number(e.target.value))),
      );
      onChange({ polygonSides: sides });
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="Shape properties">
      <h3 className="text-xs font-semibold text-secondary-700 dark:text-secondary-200 uppercase tracking-wide">
        Shape
      </h3>

      {/* Fill Color */}
      <ColorPicker color={element.fill} onChange={handleFillChange} label="Fill" />

      {/* Stroke Color */}
      <ColorPicker color={element.stroke} onChange={handleStrokeChange} label="Stroke" />

      {/* Stroke Width */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs text-secondary-500 dark:text-secondary-400"
          htmlFor="stroke-width-input"
        >
          Stroke Width (px)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={STROKE_WIDTH_MIN}
            max={STROKE_WIDTH_MAX}
            step={1}
            value={element.strokeWidth}
            onChange={handleStrokeWidthChange}
            className="flex-1 h-2 rounded-full appearance-none bg-secondary-200 dark:bg-secondary-700 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
              focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Stroke width slider"
          />
          <input
            id="stroke-width-input"
            type="number"
            min={STROKE_WIDTH_MIN}
            max={STROKE_WIDTH_MAX}
            value={element.strokeWidth}
            onChange={handleStrokeWidthChange}
            className="w-14 min-h-[44px] px-2 text-xs text-center border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors"
            aria-label="Stroke width value"
          />
        </div>
      </div>

      {/* Border Style */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs text-secondary-500 dark:text-secondary-400"
          htmlFor="border-style-select"
        >
          Border Style
        </label>
        <select
          id="border-style-select"
          value={element.borderStyle}
          onChange={handleBorderStyleChange}
          className="min-h-[44px] px-3 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors cursor-pointer"
        >
          {BORDER_STYLES.map((style) => (
            <option key={style.value} value={style.value}>
              {style.label}
            </option>
          ))}
        </select>
      </div>

      {/* Polygon Sides (only for polygon type) */}
      {element.shapeType === 'polygon' && (
        <div className="flex flex-col gap-1">
          <label
            className="text-xs text-secondary-500 dark:text-secondary-400"
            htmlFor="polygon-sides-input"
          >
            Polygon Sides ({POLYGON_SIDES_MIN}-{POLYGON_SIDES_MAX})
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={POLYGON_SIDES_MIN}
              max={POLYGON_SIDES_MAX}
              step={1}
              value={element.polygonSides ?? POLYGON_SIDES_MIN}
              onChange={handlePolygonSidesChange}
              className="flex-1 h-2 rounded-full appearance-none bg-secondary-200 dark:bg-secondary-700 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Polygon sides slider"
            />
            <input
              id="polygon-sides-input"
              type="number"
              min={POLYGON_SIDES_MIN}
              max={POLYGON_SIDES_MAX}
              value={element.polygonSides ?? POLYGON_SIDES_MIN}
              onChange={handlePolygonSidesChange}
              className="w-14 min-h-[44px] px-2 text-xs text-center border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors"
              aria-label="Polygon sides value"
            />
          </div>
        </div>
      )}
    </div>
  );
};
