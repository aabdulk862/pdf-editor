/**
 * Utility for HiDPI (Retina) canvas rendering.
 *
 * On HiDPI displays, `window.devicePixelRatio` is 2 or 3. To render sharp
 * content, the canvas buffer must be sized at `logicalWidth * dpr` and
 * `logicalHeight * dpr`, then scaled down via CSS to the logical size.
 *
 * Requirement: 12.7 — PDF page previews render at device-pixel-ratio resolution
 * for Retina/HiDPI sharpness.
 */

/**
 * Returns the current device pixel ratio, clamped to a reasonable maximum
 * to prevent excessive memory usage on very high DPI displays.
 */
export function getDevicePixelRatio(): number {
  const dpr = window.devicePixelRatio || 1;
  // Clamp to max 3 to avoid excessive canvas sizes on ultra-high DPI displays
  return Math.min(dpr, 3);
}

/**
 * Configures a canvas element for HiDPI rendering.
 *
 * Sets the canvas buffer dimensions to `logicalWidth * dpr` and
 * `logicalHeight * dpr`, applies CSS dimensions for the logical size,
 * and scales the 2D context so drawing operations remain in logical pixels.
 *
 * @param canvas - The canvas element to configure
 * @param logicalWidth - The desired CSS/logical width in pixels
 * @param logicalHeight - The desired CSS/logical height in pixels
 * @param dpr - Device pixel ratio (defaults to current device's ratio)
 * @returns The 2D rendering context, scaled for HiDPI
 */
export function configureHiDPICanvas(
  canvas: HTMLCanvasElement,
  logicalWidth: number,
  logicalHeight: number,
  dpr?: number,
): CanvasRenderingContext2D | null {
  const pixelRatio = dpr ?? getDevicePixelRatio();

  // Set buffer size to physical pixels
  canvas.width = Math.round(logicalWidth * pixelRatio);
  canvas.height = Math.round(logicalHeight * pixelRatio);

  // Set CSS size to logical pixels
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Scale context so all drawing operations use logical pixel coordinates
    ctx.scale(pixelRatio, pixelRatio);
  }

  return ctx;
}
