import React, { useCallback } from 'react';

import { FONT_SIZE_MAX, FONT_SIZE_MIN } from '../../constants';
import type { TextAlignment, TextElement } from '../../types';
import { ColorPicker } from './ColorPicker';

interface TextPropertiesProps {
  element: TextElement;
  onChange: (updates: Partial<TextElement>) => void;
}

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
  'Comic Sans MS',
  'Inter',
];

const ALIGNMENT_OPTIONS: { value: TextAlignment; label: string; icon: React.ReactNode }[] = [
  {
    value: 'left',
    label: 'Align left',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2 4h16v1H2V4zm0 4h10v1H2V8zm0 4h14v1H2v-1zm0 4h8v1H2v-1z" />
      </svg>
    ),
  },
  {
    value: 'center',
    label: 'Align center',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2 4h16v1H2V4zm3 4h10v1H5V8zm1 4h8v1H6v-1zm2 4h4v1H8v-1z" />
      </svg>
    ),
  },
  {
    value: 'right',
    label: 'Align right',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2 4h16v1H2V4zm6 4h10v1H8V8zm4 4h6v1h-6v-1zm-2 4h8v1h-8v-1z" />
      </svg>
    ),
  },
  {
    value: 'justify',
    label: 'Justify',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M2 4h16v1H2V4zm0 4h16v1H2V8zm0 4h16v1H2v-1zm0 4h16v1H2v-1z" />
      </svg>
    ),
  },
];

export const TextProperties: React.FC<TextPropertiesProps> = ({ element, onChange }) => {
  const handleFontFamilyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange({ fontFamily: e.target.value });
    },
    [onChange],
  );

  const handleFontSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const size = Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, Number(e.target.value)));
      onChange({ fontSize: size });
    },
    [onChange],
  );

  const handleAlignmentChange = useCallback(
    (alignment: TextAlignment) => {
      onChange({ alignment });
    },
    [onChange],
  );

  const handleColorChange = useCallback(
    (fontColor: string) => {
      onChange({ fontColor });
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-4" role="group" aria-label="Text properties">
      <h3 className="text-xs font-semibold text-secondary-700 dark:text-secondary-200 uppercase tracking-wide">
        Text
      </h3>

      {/* Font Family */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs text-secondary-500 dark:text-secondary-400"
          htmlFor="font-family-select"
        >
          Font Family
        </label>
        <select
          id="font-family-select"
          value={element.fontFamily}
          onChange={handleFontFamilyChange}
          className="min-h-[44px] px-3 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors cursor-pointer"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font} value={font} style={{ fontFamily: font }}>
              {font}
            </option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="flex flex-col gap-1">
        <label
          className="text-xs text-secondary-500 dark:text-secondary-400"
          htmlFor="font-size-input"
        >
          Font Size (pt)
        </label>
        <input
          id="font-size-input"
          type="number"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          value={element.fontSize}
          onChange={handleFontSizeChange}
          className="min-h-[44px] px-3 text-sm border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            hover:border-secondary-400 dark:hover:border-secondary-500 transition-colors"
        />
      </div>

      {/* Bold / Italic / Underline */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary-500 dark:text-secondary-400">Style</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ bold: !element.bold })}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
              font-bold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              ${element.bold ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600'}`}
            aria-label="Bold"
            aria-pressed={element.bold}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => onChange({ italic: !element.italic })}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
              italic text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              ${element.italic ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600'}`}
            aria-label="Italic"
            aria-pressed={element.italic}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => onChange({ underline: !element.underline })}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
              underline text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              ${element.underline ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600'}`}
            aria-label="Underline"
            aria-pressed={element.underline}
          >
            U
          </button>
        </div>
      </div>

      {/* Alignment */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary-500 dark:text-secondary-400">Alignment</span>
        <div className="flex gap-1">
          {ALIGNMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleAlignmentChange(opt.value)}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md border
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
                ${element.alignment === opt.value ? 'bg-blue-500 border-blue-500 text-white hover:bg-blue-600' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 active:bg-secondary-200 dark:active:bg-secondary-600'}`}
              aria-label={opt.label}
              aria-pressed={element.alignment === opt.value}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Font Color */}
      <ColorPicker color={element.fontColor} onChange={handleColorChange} label="Font Color" />
    </div>
  );
};
