import type { TextElement, TextRun, TextAlignment, Viewport } from '../types';
import { MM_TO_PX } from '../constants';

// === Types ===

export interface TextLine {
  text: string;
  width: number;
}

export interface MeasuredRun {
  text: string;
  width: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontColor?: string;
  fontSize?: number;
  fontFamily?: string;
}

// === Text Measurement ===

/**
 * Measure the width of a text string using the canvas 2D context.
 * Sets the font on the context before measuring.
 */
export function measureTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
): number {
  ctx.font = font;
  return ctx.measureText(text).width;
}

/**
 * Build a CSS font string from individual properties.
 */
export function buildFontString(
  fontSize: number,
  fontFamily: string,
  bold: boolean,
  italic: boolean,
): string {
  const style = italic ? 'italic' : 'normal';
  const weight = bold ? 'bold' : 'normal';
  return `${style} ${weight} ${fontSize}px ${fontFamily}`;
}

// === Word Wrapping ===

/**
 * Wrap text into lines that fit within maxWidth.
 * Splits on whitespace boundaries. Words that exceed maxWidth are placed
 * on their own line (not broken mid-word).
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): TextLine[] {
  ctx.font = font;

  if (maxWidth <= 0) {
    return [{ text, width: ctx.measureText(text).width }];
  }

  const paragraphs = text.split('\n');
  const lines: TextLine[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      lines.push({ text: '', width: 0 });
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (currentLine === '') {
        currentLine = word;
      } else {
        const testLine = `${currentLine} ${word}`;
        const testWidth = ctx.measureText(testLine).width;

        if (testWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          lines.push({ text: currentLine, width: ctx.measureText(currentLine).width });
          currentLine = word;
        }
      }
    }

    if (currentLine !== '') {
      lines.push({ text: currentLine, width: ctx.measureText(currentLine).width });
    }
  }

  // Handle empty input
  if (lines.length === 0) {
    lines.push({ text: '', width: 0 });
  }

  return lines;
}

/**
 * Compute text lines for word-wrapping with explicit font parameters.
 * Convenience wrapper around wrapText.
 */
export function getTextLines(
  ctx: CanvasRenderingContext2D,
  content: string,
  width: number,
  fontFamily: string,
  fontSize: number,
  bold: boolean = false,
  italic: boolean = false,
): TextLine[] {
  const font = buildFontString(fontSize, fontFamily, bold, italic);
  return wrapText(ctx, content, width, font);
}

// === Text Alignment ===

/**
 * Compute the x position for a line of text given alignment and element bounds.
 */
export function getAlignedX(
  alignment: TextAlignment,
  elementX: number,
  elementWidth: number,
): number {
  switch (alignment) {
    case 'center':
      return elementX + elementWidth / 2;
    case 'right':
      return elementX + elementWidth;
    case 'left':
    case 'justify':
    default:
      return elementX;
  }
}

/**
 * Get the CanvasRenderingContext2D textAlign value for a given TextAlignment.
 * For 'justify', we use 'left' and handle spacing manually.
 */
export function getCanvasTextAlign(alignment: TextAlignment): CanvasTextAlign {
  switch (alignment) {
    case 'center':
      return 'center';
    case 'right':
      return 'right';
    case 'left':
    case 'justify':
    default:
      return 'left';
  }
}

// === Styled Runs ===

/**
 * Apply a TextRun's styling to the canvas context, falling back to element defaults.
 */
export function applyTextRun(
  ctx: CanvasRenderingContext2D,
  run: TextRun,
  defaults: {
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    bold: boolean;
    italic: boolean;
  },
): void {
  const fontFamily = run.fontFamily ?? defaults.fontFamily;
  const fontSize = run.fontSize ?? defaults.fontSize;
  const bold = run.bold ?? defaults.bold;
  const italic = run.italic ?? defaults.italic;
  const fontColor = run.fontColor ?? defaults.fontColor;

  ctx.font = buildFontString(fontSize, fontFamily, bold, italic);
  ctx.fillStyle = fontColor;
}

/**
 * Slice a line's text into segments based on TextRun styling.
 * Each segment has its own styling applied from the matching run(s).
 * Characters not covered by any run use element defaults.
 */
