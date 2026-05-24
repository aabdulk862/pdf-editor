import { useCallback, useEffect, useRef } from 'react';

import type { Alignment, LetterheadTemplate, LetterheadTextField } from '../types';

export interface LetterheadPreviewProps {
  template: LetterheadTemplate;
}

/** A4 proportions: 210mm x 297mm, scaled to fit a reasonable preview size */
const CANVAS_WIDTH = 420;
const CANVAS_HEIGHT = 594;

/** Header area height in canvas pixels (maps to ~100px at page scale) */
const HEADER_HEIGHT = 200;

/** Margins for content within the header */
const MARGIN_X = 30;
const MARGIN_TOP = 20;

/** Spacing between text lines */
const LINE_SPACING = 4;

/**
 * LetterheadPreview renders a live canvas-based preview of a letterhead template.
 * Updates within 200ms of field changes using debounced rendering.
 * Displays a white background with shadow-lg styling matching PreviewPanel.
 *
 * Requirements: 12.2, 13.7
 */
export function LetterheadPreview({ template }: LetterheadPreviewProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const logoDataUrlRef = useRef<string | null>(null);

  /**
   * Convert an ArrayBuffer to a base64 data URL for canvas image rendering.
   */
  const arrayBufferToDataUrl = useCallback((data: ArrayBuffer, mimeType: string): string => {
    const bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return `data:${mimeType};base64,${btoa(binary)}`;
  }, []);

  /**
   * Calculate the x position for a given alignment within the canvas.
   */
  const getAlignmentX = useCallback((alignment: Alignment): number => {
    switch (alignment) {
      case 'left':
        return MARGIN_X;
      case 'center':
        return CANVAS_WIDTH / 2;
      case 'right':
        return CANVAS_WIDTH - MARGIN_X;
    }
  }, []);

  /**
   * Map alignment to canvas textAlign property.
   */
  const getCanvasTextAlign = useCallback((alignment: Alignment): CanvasTextAlign => {
    return alignment;
  }, []);

  /**
   * Calculate a scaled font size for the canvas preview.
   * The template font sizes are in pt (8-24), we scale them for the canvas.
   */
  const getScaledFontSize = useCallback((fontSize: number): number => {
    // Scale factor: canvas is 420px wide representing ~210mm (A4 width)
    // At 72 DPI, 1pt = 1px, but our canvas is roughly 2x the "real" size
    return Math.round(fontSize * 2);
  }, []);

  /**
   * Draw a text field on the canvas at the given y position.
   * Returns the new y position after drawing.
   */
  const drawTextField = useCallback(
    (ctx: CanvasRenderingContext2D, field: LetterheadTextField, y: number): number => {
      if (!field.content.trim()) return y;

      const scaledSize = getScaledFontSize(field.fontSize);
      ctx.font = `${scaledSize}px ${field.fontFamily || 'sans-serif'}`;
      ctx.fillStyle = field.color || '#000000';
      ctx.textAlign = getCanvasTextAlign(field.alignment);

      const x = getAlignmentX(field.alignment);
      ctx.fillText(field.content, x, y);

      return y + scaledSize + LINE_SPACING;
    },
    [getScaledFontSize, getCanvasTextAlign, getAlignmentX],
  );

  /**
   * Render the full letterhead preview onto the canvas.
   */
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw a subtle header area separator line
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, HEADER_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH - MARGIN_X, HEADER_HEIGHT);
    ctx.stroke();

    let currentY = MARGIN_TOP;

    // Draw logo if present
    if (template.logo && logoImageRef.current && logoImageRef.current.complete) {
      const img = logoImageRef.current;
      const logoWidth = Math.min(template.logo.width, CANVAS_WIDTH - MARGIN_X * 2);
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const logoHeight = logoWidth * aspectRatio;

      let logoX: number;
      switch (template.logo.alignment) {
        case 'left':
          logoX = MARGIN_X;
          break;
        case 'center':
          logoX = (CANVAS_WIDTH - logoWidth) / 2;
          break;
        case 'right':
          logoX = CANVAS_WIDTH - MARGIN_X - logoWidth;
          break;
      }

      ctx.drawImage(img, logoX, currentY, logoWidth, logoHeight);
      currentY += logoHeight + 10;
    } else if (template.logo) {
      // Logo data exists but image not loaded yet, reserve space
      currentY += 50;
    }

    // Draw company name
    currentY = drawTextField(ctx, template.companyName, currentY + 8);

    // Draw address lines
    for (const addressLine of template.addressLines) {
      currentY = drawTextField(ctx, addressLine, currentY);
    }

    // Add spacing before contact info
    currentY += 4;

    // Draw contact info (phone, email, website)
    if (template.phone.content.trim()) {
      currentY = drawTextField(ctx, template.phone, currentY);
    }
    if (template.email.content.trim()) {
      currentY = drawTextField(ctx, template.email, currentY);
    }
    if (template.website.content.trim()) {
      currentY = drawTextField(ctx, template.website, currentY);
    }

    // Draw tagline if present
    if (template.tagline && template.tagline.content.trim()) {
      currentY += 6;
      drawTextField(ctx, template.tagline, currentY);
    }

    // Draw faint page body lines to indicate document area
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 1;
    for (let lineY = HEADER_HEIGHT + 40; lineY < CANVAS_HEIGHT - 40; lineY += 24) {
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, lineY);
      ctx.lineTo(CANVAS_WIDTH - MARGIN_X, lineY);
      ctx.stroke();
    }
  }, [template, drawTextField]);

  // Load logo image when template.logo changes
  useEffect(() => {
    if (!template.logo) {
      logoImageRef.current = null;
      logoDataUrlRef.current = null;
      return;
    }

    const dataUrl = arrayBufferToDataUrl(template.logo.data, template.logo.mimeType);

    // Skip reload if the data URL hasn't changed
    if (dataUrl === logoDataUrlRef.current && logoImageRef.current) {
      return;
    }

    logoDataUrlRef.current = dataUrl;
    const img = new Image();
    img.onload = () => {
      logoImageRef.current = img;
      // Trigger a re-render after logo loads
      renderPreview();
    };
    img.onerror = () => {
      logoImageRef.current = null;
    };
    img.src = dataUrl;
  }, [template.logo, arrayBufferToDataUrl, renderPreview]);

  // Debounced re-render on template changes (200ms)
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderPreview();
    }, 200);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [renderPreview]);

  return (
    <div className="flex items-center justify-center p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="bg-white shadow-lg rounded-sm max-w-full h-auto"
        style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
        role="img"
        aria-label="Letterhead preview"
      />
    </div>
  );
}
