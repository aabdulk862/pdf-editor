import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Skeleton } from './Skeleton';

// Mock useReducedMotion hook
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

import { useReducedMotion } from '../../hooks/useReducedMotion';
const mockUseReducedMotion = vi.mocked(useReducedMotion);

describe('Skeleton', () => {
  beforeEach(() => {
    mockUseReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('variants', () => {
    it('renders rectangular variant by default with rounded-md', () => {
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('rounded-md');
    });

    it('renders text variant with rounded-sm and defaults height to 1em', () => {
      render(<Skeleton variant="text" />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('rounded-sm');
      expect(el.style.height).toBe('1em');
      expect(el.style.width).toBe('100%');
    });

    it('renders circular variant with rounded-full and equal width/height', () => {
      render(<Skeleton variant="circular" width={48} />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('rounded-full');
      expect(el.style.width).toBe('48px');
      expect(el.style.height).toBe('48px');
    });

    it('circular variant defaults to 40px when no size provided', () => {
      render(<Skeleton variant="circular" />);
      const el = screen.getByTestId('skeleton');
      expect(el.style.width).toBe('40px');
      expect(el.style.height).toBe('40px');
    });
  });

  describe('dimensions', () => {
    it('accepts number values and converts to px', () => {
      render(<Skeleton width={200} height={100} />);
      const el = screen.getByTestId('skeleton');
      expect(el.style.width).toBe('200px');
      expect(el.style.height).toBe('100px');
    });

    it('accepts string values as-is', () => {
      render(<Skeleton width="50%" height="2rem" />);
      const el = screen.getByTestId('skeleton');
      expect(el.style.width).toBe('50%');
      expect(el.style.height).toBe('2rem');
    });
  });

  describe('shimmer animation', () => {
    it('renders shimmer overlay when reduced motion is not preferred', () => {
      mockUseReducedMotion.mockReturnValue(false);
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      const shimmer = el.querySelector('.animate-shimmer');
      expect(shimmer).not.toBeNull();
    });

    it('does NOT render shimmer overlay when reduced motion is preferred', () => {
      mockUseReducedMotion.mockReturnValue(true);
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      const shimmer = el.querySelector('.animate-shimmer');
      expect(shimmer).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('sets aria-hidden="true"', () => {
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('design tokens', () => {
    it('uses secondary-200 background for light mode', () => {
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('bg-secondary-200');
    });

    it('uses secondary-700 background for dark mode', () => {
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('dark:bg-secondary-700');
    });
  });

  describe('className', () => {
    it('passes additional className', () => {
      render(<Skeleton width={100} height={50} className="my-custom-class" />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('my-custom-class');
    });
  });

  describe('overflow hidden', () => {
    it('has overflow-hidden to contain shimmer animation', () => {
      render(<Skeleton width={100} height={50} />);
      const el = screen.getByTestId('skeleton');
      expect(el).toHaveClass('overflow-hidden');
    });
  });
});