export function getStyledSegments(
  lineText: string,
  lineStartOffset: number,
  runs: TextRun[],
  defaults: {
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    bold: boolean;
    italic: boolean;
  },
): MeasuredRun[] {
  if (!runs || runs.length === 0) {
    return [
      {
        text: lineText,
        width: 0, // width computed later by caller
        bold: defaults.bold,
        italic: defaults.italic,
        fontColor: defaults.fontColor,
        fontSize: defaults.fontSize,
        fontFamily: defaults.fontFamily,
      },
    ];
  }

  const lineEnd = lineStartOffset + lineText.length;
  const segments: MeasuredRun[] = [];

  // Collect all boundary points within this line
  const boundaries = new Set<number>();
  boundaries.add(lineStartOffset);
  boundaries.add(lineEnd);

  for (const run of runs) {
    if (run.start < lineEnd && run.end > lineStartOffset) {
      boundaries.add(Math.max(run.start, lineStartOffset));
      boundaries.add(Math.min(run.end, lineEnd));
    }
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const segStart = sortedBoundaries[i];
    const segEnd = sortedBoundaries[i + 1];
    const segText = lineText.slice(segStart - lineStartOffset, segEnd - lineStartOffset);

    if (segText.length === 0) continue;

    // Find the run that covers this segment (last matching run wins)
    let appliedRun: TextRun | undefined;
    for (const run of runs) {
      if (run.start <= segStart && run.end >= segEnd) {
        appliedRun = run;
      }
    }

    segments.push({
      text: segText,
      width: 0, // computed later
      bold: appliedRun?.bold ?? defaults.bold,
      italic: appliedRun?.italic ?? defaults.italic,
      underline: (appliedRun?.underline ?? defaults.italic) ? undefined : undefined,
      fontColor: appliedRun?.fontColor ?? defaults.fontColor,
      fontSize: appliedRun?.fontSize ?? defaults.fontSize,
      fontFamily: appliedRun?.fontFamily ?? defaults.fontFamily,
    });

    // Correctly set underline from run or default (not from italic)
    segments[segments.length - 1].underline = appliedRun?.underline;
  }

  return segments;
}

// === Justify Rendering ===

/**
 * Render a line of text with justified alignment by distributing extra space
 * between words. The last line of a paragraph is left-aligned.
 */
export function renderJustifiedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  maxWidth: number,
  isLastLine: boolean,
): void {
  if (isLastLine || !line.includes(' ')) {
    // Last line or single word: render left-aligned
    ctx.textAlign = 'left';
    ctx.fillText(line, x, y);
    return;
  }

  const words = line.split(' ');
  if (words.length <= 1) {
    ctx.textAlign = 'left';
    ctx.fillText(line, x, y);
    return;
  }

  const totalTextWidth = words.reduce((sum, word) => sum + ctx.measureText(word).width, 0);
  const extraSpace = (maxWidth - totalTextWidth) / (words.length - 1);

  let currentX = x;
  ctx.textAlign = 'left';

  for (let i = 0; i < words.length; i++) {
    ctx.fillText(words[i], currentX, y);
    currentX += ctx.measureText(words[i]).width + extraSpace;
  }
}

// === Main Render Function ===

/**
 * Render a full TextElement onto the canvas with word-wrapping, alignment,
 * and styled runs support.
 *
 * @param ctx - The canvas 2D rendering context
 * @param element - The TextElement to render
 * @param viewport - Optional viewport for coordinate transforms (if not provided, renders in document space)
 */
