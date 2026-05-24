import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OcrProgressPanel } from './OcrProgressPanel';
import type { OcrProgress } from '../../../core/ocr-engine/types';

describe('OcrProgressPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const baseProgress: OcrProgress = {
    currentPage: 3,
    totalPages: 10,
    percentComplete: 30,
    estimatedTimeRemainingMs: null,
    pageTimings: [2000, 2100, 1900],
  };

  it('renders progress bar with correct percentage', () => {
    render(<OcrProgressPanel progress={baseProgress} onCancel={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '30');
  });

  it('displays "Processing page X of Y" text', () => {
    render(<OcrProgressPanel progress={baseProgress} onCancel={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText('Processing page 3 of 10')).toBeInTheDocument();
  });

  it('does not show ETA when estimatedTimeRemainingMs is null (fewer than 2 pages processed)', () => {
    const progress: OcrProgress = {
      ...baseProgress,
      currentPage: 1,
      percentComplete: 10,
      estimatedTimeRemainingMs: null,
      pageTimings: [2000],
    };
    render(<OcrProgressPanel progress={progress} onCancel={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.queryByText(/Estimated time remaining/)).not.toBeInTheDocument();
  });

  it('shows ETA in "Xm Ys" format when estimatedTimeRemainingMs is provided', () => {
    const progress: OcrProgress = {
      ...baseProgress,
      estimatedTimeRemainingMs: 125000, // 2m 5s
    };
    render(<OcrProgressPanel progress={progress} onCancel={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Estimated time remaining: 2m 5s/)).toBeInTheDocument();
  });

  it('shows ETA of 0m 45s for 45 seconds remaining', () => {
    const progress: OcrProgress = {
      ...baseProgress,
      estimatedTimeRemainingMs: 45000,
    };
    render(<OcrProgressPanel progress={progress} onCancel={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(screen.getByText(/Estimated time remaining: 0m 45s/)).toBeInTheDocument();
  });

  it('renders a cancel button', () => {
    render(<OcrProgressPanel progress={baseProgress} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<OcrProgressPanel progress={baseProgress} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancel button has minimum 44x44px touch target', () => {
    render(<OcrProgressPanel progress={baseProgress} onCancel={vi.fn()} />);
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    // The Button component with size="sm" already applies min-h-[44px] min-w-[44px]
    expect(cancelButton.className).toContain('min-h-[44px]');
    expect(cancelButton.className).toContain('min-w-[44px]');
  });
});
