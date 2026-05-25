import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ToolPageSkeleton } from './ToolPageSkeleton';

// Mock useReducedMotion used by the Skeleton primitive
vi.mock('../hooks/useReducedMotion', () => ({
  useReducedMotion: vi.fn(() => false),
}));

describe('ToolPageSkeleton', () => {
  it('renders the skeleton container with aria-busy', () => {
    render(<ToolPageSkeleton />);
    const container = screen.getByTestId('tool-page-skeleton');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-busy', 'true');
  });

  it('renders multiple skeleton elements for heading, upload zone, and buttons', () => {
    render(<ToolPageSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    // heading (2) + upload zone (1) + action buttons (2) = 5
    expect(skeletons.length).toBe(5);
  });

  it('has an accessible label for screen readers', () => {
    render(<ToolPageSkeleton />);
    const container = screen.getByTestId('tool-page-skeleton');
    expect(container).toHaveAttribute('aria-label', 'Loading tool page');
  });

  it('renders the upload zone skeleton with dashed border styling', () => {
    render(<ToolPageSkeleton />);
    const skeletons = screen.getAllByTestId('skeleton');
    // The upload zone is the 3rd skeleton (index 2)
    const uploadZone = skeletons[2];
    expect(uploadZone).toHaveClass('border-dashed');
    expect(uploadZone.style.height).toBe('200px');
  });
});
