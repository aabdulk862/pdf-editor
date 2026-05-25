import React, { useCallback } from 'react';

import type { CropRect, ImageElement } from '../../types';

interface ImagePropertiesProps {
  element: ImageElement;
  onChange: (updates: Partial<ImageElement>) => void;
}

export const ImageProperties: React.FC<ImagePropertiesProps> = ({ element, onChange }) => {
  const handleAspectRatioToggle = useCallback(() => {
    onChange({ aspectRatioLocked: !element.aspectRatioLocked });
  }, [element.aspectRatioLocked, onChange]);

  const handleCropChange = useCallback(
    (field: keyof CropRect, value: number) => {
      const currentCrop = element.cropRect ?? { x: 0, y: 0, width: 1, height: 1 };
      const clamped = Math.max(0, Math.min(1, value));
      onChange({ cropRect: { ...currentCrop, [field]: clamped } });
    },
    [element.cropRect, onChange],
  );

  const handleResetCrop = useCallback(() => {
    onChange({ cropRect: undefined });
  }, [onChange]);

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="Image properties">
      <h3 className="text-xs font-semibold text-secondary-700 dark:text-secondary-200 uppercase tracking-wide">
        Image
      </h3>

      {/* Original Dimensions (read-only) */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary-500 dark:text-secondary-400">
          Original Dimensions
        </span>
        <div className="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-200">
          <span className="px-3 py-2 bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 rounded-md">
            {element.originalWidth} × {element.originalHeight} px
          </span>
        </div>
      </div>

      {/* Aspect Ratio Lock */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-secondary-500 dark:text-secondary-400">
          Lock Aspect Ratio
        </span>
        <button
          type="button"
          onClick={handleAspectRatioToggle}
          className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
            transition-colors duration-normal ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500
            ${element.aspectRatioLocked ? 'bg-primary-500 border-primary-500 text-white hover:bg-primary-600' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600'}`}
          aria-label={element.aspectRatioLocked ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          aria-pressed={element.aspectRatioLocked}
        >
          {element.aspectRatioLocked ? (
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          ) : (
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
                d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Crop Controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary-500 dark:text-secondary-400">Crop Region</span>
          {element.cropRect && (
            <button
              type="button"
              onClick={handleResetCrop}
              className="min-h-[44px] px-3 text-xs text-primary-600 dark:text-primary-400 rounded-md border border-transparent
                hover:bg-primary-50 dark:hover:bg-primary-900/20 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors duration-normal ease-in-out"
              aria-label="Reset crop"
            >
              Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              htmlFor="crop-x"
            >
              X
            </label>
            <input
              id="crop-x"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={element.cropRect?.x ?? 0}
              onChange={(e) => handleCropChange('x', Number(e.target.value))}
              className="min-h-[44px] px-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Crop X position (0-1)"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              htmlFor="crop-y"
            >
              Y
            </label>
            <input
              id="crop-y"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={element.cropRect?.y ?? 0}
              onChange={(e) => handleCropChange('y', Number(e.target.value))}
              className="min-h-[44px] px-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Crop Y position (0-1)"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              htmlFor="crop-width"
            >
              Width
            </label>
            <input
              id="crop-width"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={element.cropRect?.width ?? 1}
              onChange={(e) => handleCropChange('width', Number(e.target.value))}
              className="min-h-[44px] px-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Crop width (0-1)"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label
              className="text-[10px] text-secondary-400 dark:text-secondary-500"
              htmlFor="crop-height"
            >
              Height
            </label>
            <input
              id="crop-height"
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={element.cropRect?.height ?? 1}
              onChange={(e) => handleCropChange('height', Number(e.target.value))}
              className="min-h-[44px] px-2 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
                focus:outline-none focus:ring-2 focus:ring-primary-500 hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors duration-normal ease-in-out"
              aria-label="Crop height (0-1)"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
