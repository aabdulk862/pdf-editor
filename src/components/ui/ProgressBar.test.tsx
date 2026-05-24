import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('500ms show delay', () => {
    it('does not render immediately when progress starts', () => {
      render(<ProgressBar progress={25} label="Loading" ariaLabel="Loading file" />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('renders after 500ms delay', () => {
      render(<ProgressBar progress={25} label="Loading" ariaLabel="Loading file" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not render if progress completes before 500ms', () => {
      const { rerender } = render(
        <ProgressBar progress={25} label="Loading" ariaLabel="Loading file" />,
      );

      act(() => {
        vi.advanceTimersByTime(300);
      });

      rerender(<ProgressBar progress={100} label="Done" ariaLabel="Complete" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('determinate mode', () => {
    it('shows percentage text when progress is a number', () => {
      render(<ProgressBar progress={50} label="Uploading" ariaLabel="Uploading file" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('clamps progress to 0-100 range', () => {
      render(<ProgressBar progress={-10} label="Loading" ariaLabel="Loading" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('sets aria-valuenow for determinate progress', () => {
      render(<ProgressBar progress={75} label="Processing" ariaLabel="Processing PDF" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
    });
  });

  describe('indeterminate mode', () => {
    it('renders without percentage when progress is null', () => {
      render(<ProgressBar progress={null} label="Working" ariaLabel="Working" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });

    it('does not set aria-valuenow for indeterminate progress', () => {
      render(<ProgressBar progress={null} label="Working" ariaLabel="Working" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).not.toHaveAttribute('aria-valuenow');
    });
  });

  describe('ARIA accessibility', () => {
    it('has role="progressbar"', () => {
      render(<ProgressBar progress={50} label="Loading" ariaLabel="Loading file" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has aria-label attribute', () => {
      render(<ProgressBar progress={50} label="Loading" ariaLabel="Loading file" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', 'Loading file');
    });

    it('has aria-valuemin and aria-valuemax', () => {
      render(<ProgressBar progress={50} label="Loading" ariaLabel="Loading file" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('300ms fade-out on completion', () => {
    it('fades out when progress reaches 100', () => {
      const { rerender } = render(
        <ProgressBar progress={50} label="Loading" ariaLabel="Loading file" />,
      );

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      rerender(<ProgressBar progress={100} label="Done" ariaLabel="Complete" />);

      // Still visible during fade-out
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Gone after 300ms fade-out
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('label display', () => {
    it('displays the label text', () => {
      render(<ProgressBar progress={30} label="Compressing PDF" ariaLabel="Compressing" />);

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('Compressing PDF')).toBeInTheDocument();
    });
  });
});
