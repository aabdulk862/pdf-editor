import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { Icon } from './Icon';

describe('Icon', () => {
  describe('sizing', () => {
    it('defaults to 20px when no size is specified', () => {
      render(<Icon name="check" aria-label="Check" />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('height', '20');
    });

    it('renders at 16px when size={16}', () => {
      render(<Icon name="check" size={16} aria-label="Check" />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('width', '16');
      expect(svg).toHaveAttribute('height', '16');
    });

    it('renders at 24px when size={24}', () => {
      render(<Icon name="check" size={24} aria-label="Check" />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });
  });

  describe('stroke-width', () => {
    it('applies 1.5px stroke-width', () => {
      render(<Icon name="check" aria-label="Check" />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('stroke-width', '1.5');
    });
  });

  describe('accessibility', () => {
    it('sets aria-hidden="true" when no aria-label is provided', () => {
      const { container } = render(<Icon name="check" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets role="img" and aria-label when aria-label is provided', () => {
      render(<Icon name="check" aria-label="Checkmark" />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('aria-label', 'Checkmark');
    });

    it('does not set aria-hidden when aria-label is provided', () => {
      render(<Icon name="check" aria-label="Checkmark" />);
      const svg = screen.getByRole('img');
      expect(svg).not.toHaveAttribute('aria-hidden');
    });

    it('respects explicit aria-hidden override', () => {
      render(<Icon name="check" aria-label="Check" aria-hidden={true} />);
      const { container } = render(<Icon name="check" aria-hidden={true} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('name-based rendering', () => {
    it('renders SVG paths for a known icon name', () => {
      const { container } = render(<Icon name="close" aria-label="Close" />);
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBe(2); // close has 2 paths
    });

    it('returns null for an unknown icon name', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { container } = render(<Icon name="nonexistent" />);
      expect(container.innerHTML).toBe('');
      consoleSpy.mockRestore();
    });

    it('warns in development for unknown icon names', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      render(<Icon name="nonexistent" />);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown icon name: "nonexistent"'),
      );
      consoleSpy.mockRestore();
    });
  });

  describe('children-based rendering', () => {
    it('clones child SVG with enforced size', () => {
      render(
        <Icon size={24} aria-label="Custom">
          <svg viewBox="0 0 20 20">
            <path d="M5 5l10 10" />
          </svg>
        </Icon>,
      );
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveAttribute('height', '24');
    });

    it('applies stroke-width to child SVG', () => {
      render(
        <Icon size={20} aria-label="Custom">
          <svg viewBox="0 0 20 20" strokeWidth={2}>
            <path d="M5 5l10 10" />
          </svg>
        </Icon>,
      );
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('stroke-width', '1.5');
    });
  });

  describe('className', () => {
    it('passes className to the SVG element', () => {
      render(<Icon name="check" className="text-red-500" aria-label="Check" />);
      const svg = screen.getByRole('img');
      expect(svg).toHaveClass('text-red-500');
    });
  });
});
