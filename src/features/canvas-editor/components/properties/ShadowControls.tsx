import React, { useCallback } from 'react';

import type { ShadowConfig } from '../../types';
import { ColorPicker } from './ColorPicker';

interface ShadowControlsProps {
  shadow?: ShadowConfig;
  onChange: (shadow: ShadowConfig) => void;
}

const DEFAULT_SHADOW: ShadowConfig = {
  offsetX: 0,
  offsetY: 4,
  blur: 8,
  color: '#00000040',
};

export const ShadowControls: React.FC<ShadowControlsProps> = ({ shadow, onChange }) => {
  const current = shadow ?? DEFAULT_SHADOW;

  const handleToggle = useCallback(() => {
    if (shadow) {
      // Reset to no shadow by setting all to 0
      onChange({ offsetX: 0, offsetY: 0, blur: 0, color: '#00000000' });
    } else {
      onChange(DEFAULT_SHADOW);
    }
  }, [shadow, onChange]);

  const handleChange = useCallback(
    (field: keyof ShadowConfig, value: number | string) => {
      onChange({ ...current, [field]: value });
    },
    [current, onChange],
  );

  const isEnabled = shadow && shadow.color !== '#00000000';

  return (
    <div className="flex flex-col gap-3" role="group" aria-label="Shadow controls">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-secondary-600 dark:text-secondary-300 uppercase tracking-wide">
          Shadow
        </label>
        <button
          type="button"
          onClick={handleToggle}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
            transition-colors duration-normal ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500
            ${isEnabled ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600' : 'bg-secondary-100 dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
          aria-label={isEnabled ? 'Disable shadow' : 'Enable shadow'}
          aria-pressed={!!isEnabled}
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
              d="M20 12H4M12 4v16"
            />
          </svg>
        </button>
      </div>

      {isEnabled && (
        <div className="flex flex-col gap-3">
          {/* Offset X */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500 dark:text-secondary-400 w-12 shrink-0">
              X Offset
            </label>
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={current.offsetX}
              onChange={(e) => handleChange('offsetX', Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none bg-secondary-200 dark:bg-secondary-700 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Shadow X offset (-50 to 50)"
            />
            <input
              type="number"
              min={-50}
              max={50}
              value={current.offsetX}
              onChange={(e) => handleChange('offsetX', Number(e.target.value))}
              className="w-14 min-h-[44px] px-2 text-xs text-center border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Shadow X offset value"
            />
          </div>

          {/* Offset Y */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500 dark:text-secondary-400 w-12 shrink-0">
              Y Offset
            </label>
            <input
              type="range"
              min={-50}
              max={50}
              step={1}
              value={current.offsetY}
              onChange={(e) => handleChange('offsetY', Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none bg-secondary-200 dark:bg-secondary-700 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Shadow Y offset (-50 to 50)"
            />
            <input
              type="number"
              min={-50}
              max={50}
              value={current.offsetY}
              onChange={(e) => handleChange('offsetY', Number(e.target.value))}
              className="w-14 min-h-[44px] px-2 text-xs text-center border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Shadow Y offset value"
            />
          </div>

          {/* Blur */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-secondary-500 dark:text-secondary-400 w-12 shrink-0">
              Blur
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={current.blur}
              onChange={(e) => handleChange('blur', Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none bg-secondary-200 dark:bg-secondary-700 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Shadow blur (0 to 100)"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={current.blur}
              onChange={(e) => handleChange('blur', Number(e.target.value))}
              className="w-14 min-h-[44px] px-2 text-xs text-center border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Shadow blur value"
            />
          </div>

          {/* Shadow Color */}
          <ColorPicker
            color={current.color}
            onChange={(c) => handleChange('color', c)}
            label="Shadow Color"
            showAlpha
          />
        </div>
      )}
    </div>
  );
};
