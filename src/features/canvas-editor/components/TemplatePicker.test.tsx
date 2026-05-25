import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useCanvasStore } from '../store/canvas-store';
import { getAllTemplates } from '../templates';

import { TemplatePicker } from './TemplatePicker';

// Mock HTMLDialogElement methods not available in jsdom
// Also set the `open` attribute so content is accessible
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });

  // Reset store state
  useCanvasStore.setState({
    document: null,
    selection: { selectedIds: [], selectionBounds: null, activeHandle: null },
  });
});

describe('TemplatePicker', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TemplatePicker isOpen={false} onClose={vi.fn()} />);
    expect(container.querySelector('dialog')).not.toBeInTheDocument();
  });

  it('renders the dialog when isOpen is true', () => {
    render(<TemplatePicker isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Choose a Template')).toBeInTheDocument();
  });

  it('displays all templates from the registry', () => {
    render(<TemplatePicker isOpen={true} onClose={vi.fn()} />);
    const templates = getAllTemplates();
    for (const template of templates) {
      expect(
        screen.getByRole('button', { name: `Use ${template.name} template` }),
      ).toBeInTheDocument();
    }
  });

  it('displays category filter tabs', () => {
    render(<TemplatePicker isOpen={true} onClose={vi.fn()} />);
    // Category tabs use aria-pressed attribute
    const tabs = screen.getAllByRole('button', { pressed: false });
    const tabLabels = tabs.map((t) => t.textContent);
    expect(tabLabels).toContain('Invoice');
    expect(tabLabels).toContain('Resume');
    expect(tabLabels).toContain('Letter');
    expect(tabLabels).toContain('Presentation');
    // "All" tab is pressed by default
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('All');
  });

  it('filters templates when a category tab is clicked', () => {
    render(<TemplatePicker isOpen={true} onClose={vi.fn()} />);

    // Click the Invoice category tab (use aria-pressed to target the tab specifically)
    const invoiceTab = screen
      .getAllByRole('button', { pressed: false })
      .find((btn) => btn.textContent === 'Invoice')!;
    fireEvent.click(invoiceTab);

    // Invoice template should be visible
    expect(screen.getByRole('button', { name: 'Use Invoice template' })).toBeInTheDocument();

    // Resume template should not be visible
    expect(screen.queryByRole('button', { name: 'Use Resume template' })).not.toBeInTheDocument();
  });

  it('shows all templates when "All" category is selected', () => {
    render(<TemplatePicker isOpen={true} onClose={vi.fn()} />);

    // First filter to a specific category
    const invoiceTab = screen
      .getAllByRole('button', { pressed: false })
      .find((btn) => btn.textContent === 'Invoice')!;
    fireEvent.click(invoiceTab);

    // Then go back to All
    const allTab = screen
      .getAllByRole('button', { pressed: false })
      .find((btn) => btn.textContent === 'All')!;
    fireEvent.click(allTab);

    const templates = getAllTemplates();
    for (const template of templates) {
      expect(
        screen.getByRole('button', { name: `Use ${template.name} template` }),
      ).toBeInTheDocument();
    }
  });

  it('creates an independent document copy when a template is selected', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    render(<TemplatePicker isOpen={true} onClose={onClose} onSelect={onSelect} />);

    // Click the Invoice template
    fireEvent.click(screen.getByRole('button', { name: 'Use Invoice template' }));

    // Document should be loaded in the store
    const state = useCanvasStore.getState();
    expect(state.document).not.toBeNull();
    expect(state.document!.name).toBe('Invoice');
    expect(state.document!.pages.length).toBeGreaterThan(0);

    // onSelect and onClose should be called
    expect(onSelect).toHaveBeenCalledWith('template-invoice');
    expect(onClose).toHaveBeenCalled();
  });

  it('creates a document with new unique IDs (independent copy)', () => {
    const onClose = vi.fn();
    render(<TemplatePicker isOpen={true} onClose={onClose} />);

    // Select the invoice template
    fireEvent.click(screen.getByRole('button', { name: 'Use Invoice template' }));

    const state = useCanvasStore.getState();
    const doc = state.document!;

    // IDs should not match the template's original IDs
    expect(doc.id).not.toBe('template-invoice');
    expect(doc.pages[0].id).not.toBe('invoice-page-1');

    // Elements should have new IDs too
    for (const el of doc.pages[0].elements) {
      expect(el.id).not.toMatch(/^inv-/);
    }
  });

  it('template document is independent from original (no shared references)', () => {
    const onClose = vi.fn();
    render(<TemplatePicker isOpen={true} onClose={onClose} />);

    // Select the invoice template
    fireEvent.click(screen.getByRole('button', { name: 'Use Invoice template' }));

    // Get the original template
    const templates = getAllTemplates();
    const invoiceTemplate = templates.find((t) => t.id === 'template-invoice')!;

    // The document in the store should have different page IDs than the template
    const doc = useCanvasStore.getState().document!;
    expect(doc.pages[0].id).not.toBe(invoiceTemplate.pages[0].id);

    // Element IDs should also be different
    const templateElementIds = invoiceTemplate.pages[0].elements.map((e) => e.id);
    const docElementIds = doc.pages[0].elements.map((e) => e.id);
    for (const docElId of docElementIds) {
      expect(templateElementIds).not.toContain(docElId);
    }

    // The template's original data should remain unchanged
    expect(invoiceTemplate.pages[0].backgroundColor).toBe('#FFFFFF');
    expect(invoiceTemplate.pages[0].elements.length).toBeGreaterThan(0);
  });

  it('displays thumbnail images with minimum 120x160px dimensions', () => {
    const { container } = render(<TemplatePicker isOpen={true} onClose={vi.fn()} />);

    const thumbnails = container.querySelectorAll('img');
    expect(thumbnails.length).toBeGreaterThan(0);
    for (const img of thumbnails) {
      expect(img.className).toContain('h-[160px]');
      expect(img.className).toContain('w-[120px]');
    }
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<TemplatePicker isOpen={true} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close template picker' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