export function renderTextElement(
  ctx: CanvasRenderingContext2D,
  element: TextElement,
  viewport?: Viewport,
): void {
  const { content, fontFamily, fontSize, fontColor, bold, italic, underline, alignment, runs } =
    element;

  // Compute rendering position (apply viewport transform if provided)
  let renderX = element.x;
  let renderY = element.y;
  let renderWidth = element.width;
  let scale = 1;

  if (viewport) {
    renderX = (element.x * MM_TO_PX - viewport.panX) * viewport.zoom;
    renderY = (element.y * MM_TO_PX - viewport.panY) * viewport.zoom;
    renderWidth = element.width * MM_TO_PX * viewport.zoom;
    scale = viewport.zoom;
  }

  const scaledFontSize = fontSize * scale;
  const lineHeight = scaledFontSize * 1.2;

  ctx.save();

  // Apply element opacity
  ctx.globalAlpha = element.opacity / 100;

  // Apply rotation if needed
  if (element.rotation !== 0) {
    const centerX = renderX + renderWidth / 2;
    const centerY = renderY + (element.height * MM_TO_PX * scale) / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((element.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Set default text styles
  const defaultFont = buildFontString(scaledFontSize, fontFamily, bold, italic);
  ctx.font = defaultFont;
  ctx.fillStyle = fontColor;
  ctx.textBaseline = 'top';

  // Compute wrapped lines
  const lines = wrapText(ctx, content, renderWidth, defaultFont);

  // Render each line
  const defaults = { fontFamily, fontSize: scaledFontSize, fontColor, bold, italic };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = renderY + i * lineHeight;

    if (runs && runs.length > 0) {
      // Render with styled runs
      renderStyledLine(ctx, line.text, computeLineOffset(content, lines, i), runs, defaults, {
        x: renderX,
        y: lineY,
        width: renderWidth,
        alignment,
        isLastLine: i === lines.length - 1,
        underlineDefault: underline,
        scale,
      });
    } else if (alignment === 'justify') {
      // Justify alignment without styled runs
      ctx.font = defaultFont;
      ctx.fillStyle = fontColor;
      renderJustifiedLine(ctx, line.text, renderX, lineY, renderWidth, i === lines.length - 1);

      if (underline) {
        drawUnderline(ctx, renderX, lineY, line.width, scaledFontSize, fontColor);
      }
    } else {
      // Simple rendering without styled runs
      const textAlign = getCanvasTextAlign(alignment);
      const textX = getAlignedX(alignment, renderX, renderWidth);

      ctx.textAlign = textAlign;
      ctx.font = defaultFont;
      ctx.fillStyle = fontColor;
      ctx.fillText(line.text, textX, lineY);

      if (underline) {
        const underlineX =
          alignment === 'center'
            ? textX - line.width / 2
            : alignment === 'right'
              ? textX - line.width
              : textX;
        drawUnderline(ctx, underlineX, lineY, line.width, scaledFontSize, fontColor);
      }
    }
  }

  ctx.restore();
}

// === Internal Helpers ===

/**
 * Compute the character offset of a line within the original content.
 */
function computeLineOffset(content: string, lines: TextLine[], lineIndex: number): number {
  let offset = 0;
  const paragraphs = content.split('\n');
  let lineCounter = 0;

  for (const paragraph of paragraphs) {
    if (paragraph === '') {
      if (lineCounter === lineIndex) return offset;
      lineCounter++;
      offset += 1; // newline character
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      if (currentLine === '') {
        currentLine = word;
      } else {
        const testLine = `${currentLine} ${word}`;
        // We need to check if this matches the line we computed during wrapping
        // Since we can't measure here, we rely on the lines array
        if (lineCounter < lines.length && lines[lineCounter].text === testLine.trim()) {
          currentLine = testLine;
        } else if (lineCounter < lines.length && lines[lineCounter].text === currentLine) {
          // Current line is complete, move to next
          if (lineCounter === lineIndex) return offset;
          offset += currentLine.length + 1; // +1 for space
          lineCounter++;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    }

    if (currentLine !== '') {
      if (lineCounter === lineIndex) return offset;
      offset += currentLine.length;
      lineCounter++;
    }

    offset += 1; // newline character
  }

  return offset;
}

/**
 * Render a single line with styled runs applied.
 */
function renderStyledLine(
  ctx: CanvasRenderingContext2D,
  lineText: string,
  lineStartOffset: number,
  runs: TextRun[],
  defaults: {
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    bold: boolean;
    italic: boolean;
  },
  options: {
    x: number;
    y: number;
    width: number;
    alignment: TextAlignment;
    isLastLine: boolean;
    underlineDefault: boolean;
    scale: number;
  },
): void {
  const segments = getStyledSegments(lineText, lineStartOffset, runs, defaults);

  // Measure each segment
  for (const segment of segments) {
    const font = buildFontString(
      segment.fontSize ?? defaults.fontSize,
      segment.fontFamily ?? defaults.fontFamily,
      segment.bold ?? defaults.bold,
      segment.italic ?? defaults.italic,
    );
    ctx.font = font;
    segment.width = ctx.measureText(segment.text).width;
  }

  const totalWidth = segments.reduce((sum, seg) => sum + seg.width, 0);

  // Determine starting x based on alignment
  let startX: number;
  if (options.alignment === 'center') {
    startX = options.x + (options.width - totalWidth) / 2;
  } else if (options.alignment === 'right') {
    startX = options.x + options.width - totalWidth;
  } else {
    startX = options.x;
  }

  // For justify, distribute extra space between words
  if (options.alignment === 'justify' && !options.isLastLine) {
    renderJustifiedStyledLine(ctx, segments, options, defaults);
    return;
  }

  // Render each segment
  ctx.textAlign = 'left';
  let currentX = startX;

  for (const segment of segments) {
    const font = buildFontString(
      segment.fontSize ?? defaults.fontSize,
      segment.fontFamily ?? defaults.fontFamily,
      segment.bold ?? defaults.bold,
      segment.italic ?? defaults.italic,
    );
    ctx.font = font;
    ctx.fillStyle = segment.fontColor ?? defaults.fontColor;
    ctx.fillText(segment.text, currentX, options.y);

    // Draw underline if run specifies it or element default is underline
    if (segment.underline || (segment.underline === undefined && options.underlineDefault)) {
      const segFontSize = segment.fontSize ?? defaults.fontSize;
      drawUnderline(
        ctx,
        currentX,
        options.y,
        segment.width,
        segFontSize,
        segment.fontColor ?? defaults.fontColor,
      );
    }

    currentX += segment.width;
  }
}

/**
 * Render a justified line with styled segments.
 * Distributes extra space between word boundaries.
 */
function renderJustifiedStyledLine(
  ctx: CanvasRenderingContext2D,
  segments: MeasuredRun[],
  options: {
    x: number;
    y: number;
    width: number;
    alignment: TextAlignment;
    isLastLine: boolean;
    underlineDefault: boolean;
    scale: number;
  },
  defaults: {
    fontFamily: string;
    fontSize: number;
    fontColor: string;
    bold: boolean;
    italic: boolean;
  },
): void {
  // Combine all segment text to find word boundaries
  const fullText = segments.map((s) => s.text).join('');
  const spaceCount = (fullText.match(/ /g) || []).length;

  if (spaceCount === 0) {
    // No spaces to justify, render left-aligned
    ctx.textAlign = 'left';
    let currentX = options.x;
    for (const segment of segments) {
      const font = buildFontString(
        segment.fontSize ?? defaults.fontSize,
        segment.fontFamily ?? defaults.fontFamily,
        segment.bold ?? defaults.bold,
        segment.italic ?? defaults.italic,
      );
      ctx.font = font;
      ctx.fillStyle = segment.fontColor ?? defaults.fontColor;
      ctx.fillText(segment.text, currentX, options.y);
      currentX += segment.width;
    }
    return;
  }

  const totalWidth = segments.reduce((sum, seg) => sum + seg.width, 0);
  const extraSpacePerGap = (options.width - totalWidth) / spaceCount;

  ctx.textAlign = 'left';
  let currentX = options.x;

  for (const segment of segments) {
    const font = buildFontString(
      segment.fontSize ?? defaults.fontSize,
      segment.fontFamily ?? defaults.fontFamily,
      segment.bold ?? defaults.bold,
      segment.italic ?? defaults.italic,
    );
    ctx.font = font;
    ctx.fillStyle = segment.fontColor ?? defaults.fontColor;

    // Render character by character to add extra space at word boundaries
    for (let c = 0; c < segment.text.length; c++) {
      const char = segment.text[c];
      ctx.fillText(char, currentX, options.y);
      const charWidth = ctx.measureText(char).width;
      currentX += charWidth;

      if (char === ' ') {
        currentX += extraSpacePerGap;
      }
    }

    // Draw underline if needed
    if (segment.underline || (segment.underline === undefined && options.underlineDefault)) {
      const segFontSize = segment.fontSize ?? defaults.fontSize;
      const segStartX = currentX - segment.width; // approximate
      drawUnderline(
        ctx,
        segStartX,
        options.y,
        segment.width,
        segFontSize,
        segment.fontColor ?? defaults.fontColor,
      );
    }
  }
}

/**
 * Draw an underline beneath text.
 */
function drawUnderline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color: string,
): void {
  const underlineY = y + fontSize * 1.1;
  const lineWidth = Math.max(1, fontSize / 12);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x, underlineY);
  ctx.lineTo(x + width, underlineY);
  ctx.stroke();
  ctx.restore();
}
