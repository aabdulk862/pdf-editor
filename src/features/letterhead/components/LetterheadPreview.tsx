import { useCallback, useEffect, useRef } from 'react';

import type { Alignment, LetterheadTemplate, LetterheadTextField } from '../types';
import { getEffectiveLetterBody } from '../utils/defaults';

export interface LetterheadPreviewProps {
  template: LetterheadTemplate;
}

/**
 * US Letter proportions (8.5 × 11 inches) scaled for a crisp preview.
 * We use a logical canvas size and scale by devicePixelRatio for HiDPI.
 */
const CANVAS_WIDTH = 408;
const CANVAS_HEIGHT = 528; // US Letter ratio (8.5:11 = 0.773)

/** Page margins */
const MARGIN_X = 32;
const MARGIN_TOP = 20;

/** Zone boundaries (percentage of canvas height) */
const HEADER_MAX_HEIGHT = 0.13; // Header uses max 13% of page
const FOOTER_Y = 0.94; // Footer at 94% of page height

/**
 * LetterheadPreview renders a live canvas-based preview of a letterhead template.
 * Produces a realistic US Letter page with compact header, contact bar, generous body,
 * HiDPI rendering, and professional typography matching organizational letterhead style.
 *
 * Layout: [Header with logo center + text sides] → [Contact bar] → [Separator] → [Body] → [Footer]
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
   * Scale font size from template points to canvas pixels.
   * Template sizes are 8-24pt; we scale proportionally for the preview.
   */
  const getScaledFontSize = useCallback((fontSize: number): number => {
    return Math.round(fontSize * 1.5);
  }, []);

  /**
   * Draw a single text field on the canvas at the given y position.
   * Returns the new y position after drawing.
   */
  const drawTextField = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      field: LetterheadTextField,
      y: number,
      options?: { bold?: boolean; italic?: boolean; letterSpacing?: number },
    ): number => {
      if (!field.content.trim()) return y;

      const scaledSize = getScaledFontSize(field.fontSize);
      const weight = options?.bold ? 'bold ' : '';
      const style = options?.italic ? 'italic ' : '';
      ctx.font = `${style}${weight}${scaledSize}px ${field.fontFamily || 'Helvetica'}`;
      ctx.fillStyle = field.color || '#000000';
      ctx.textAlign = getCanvasTextAlign(field.alignment);

      const x = getAlignmentX(field.alignment);

      // Letter-spacing simulation for ALL CAPS text
      if (options?.letterSpacing && options.letterSpacing > 0) {
        const chars = field.content.split('');
        let currentX = x;
        if (field.alignment === 'center') {
          const totalWidth = chars.reduce(
            (w, char) => {
              return w + ctx.measureText(char).width + (options.letterSpacing ?? 0);
            },
            -(options.letterSpacing ?? 0),
          );
          currentX = x - totalWidth / 2;
        }
        ctx.textAlign = 'left';
        for (const char of chars) {
          ctx.fillText(char, currentX, y);
          currentX += ctx.measureText(char).width + (options.letterSpacing ?? 0);
        }
        ctx.textAlign = getCanvasTextAlign(field.alignment);
      } else {
        ctx.fillText(field.content, x, y);
      }

      return y + scaledSize + 3;
    },
    [getScaledFontSize, getCanvasTextAlign, getAlignmentX],
  );

  /**
   * Draw a thin horizontal separator line across the page.
   */
  const drawSeparatorLine = useCallback(
    (ctx: CanvasRenderingContext2D, y: number, color: string, width?: number): void => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width ?? 0.75;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, y);
      ctx.lineTo(CANVAS_WIDTH - MARGIN_X, y);
      ctx.stroke();
    },
    [],
  );

  /**
   * Render footer with minimal address info at the very bottom of the page.
   */
  const drawFooter = useCallback(
    (ctx: CanvasRenderingContext2D): void => {
      const footerY = CANVAS_HEIGHT * FOOTER_Y;

      if (template.addressLines.length === 0) return;

      const addressParts = template.addressLines.map((line) => line.content.trim()).filter(Boolean);
      if (addressParts.length === 0) return;

      const alignment = template.addressLines[0].alignment;
      const color = template.addressLines[0].color || '#6b7280';
      const fontSize = getScaledFontSize(template.addressLines[0].fontSize || 9);

      // Thin footer separator
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(MARGIN_X, footerY);
      ctx.lineTo(CANVAS_WIDTH - MARGIN_X, footerY);
      ctx.stroke();

      // Address line
      ctx.font = `${fontSize}px Helvetica`;
      ctx.fillStyle = color;
      ctx.textAlign = getCanvasTextAlign(alignment);

      const x = getAlignmentX(alignment);
      ctx.fillText(addressParts.join(', '), x, footerY + 14);
    },
    [template, getScaledFontSize, getCanvasTextAlign, getAlignmentX],
  );

  /**
   * Render the full letterhead preview onto the canvas.
   * Layout: compact header (≤13%) → contact bar → separator → body (70%+) → footer (5%)
   */
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    // Set actual canvas size for HiDPI
    canvas.width = CANVAS_WIDTH * dpr;
    canvas.height = CANVAS_HEIGHT * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale context for HiDPI
    ctx.scale(dpr, dpr);

    // White page background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Determine the brand/accent color from template
    const accentColor = template.separatorColor || '#1a2332';
    const layout = template.layout ?? 'centered';

    let currentY = MARGIN_TOP;

    // --- HEADER ZONE (compact, max 13% of page) ---

    const hasLogo = template.logo && logoImageRef.current && logoImageRef.current.complete;

    if (layout === 'logo-center' && hasLogo) {
      // THREE-COLUMN LAYOUT: [Left Text] [LOGO CENTER] [Right Text]
      const img = logoImageRef.current!;
      const maxLogoHeight = 56;
      const logoWidth = Math.min(template.logo!.width * 0.6, 80);
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const logoHeight = Math.min(logoWidth * aspectRatio, maxLogoHeight);
      const actualLogoWidth = logoHeight / aspectRatio;

      // Draw logo centered
      const logoX = (CANVAS_WIDTH - actualLogoWidth) / 2;
      ctx.drawImage(img, logoX, currentY, actualLogoWidth, logoHeight);

      // Calculate safe text zones
      const leftZoneEnd = logoX - 8;
      const rightZoneStart = logoX + actualLogoWidth + 8;

      // Draw right text (headerRightText or company name)
      const rightText = template.headerRightText || template.companyName.content;
      const nameSize = getScaledFontSize(template.companyName.fontSize);
      ctx.font = `bold ${nameSize}px ${template.companyName.fontFamily || 'Helvetica'}`;
      ctx.fillStyle = template.companyName.color || '#000000';
      ctx.textAlign = 'left';
      const nameCenterY = currentY + logoHeight / 2 + nameSize / 3;
      ctx.fillText(rightText, rightZoneStart, nameCenterY);

      // Draw left text (headerLeftText or tagline)
      const leftText = template.headerLeftText || (template.tagline?.content ?? '');
      if (leftText) {
        const tagSize = getScaledFontSize(template.tagline?.fontSize ?? 10);
        ctx.font = `italic ${tagSize}px ${template.tagline?.fontFamily || 'Helvetica'}`;
        ctx.fillStyle = template.tagline?.color || '#6b7280';
        ctx.textAlign = 'right';
        ctx.fillText(leftText, leftZoneEnd, nameCenterY);
      }

      currentY += logoHeight + 8;
    } else if (layout === 'logo-center' && !hasLogo) {
      // Logo-center without logo: show company name centered
      const isAllCaps = template.companyName.content === template.companyName.content.toUpperCase();
      currentY = drawTextField(
        ctx,
        { ...template.companyName, alignment: 'center' },
        currentY + 4,
        {
          bold: true,
          letterSpacing: isAllCaps ? 2.5 : 0,
        },
      );
    } else if ((layout === 'logo-left' || layout === 'logo-right') && hasLogo) {
      // Logo on one side, company name + tagline on the other
      const img = logoImageRef.current!;
      const maxLogoHeight = 48;
      const logoWidth = Math.min(template.logo!.width * 0.6, 120);
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const logoHeight = Math.min(logoWidth * aspectRatio, maxLogoHeight);
      const actualLogoWidth = logoHeight / aspectRatio;

      const logoX = layout === 'logo-left' ? MARGIN_X : CANVAS_WIDTH - MARGIN_X - actualLogoWidth;
      ctx.drawImage(img, logoX, currentY, actualLogoWidth, logoHeight);

      // Company name beside the logo
      const nameSize = getScaledFontSize(template.companyName.fontSize);
      ctx.font = `bold ${nameSize}px ${template.companyName.fontFamily || 'Helvetica'}`;
      ctx.fillStyle = template.companyName.color || '#000000';
      const textX = layout === 'logo-left' ? logoX + actualLogoWidth + 10 : MARGIN_X;
      ctx.textAlign = 'left';
      const nameCenterY = currentY + logoHeight / 2 - (template.tagline ? 4 : 0) + nameSize / 3;
      ctx.fillText(template.companyName.content, textX, nameCenterY);

      // Tagline below company name
      if (template.tagline && template.tagline.content.trim()) {
        const tagSize = getScaledFontSize(template.tagline.fontSize);
        ctx.font = `italic ${tagSize}px ${template.tagline.fontFamily || 'Helvetica'}`;
        ctx.fillStyle = template.tagline.color || '#6b7280';
        ctx.fillText(template.tagline.content, textX, nameCenterY + nameSize + 2);
      }

      currentY += logoHeight + 6;
    } else if (layout === 'minimal') {
      // Minimal: just company name, no logo zone
      const isAllCaps = template.companyName.content === template.companyName.content.toUpperCase();
      currentY = drawTextField(ctx, template.companyName, currentY + 4, {
        bold: true,
        letterSpacing: isAllCaps ? 2.5 : 0,
      });
    } else {
      // Centered layout (default) or fallback for logo-left/right without logo
      if (hasLogo) {
        const img = logoImageRef.current!;
        const maxLogoHeight = 48;
        const logoWidth = Math.min(template.logo!.width * 0.6, 120);
        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const logoHeight = Math.min(logoWidth * aspectRatio, maxLogoHeight);
        const actualLogoWidth = logoHeight / aspectRatio;
        const logoX = (CANVAS_WIDTH - actualLogoWidth) / 2;
        ctx.drawImage(img, logoX, currentY, actualLogoWidth, logoHeight);
        currentY += logoHeight + 6;
      }

      const isAllCaps = template.companyName.content === template.companyName.content.toUpperCase();
      currentY = drawTextField(
        ctx,
        { ...template.companyName, alignment: 'center' },
        currentY + 4,
        {
          bold: true,
          letterSpacing: isAllCaps ? 2.5 : 0,
        },
      );

      if (template.tagline && template.tagline.content.trim()) {
        currentY += 1;
        currentY = drawTextField(ctx, { ...template.tagline, alignment: 'center' }, currentY, {
          italic: true,
        });
      }
    }

    // --- CONTACT BAR (single centered line: phone • email • website) ---
    const contactParts: string[] = [];
    if (template.phone.content.trim()) contactParts.push(template.phone.content.trim());
    if (template.email.content.trim()) contactParts.push(template.email.content.trim());
    if (template.website.content.trim()) contactParts.push(template.website.content.trim());

    if (contactParts.length > 0) {
      currentY += 5;
      const contactFontSize = getScaledFontSize(template.phone.fontSize || 9);
      const contactColor = template.phone.color || '#6b7280';
      const contactLine = contactParts.join('   •   ');

      ctx.font = `${contactFontSize}px Helvetica`;
      ctx.fillStyle = contactColor;
      ctx.textAlign = 'center';
      ctx.fillText(contactLine, CANVAS_WIDTH / 2, currentY);
      currentY += contactFontSize + 4;
    }

    // --- SEPARATOR LINE ---
    if (template.showSeparator) {
      currentY += 4;
      drawSeparatorLine(ctx, currentY, accentColor, 1);
      currentY += 2;
    }

    // --- BODY ZONE ---
    // Body starts right after separator with minimal gap
    const bodyStartY = Math.max(currentY + 16, CANVAS_HEIGHT * HEADER_MAX_HEIGHT + 8);

    ctx.font = '12px Helvetica';
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'left';

    let bodyY = bodyStartY;
    const bodyLineHeight = 16;
    const maxBodyY = CANVAS_HEIGHT * FOOTER_Y - 16;

    // Use the template's letter body (or default placeholder)
    const bodyText = getEffectiveLetterBody(template);
    const bodyLines = bodyText.split('\n');

    for (const line of bodyLines) {
      if (bodyY > maxBodyY) break;
      if (line.trim() === '') {
        bodyY += 9;
        continue;
      }
      ctx.fillText(line, MARGIN_X, bodyY);
      bodyY += bodyLineHeight;
    }

    // --- FOOTER ZONE (minimal, last 6% of page) ---
    drawFooter(ctx);

    // Page border (subtle paper edge)
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, [
    template,
    drawTextField,
    drawSeparatorLine,
    drawFooter,
    getScaledFontSize,
    getCanvasTextAlign,
    getAlignmentX,
  ]);

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
      renderPreview();
    };
    img.onerror = () => {
      logoImageRef.current = null;
    };
    img.src = dataUrl;
  }, [template.logo, arrayBufferToDataUrl, renderPreview]);

  // Debounced re-render on template changes (150ms for snappy feedback)
  useEffect(() => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderPreview();
    }, 150);

    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [renderPreview]);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-secondary-400 uppercase dark:text-secondary-500">
        US Letter Preview
      </p>
      <div className="relative rounded-sm shadow-level-3 ring-1 ring-black/5">
        <canvas
          ref={canvasRef}
          className="block rounded-sm bg-white w-full h-auto"
          style={{
            maxWidth: `${CANVAS_WIDTH}px`,
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          }}
          role="img"
          aria-label="Letterhead preview showing template applied to a US Letter page with sample body text"
        />
      </div>
    </div>
  );
}
