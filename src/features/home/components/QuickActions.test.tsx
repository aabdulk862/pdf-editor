import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuickActions, getQuickActionTools } from './QuickActions';
import { useNavStore } from '../../navigation/store/nav-store';

// Mock useReducedMotion
vi.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

describe('getQuickActionTools', () => {
  it('returns default tools when usage counts are empty', () => {
    const result = getQuickActionTools({}, 4);
    expect(result).toHaveLength(4);
    expect(result[0].path).toBe('/merge');
    expect(result[1].path).toBe('/compress');
    expect(result[2].path).toBe('/split');
    expect(result[3].path).toBe('/image-to-pdf');
  });

  it('returns top 4 tools sorted by usage count descending', () => {
    const usageCounts = {
      '/rotate': 10,
      '/merge': 5,
      '/compress': 20,
      '/split': 15,
      '/watermarks': 3,
    };
    const result = getQuickActionTools(usageCounts, 4);
    expect(result).toHaveLength(4);
    expect(result[0].path).toBe('/compress');
    expect(result[1].path).toBe('/split');
    expect(result[2].path).toBe('/rotate');
    expect(result[3].path).toBe('/merge');
  });

  it('fills with defaults when fewer tools have usage data than requested', () => {
    const usageCounts = {
      '/rotate': 5,
      '/watermarks': 3,
    };
    const result = getQuickActionTools(usageCounts, 4);
    expect(result).toHaveLength(4);
    expect(result[0].path).toBe('/rotate');
    expect(result[1].path).toBe('/watermarks');
    // Remaining filled from defaults
    expect(result[2].path).toBe('/merge');
    expect(result[3].path).toBe('/compress');
  });

  it('ignores tools with zero usage count', () => {
    const usageCounts = {
      '/rotate': 0,
      '/merge': 5,
      '/compress': 0,
    };
    const result = getQuickActionTools(usageCounts, 4);
    expect(result[0].path).toBe('/merge');
    // Rest filled from defaults (excluding /merge which is already included)
    expect(result).toHaveLength(4);
  });

  it('does not duplicate tools when filling with defaults', () => {
    const usageCounts = {
      '/merge': 10,
      '/compress': 5,
    };
    const result = getQuickActionTools(usageCounts, 4);
    const paths = result.map((t) => t.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });
});

describe('QuickActions', () => {
  beforeEach(() => {
    useNavStore.setState({ usageCounts: {} });
  });

  it('renders the Quick Actions heading', () => {
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>,
    );
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders 4 tool cards', () => {
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  it('renders default tools when no usage data exists', () => {
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>,
    );
    expect(screen.getByText('Merge')).toBeInTheDocument();
    expect(screen.getByText('Compress')).toBeInTheDocument();
    expect(screen.getByText('Split')).toBeInTheDocument();
    expect(screen.getByText('Image to PDF')).toBeInTheDocument();
  });

  it('renders tools based on usage data', () => {
    useNavStore.setState({
      usageCounts: {
        '/rotate': 20,
        '/watermarks': 15,
        '/password-protect': 10,
        '/extract-text': 5,
      },
    });

    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>,
    );
    expect(screen.getByText('Rotate')).toBeInTheDocument();
    expect(screen.getByText('Watermarks')).toBeInTheDocument();
    expect(screen.getByText('Password Protect')).toBeInTheDocument();
    expect(screen.getByText('Extract Text')).toBeInTheDocument();
  });

  it('links to the correct tool routes', () => {
    render(
      <MemoryRouter>
        <QuickActions />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/merge');
    expect(links[1]).toHaveAttribute('href', '/compress');
    expect(links[2]).toHaveAttribute('href', '/split');
    expect(links[3]).toHaveAttribute('href', '/image-to-pdf');
  });
});
