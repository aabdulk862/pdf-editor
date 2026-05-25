import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ShortcutPanel } from './ShortcutPanel';

describe('ShortcutPanel', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ShortcutPanel isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the panel when isOpen is true', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('displays the "Keyboard Shortcuts" heading', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('displays all shortcut categories', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Modifiers')).toBeInTheDocument();
    expect(screen.getByText('Movement')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('displays tool shortcuts', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Select / Move')).toBeInTheDocument();
    expect(screen.getByText('Text tool')).toBeInTheDocument();
    expect(screen.getByText('Rectangle')).toBeInTheDocument();
    expect(screen.getByText('Circle')).toBeInTheDocument();
    expect(screen.getByText('Line')).toBeInTheDocument();
    expect(screen.getByText('Image upload')).toBeInTheDocument();
  });

  it('displays modifier shortcuts', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.getByText('Select all')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Group elements')).toBeInTheDocument();
    expect(screen.getByText('Ungroup')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Paste')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('displays movement shortcuts', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Move selected by 1px')).toBeInTheDocument();
    expect(screen.getByText('Move selected by 10px')).toBeInTheDocument();
  });

  it('displays navigation shortcuts', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Pan canvas')).toBeInTheDocument();
    expect(screen.getByText('Toggle this panel')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<ShortcutPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close shortcuts panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<ShortcutPanel isOpen={true} onClose={onClose} />);
    const backdrop = container.querySelector('.bg-black\\/40');
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ShortcutPanel isOpen={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('has proper aria attributes for accessibility', () => {
    render(<ShortcutPanel isOpen={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Keyboard shortcuts');
  });
});
