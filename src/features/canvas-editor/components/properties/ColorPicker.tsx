import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ColorPickerProps {
  color: string; // hex color (6-char or 8-char)
  onChange: (color: string) => void;
  label?: string;
  showAlpha?: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) || 0;
  const g = parseInt(clean.slice(2, 4), 16) || 0;
  const b = parseInt(clean.slice(4, 6), 16) || 0;
  const a = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) : 255;
  return { r, g, b, a };
}

function rgbToHex(r: number, g: number, b: number, a?: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0');
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a !== undefined && a < 255) {
    return `${base}${toHex(a)}`;
  }
  return base;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

const PRESET_COLORS = [
  '#000000',
  '#FFFFFF',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FF8800',
  '#8800FF',
  '#008800',
  '#880000',
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label,
  showAlpha = false,
}) => {
  const [hexInput, setHexInput] = useState(color);
  const [isSpectrumOpen, setIsSpectrumOpen] = useState(false);
  const spectrumRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);
  const isDraggingSpectrum = useRef(false);
  const isDraggingHue = useRef(false);

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb]);

  // Keep hex input in sync when color changes externally
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setHexInput(value);
      const clean = value.replace('#', '');
      if (clean.length === 6 || clean.length === 8) {
        onChange(value.startsWith('#') ? value : `#${value}`);
      }
    },
    [onChange],
  );

  const handleHexBlur = useCallback(() => {
    setHexInput(color);
  }, [color]);

  const handleRgbChange = useCallback(
    (channel: 'r' | 'g' | 'b' | 'a', value: number) => {
      const newRgb = { ...rgb, [channel]: value };
      const newHex = showAlpha
        ? rgbToHex(newRgb.r, newRgb.g, newRgb.b, newRgb.a)
        : rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      onChange(newHex);
      setHexInput(newHex);
    },
    [rgb, onChange, showAlpha],
  );

  const handlePresetClick = useCallback(
    (preset: string) => {
      onChange(preset);
      setHexInput(preset);
    },
    [onChange],
  );

  // Visual spectrum interaction: saturation (x-axis) and lightness (y-axis)
  const handleSpectrumInteraction = useCallback(
    (clientX: number, clientY: number) => {
      if (!spectrumRef.current) return;
      const rect = spectrumRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

      // x = saturation (0 to 100), y = lightness (100 at top to 0 at bottom)
      const newS = x * 100;
      const newL = (1 - y) * 100;
      const newRgb = hslToRgb(hsl.h, newS, newL);
      const newHex = showAlpha
        ? rgbToHex(newRgb.r, newRgb.g, newRgb.b, rgb.a)
        : rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      onChange(newHex);
      setHexInput(newHex);
    },
    [hsl.h, rgb.a, onChange, showAlpha],
  );

  // Hue bar interaction
  const handleHueInteraction = useCallback(
    (clientX: number) => {
      if (!hueBarRef.current) return;
      const rect = hueBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newH = x * 360;
      const newRgb = hslToRgb(newH, hsl.s, hsl.l);
      const newHex = showAlpha
        ? rgbToHex(newRgb.r, newRgb.g, newRgb.b, rgb.a)
        : rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      onChange(newHex);
      setHexInput(newHex);
    },
    [hsl.s, hsl.l, rgb.a, onChange, showAlpha],
  );

  const handleSpectrumPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingSpectrum.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleSpectrumInteraction(e.clientX, e.clientY);
    },
    [handleSpectrumInteraction],
  );

  const handleSpectrumPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingSpectrum.current) return;
      handleSpectrumInteraction(e.clientX, e.clientY);
    },
    [handleSpectrumInteraction],
  );

  const handleSpectrumPointerUp = useCallback(() => {
    isDraggingSpectrum.current = false;
  }, []);

  const handleHuePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingHue.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleHueInteraction(e.clientX);
    },
    [handleHueInteraction],
  );

  const handleHuePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingHue.current) return;
      handleHueInteraction(e.clientX);
    },
    [handleHueInteraction],
  );

  const handleHuePointerUp = useCallback(() => {
    isDraggingHue.current = false;
  }, []);

  // Compute spectrum cursor position from current HSL
  const spectrumCursorX = hsl.s / 100;
  const spectrumCursorY = 1 - hsl.l / 100;
  const hueCursorX = hsl.h / 360;

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={label ?? 'Color picker'}>
      {label && (
        <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">{label}</label>
      )}

      {/* Visual spectrum toggle */}
      <button
        type="button"
        onClick={() => setIsSpectrumOpen(!isSpectrumOpen)}
        className="min-h-[44px] px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded-md
          hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors flex items-center justify-between"
        aria-expanded={isSpectrumOpen}
        aria-label="Toggle visual color spectrum"
      >
        <span>{isSpectrumOpen ? 'Hide Spectrum' : 'Show Spectrum'}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-150 motion-reduce:transition-none ${isSpectrumOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Visual spectrum area */}
      {isSpectrumOpen && (
        <div className="flex flex-col gap-2">
          {/* Saturation/Lightness gradient */}
          <div
            ref={spectrumRef}
            className="relative w-full h-36 rounded-md cursor-crosshair border border-gray-200 touch-none"
            style={{
              background: `
                linear-gradient(to bottom, transparent, #000),
                linear-gradient(to right, #fff, hsl(${hsl.h}, 100%, 50%))
              `,
            }}
            onPointerDown={handleSpectrumPointerDown}
            onPointerMove={handleSpectrumPointerMove}
            onPointerUp={handleSpectrumPointerUp}
            role="slider"
            aria-label="Color saturation and lightness"
            aria-valuetext={`Saturation ${Math.round(hsl.s)}%, Lightness ${Math.round(hsl.l)}%`}
          >
            {/* Cursor indicator */}
            <div
              className="absolute w-4 h-4 border-2 border-white rounded-full shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${spectrumCursorX * 100}%`,
                top: `${spectrumCursorY * 100}%`,
                backgroundColor: color,
              }}
            />
          </div>

          {/* Hue bar */}
          <div
            ref={hueBarRef}
            className="relative w-full h-4 rounded-full cursor-pointer border border-gray-200 touch-none"
            style={{
              background:
                'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
            onPointerDown={handleHuePointerDown}
            onPointerMove={handleHuePointerMove}
            onPointerUp={handleHuePointerUp}
            role="slider"
            aria-label="Hue"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsl.h)}
          >
            {/* Hue cursor */}
            <div
              className="absolute top-1/2 w-4 h-4 border-2 border-white rounded-full shadow-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${hueCursorX * 100}%`,
                backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Color swatch presets */}
      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((preset) => (
          <button
            key={preset}
            type="button"
            className="min-w-[44px] min-h-[44px] rounded-md border border-gray-200 transition-all motion-reduce:transition-none motion-reduce:transform-none
              hover:scale-110 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500
              active:scale-95"
            style={{ backgroundColor: preset }}
            onClick={() => handlePresetClick(preset)}
            aria-label={`Select color ${preset}`}
            title={preset}
          />
        ))}
      </div>

      {/* Current color preview + hex input */}
      <div className="flex items-center gap-2">
        <div
          className="w-11 h-11 rounded-md border border-gray-300 shrink-0"
          style={{ backgroundColor: color }}
          aria-label={`Current color: ${color}`}
        />
        <input
          type="text"
          value={hexInput}
          onChange={handleHexChange}
          onBlur={handleHexBlur}
          className="flex-1 min-h-[44px] px-3 text-sm font-mono border border-gray-300 rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            hover:border-gray-400 transition-colors"
          placeholder="#000000"
          aria-label="Hex color value"
          maxLength={9}
        />
      </div>

      {/* RGB sliders */}
      <div className="flex flex-col gap-2">
        <RgbSlider label="R" value={rgb.r} onChange={(v) => handleRgbChange('r', v)} />
        <RgbSlider label="G" value={rgb.g} onChange={(v) => handleRgbChange('g', v)} />
        <RgbSlider label="B" value={rgb.b} onChange={(v) => handleRgbChange('b', v)} />
        {showAlpha && (
          <RgbSlider label="A" value={rgb.a} onChange={(v) => handleRgbChange('a', v)} />
        )}
      </div>
    </div>
  );
};

interface RgbSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const RgbSlider: React.FC<RgbSliderProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 w-4">{label}</span>
      <input
        type="range"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-2 rounded-full appearance-none bg-gray-200 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:hover:bg-blue-600
          focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`${label} channel (0-255)`}
      />
      <input
        type="number"
        min={0}
        max={255}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(255, Number(e.target.value))))}
        className="w-14 min-h-[44px] px-2 text-xs text-center border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          hover:border-gray-400 transition-colors"
        aria-label={`${label} value`}
      />
    </div>
  );
};
