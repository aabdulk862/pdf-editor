import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { MM_TO_PX } from '../constants';
import type { SnapGuide, Viewport } from '../types';
import { SnapGuideOverlay } from './SnapGuideOverlay';

const defaultViewport: Viewport = { panX: 0, panY: 0, zoom: 1.0 };

describe('SnapGuideOverlay', () => {
  it('renders nothing when guides array is empty', () => {
    render(
      <SnapGuideOverlay
        guides={[]}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
      />,
    );
    expect(screen.queryByTestId('snap-guide-overlay')).not.toBeInTheDocument();
  });

  it('renders vertical guide lines', () => {
    const guides: SnapGuide[] = [{ type: 'vertical', position: 100, sourceId: 'el-1' }];
    render(
      <SnapGuideOverlay
        guides={guides}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
      />,
    );

    const overlay = screen.getByTestId('snap-guide-overlay');
    expect(overlay).toBeInTheDocument();

    const guide = screen.getByTestId('snap-guide-vertical-0');
    expect(guide).toBeInTheDocument();
    // screenX = (100 * MM_TO_PX - 0) * 1
    expect(guide.style.left).toBe(`${100 * MM_TO_PX}px`);
    expect(guide.style.height).toBe('600px');
  });

  it('renders horizontal guide lines', () => {
    const guides: SnapGuide[] = [{ type: 'horizontal', position: 200, sourceId: 'el-2' }];
    render(
      <SnapGuideOverlay
        guides={guides}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
      />,
    );

    const guide = screen.getByTestId('snap-guide-horizontal-0');
    expect(guide).toBeInTheDocument();
    // screenY = (200 * MM_TO_PX - 0) * 1
    expect(guide.style.top).toBe(`${200 * MM_TO_PX}px`);
    expect(guide.style.width).toBe('800px');
  });

  it('applies viewport transform to guide positions', () => {
    const guides: SnapGuide[] = [
      { type: 'vertical', position: 50, sourceId: 'el-1' },
      { type: 'horizontal', position: 80, sourceId: 'el-2' },
    ];
    const viewport: Viewport = { panX: 10, panY: 20, zoom: 2.0 };

    render(
      <SnapGuideOverlay guides={guides} viewport={viewport} canvasWidth={800} canvasHeight={600} />,
    );

    // screenX = (50 * MM_TO_PX - 10) * 2
    const vGuide = screen.getByTestId('snap-guide-vertical-0');
    expect(vGuide.style.left).toBe(`${(50 * MM_TO_PX - 10) * 2}px`);

    // screenY = (80 * MM_TO_PX - 20) * 2
    const hGuide = screen.getByTestId('snap-guide-horizontal-1');
    expect(hGuide.style.top).toBe(`${(80 * MM_TO_PX - 20) * 2}px`);
  });

  it('renders multiple guides simultaneously', () => {
    const guides: SnapGuide[] = [
      { type: 'vertical', position: 100, sourceId: 'el-1' },
      { type: 'vertical', position: 200, sourceId: 'el-2' },
      { type: 'horizontal', position: 150, sourceId: 'el-3' },
    ];
    render(
      <SnapGuideOverlay
        guides={guides}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
      />,
    );

    expect(screen.getByTestId('snap-guide-vertical-0')).toBeInTheDocument();
    expect(screen.getByTestId('snap-guide-vertical-1')).toBeInTheDocument();
    expect(screen.getByTestId('snap-guide-horizontal-2')).toBeInTheDocument();
  });

  it('overlay is pointer-events-none to not interfere with interactions', () => {
    const guides: SnapGuide[] = [{ type: 'vertical', position: 100, sourceId: 'el-1' }];
    render(
      <SnapGuideOverlay
        guides={guides}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
      />,
    );

    const overlay = screen.getByTestId('snap-guide-overlay');
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('overlay is aria-hidden for accessibility', () => {
    const guides: SnapGuide[] = [{ type: 'horizontal', position: 50, sourceId: 'el-1' }];
    render(
      <SnapGuideOverlay
        guides={guides}
        viewport={defaultViewport}
        canvasWidth={800}
        canvasHeight={600}
      />,
    );

    const overlay = screen.getByTestId('snap-guide-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });
});
