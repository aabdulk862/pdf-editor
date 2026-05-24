import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OcrResultsPanel } from './OcrResultsPanel';
import type { OcrProcessingResult } from '../../../core/ocr-engine/types';
import { useToastStore } from '../../../store/toast';

function makeResults(overrides: Partial<OcrProcessingResult> = {}): OcrProcessingResult {
  return {
    pages: [],
    failedPages: [],
    totalPagesProcessed: 5,
    totalPagesFailed: 0,
    averageConfidence: 92.5,
    totalProcessingTimeMs: 12000,
    ...overrides,
  };
}

describe('OcrResultsPanel', () => {
  beforeEach(() => {
    useToastStore.getState().toasts.forEach((t) => {
      useToastStore.getState().removeToast(t.id);
    });
  });

  it('displays total pages processed', () => {
    render(<OcrResultsPanel results={makeResults()} onGenerateSearchablePdf={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays failed page count', () => {
    render(
      <OcrResultsPanel
        results={makeResults({ totalPagesFailed: 2 })}
        onGenerateSearchablePdf={vi.fn()}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays average confidence as a rounded percentage', () => {
    render(
      <OcrResultsPanel
        results={makeResults({ averageConfidence: 87.3 })}
        onGenerateSearchablePdf={vi.fn()}
      />,
    );
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('displays dash when average confidence is null (all pages failed)', () => {
    render(
      <OcrResultsPanel
        results={makeResults({
          averageConfidence: null,
          totalPagesProcessed: 0,
          totalPagesFailed: 3,
        })}
        onGenerateSearchablePdf={vi.fn()}
      />,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows per-page failure details when there are failed pages', () => {
    const results = makeResults({
      totalPagesFailed: 2,
      failedPages: [
        { pageNumber: 3, error: 'Render timeout' },
        { pageNumber: 7, error: 'Worker crashed' },
      ],
    });
    render(<OcrResultsPanel results={results} onGenerateSearchablePdf={vi.fn()} />);

    expect(screen.getByText('Page 3: Render timeout')).toBeInTheDocument();
    expect(screen.getByText('Page 7: Worker crashed')).toBeInTheDocument();
  });

  it('does not show failure details section when no pages failed', () => {
    render(<OcrResultsPanel results={makeResults()} onGenerateSearchablePdf={vi.fn()} />);
    expect(screen.queryByText('Page failures:')).not.toBeInTheDocument();
  });

  it('calls onGenerateSearchablePdf when button is clicked', () => {
    const onGenerate = vi.fn();
    render(<OcrResultsPanel results={makeResults()} onGenerateSearchablePdf={onGenerate} />);

    fireEvent.click(screen.getByRole('button', { name: /generate searchable pdf/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it('disables the generate button when no pages were processed', () => {
    render(
      <OcrResultsPanel
        results={makeResults({ totalPagesProcessed: 0 })}
        onGenerateSearchablePdf={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /generate searchable pdf/i })).toBeDisabled();
  });

  it('shows a warning toast when size increase exceeds 20%', () => {
    render(
      <OcrResultsPanel
        results={makeResults()}
        onGenerateSearchablePdf={vi.fn()}
        sizeIncrease={35}
      />,
    );

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].severity).toBe('warning');
    expect(toasts[0].message).toContain('35%');
  });

  it('does not show a toast when size increase is 20% or less', () => {
    render(
      <OcrResultsPanel
        results={makeResults()}
        onGenerateSearchablePdf={vi.fn()}
        sizeIncrease={20}
      />,
    );

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(0);
  });

  it('does not show a toast when sizeIncrease is not provided', () => {
    render(<OcrResultsPanel results={makeResults()} onGenerateSearchablePdf={vi.fn()} />);

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(0);
  });
});
