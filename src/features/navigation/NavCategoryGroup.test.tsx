import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NavCategoryGroup } from './NavCategoryGroup';

const MockIcon = ({ className }: { className?: string }) => (
  <svg data-testid="category-icon" className={className} />
);

describe('NavCategoryGroup', () => {
  const defaultProps = {
    category: { id: 'edit', label: 'Edit' },
    icon: MockIcon,
    isCollapsed: false,
    onToggle: vi.fn(),
  };

  it('renders category label and icon', () => {
    render(
      <NavCategoryGroup {...defaultProps}>
        <div>Child content</div>
      </NavCategoryGroup>,
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByTestId('category-icon')).toBeInTheDocument();
    expect(screen.getByTestId('category-icon')).toHaveClass('h-5 w-5');
  });

  it('renders children when expanded', () => {
    render(
      <NavCategoryGroup {...defaultProps} isCollapsed={false}>
        <div>Tool link 1</div>
        <div>Tool link 2</div>
      </NavCategoryGroup>,
    );

    expect(screen.getByText('Tool link 1')).toBeInTheDocument();
    expect(screen.getByText('Tool link 2')).toBeInTheDocument();
  });

  it('hides children when collapsed via max-h-0 and opacity-0', () => {
    render(
      <NavCategoryGroup {...defaultProps} isCollapsed={true}>
        <div>Hidden content</div>
      </NavCategoryGroup>,
    );

    const collapsibleSection = screen.getByRole('group', { name: 'Edit' });
    expect(collapsibleSection).toHaveClass('max-h-0', 'opacity-0');
  });

  it('shows children when expanded via max-h and opacity-100', () => {
    render(
      <NavCategoryGroup {...defaultProps} isCollapsed={false}>
        <div>Visible content</div>
      </NavCategoryGroup>,
    );

    const collapsibleSection = screen.getByRole('group', { name: 'Edit' });
    expect(collapsibleSection).toHaveClass('opacity-100');
    expect(collapsibleSection).not.toHaveClass('max-h-0');
  });

  it('calls onToggle when header button is clicked', () => {
    const onToggle = vi.fn();
    render(
      <NavCategoryGroup {...defaultProps} onToggle={onToggle}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('chevron has rotate-90 class when expanded', () => {
    const { container } = render(
      <NavCategoryGroup {...defaultProps} isCollapsed={false}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    const chevron = container.querySelector('svg[aria-hidden="true"]');
    expect(chevron).toHaveClass('rotate-90');
    expect(chevron).not.toHaveClass('rotate-0');
  });

  it('chevron has rotate-0 class when collapsed', () => {
    const { container } = render(
      <NavCategoryGroup {...defaultProps} isCollapsed={true}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    const chevron = container.querySelector('svg[aria-hidden="true"]');
    expect(chevron).toHaveClass('rotate-0');
    expect(chevron).not.toHaveClass('rotate-90');
  });

  it('chevron has transition-transform duration-200 for animation', () => {
    const { container } = render(
      <NavCategoryGroup {...defaultProps}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    const chevron = container.querySelector('svg[aria-hidden="true"]');
    expect(chevron).toHaveClass('transition-transform', 'duration-200');
  });

  it('sets aria-expanded correctly based on isCollapsed', () => {
    const { rerender } = render(
      <NavCategoryGroup {...defaultProps} isCollapsed={false}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');

    rerender(
      <NavCategoryGroup {...defaultProps} isCollapsed={true}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('collapsible section has overflow-hidden for smooth animation', () => {
    render(
      <NavCategoryGroup {...defaultProps}>
        <div>Content</div>
      </NavCategoryGroup>,
    );

    const collapsibleSection = screen.getByRole('group', { name: 'Edit' });
    expect(collapsibleSection).toHaveClass('overflow-hidden');
  });
});
