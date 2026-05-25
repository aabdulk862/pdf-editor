import React, { useCallback } from 'react';

import { PAGE_DIMENSION_MAX, PAGE_DIMENSION_MIN } from '../../constants';
import { ColorPicker } from './ColorPicker';

interface PagePropertiesProps {
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  onPageSizeChange: (width: number, height: number) => void;
  onBackgroundColorChange: (color: string) => void;
  onGridToggle: (enabled: boolean) => void;
}

const PAGE_PRESETS: { label: string; width: number; height: number }[] = [
  { label: 'A4 Portrait', width: 210, height: 297 },
  { label: 'A4 Landscape', width: 297, height: 210 },
  { label: 'Letter Portrait', width: 216, height: 279 },
  { label: 'Letter Landscape', width: 279, height: 216 },
  { label: 'A3 Portrait', width: 297, height: 420 },
  { label: 'A5 Portrait', width: 148, height: 210 },
  { label: 'Square (200mm)', width: 200, height: 200 },
  { label: 'Presentation (16:9)', width: 338, height: 190 },
];

export const PageProperties: React.FC<PagePropertiesProps> = ({
  width,
  height,
  backgroundColor,
  gridEnabled,
  onPageSizeChange,
  onBackgroundColorChange,
  onGridToggle,
}) => {
  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const preset = PAGE_PRESETS.find((p) => p.label === e.target.value);
      if (preset) {
        onPageSizeChange(preset.width, preset.height);
      }
    },
    [onPageSizeChange],
  );

  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (val >= PAGE_DIMENSION_MIN && val <= PAGE_DIMENSION_MAX) {
        onPageSizeChange(val, height);
      }
    },
    [height, onPageSizeChange],
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (val >= PAGE_DIMENSION_MIN && val <= PAGE_DIMENSION_MAX) {
        onPageSizeChange(width, val);
      }
    },
    [width, onPageSizeChange],
  );

  const currentPreset = PAGE_PRESETS.find((p) => p.width === width && p.height === height);

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="Page properties">
      <h3 className="text-xs font-semibold text-secondary-700 dark:text-secondary-200 uppercase tracking-wide">
        Page Settings
      </h3>

      {/* Page Size Presets */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs text-secondary-500 dark:text-secondary-400"
          htmlFor="page-preset-select"
        >
          Page Size Preset
        </label>
        <select
          id="page-preset-select"
          value={currentPreset?.label ?? ''}
          onChange={handlePresetChange}
          className="min-h-[44px] px-3 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out cursor-pointer"
        >
          <option value="" disabled>
            Custom
          </option>
          {PAGE_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.label} ({preset.width}×{preset.height}mm)
            </option>
          ))}
        </select>
      </div>

      {/* Custom Dimensions */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary-500 dark:text-secondary-400">
          Custom Dimensions (mm)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              htmlFor="page-width-input"
            >
              Width
            </label>
            <input
              id="page-width-input"
              type="number"
              min={PAGE_DIMENSION_MIN}
              max={PAGE_DIMENSION_MAX}
              value={width}
              onChange={handleWidthChange}
              className="min-h-[44px] px-3 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Page width in millimeters"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              htmlFor="page-height-input"
            >
              Height
            </label>
            <input
              id="page-height-input"
              type="number"
              min={PAGE_DIMENSION_MIN}
              max={PAGE_DIMENSION_MAX}
              value={height}
              onChange={handleHeightChange}
              className="min-h-[44px] px-3 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Page height in millimeters"
            />
          </div>
        </div>
      </div>

      {/* Background Color */}
      <ColorPicker
        color={backgroundColor}
        onChange={onBackgroundColorChange}
        label="Background Color"
      />

      {/* Grid Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary-500 dark:text-secondary-400">Show Grid</span>
        <button
          type="button"
          onClick={() => onGridToggle(!gridEnabled)}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
            transition-colors duration-normal ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500
            ${gridEnabled ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600'}`}
          aria-label={gridEnabled ? 'Disable grid' : 'Enable grid'}
          aria-pressed={gridEnabled}
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
              strokeWidth={1.5}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM9 4v16M15 4v16M4 9h16M4 15h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
