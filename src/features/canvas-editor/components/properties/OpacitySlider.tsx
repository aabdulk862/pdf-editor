import React, { useCallback } from 'react';

interface OpacitySliderProps {
  value: number; // 0-100
  onChange: (value: number) => void;
}

export const OpacitySlider: React.FC<OpacitySliderProps> = ({ value, onChange }) => {
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value));
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const num = Math.max(0, Math.min(100, Math.round(Number(e.target.value))));
      onChange(num);
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Opacity control">
      <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Opacity</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={handleSliderChange}
          className="flex-1 h-2 rounded-full appearance-none bg-gray-200 cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:hover:bg-blue-600
            [&::-webkit-slider-thumb]:active:bg-blue-700
            focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Opacity slider (0-100%)"
        />
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={value}
            onChange={handleInputChange}
            className="w-14 min-h-[44px] px-2 text-sm text-center border border-gray-300 rounded-md
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              hover:border-gray-400 transition-colors"
            aria-label="Opacity value"
          />
          <span className="text-xs text-gray-500">%</span>
        </div>
      </div>
    </div>
  );
};
