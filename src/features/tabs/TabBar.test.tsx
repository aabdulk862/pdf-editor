import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useTabStore } from '../../store/tabs';
import { TabBar } from './TabBar';

function resetTabStore() {
  useTabStore.setState({
    tabs: [],
    activeTabId: null,
    clipboard: null,
    maxTabs: 10,
  });
}

function createMockTab(id: string, fileName: string) {
  return {
    id,
    fileName,
    fileData: new ArrayBuffer(0),
    fileSize: 1024,
    operationRoute: '/compress',
    operationState: {},
    createdAt: Date.now(),
  };
}

describe('TabBar', () => {
  beforeEach(() => {
    resetTabStore();
  });

  it('renders nothing when no tabs are open', () => {
    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it('renders tabs with file names', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    const tab2 = createMockTab('tab-2', 'report.pdf');
    useTabStore.setState({ tabs: [tab1, tab2], activeTabId: 'tab-1' });

    render(<TabBar />);

    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
  });

  it('visually distinguishes the active tab', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    const tab2 = createMockTab('tab-2', 'report.pdf');
    useTabStore.setState({ tabs: [tab1, tab2], activeTabId: 'tab-1' });

    render(<TabBar />);

    const activeTab = screen.getByRole('tab', { name: 'Tab: document.pdf' });
    const inactiveTab = screen.getByRole('tab', { name: 'Tab: report.pdf' });

    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
  });

  it('switches tab on click', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    const tab2 = createMockTab('tab-2', 'report.pdf');
    useTabStore.setState({ tabs: [tab1, tab2], activeTabId: 'tab-1' });

    render(<TabBar />);

    fireEvent.click(screen.getByRole('tab', { name: 'Tab: report.pdf' }));

    expect(useTabStore.getState().activeTabId).toBe('tab-2');
  });

  it('closes tab on close button click without switching active tab', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    const tab2 = createMockTab('tab-2', 'report.pdf');
    useTabStore.setState({ tabs: [tab1, tab2], activeTabId: 'tab-1' });

    render(<TabBar />);

    const closeButton = screen.getByRole('button', { name: 'Close tab: report.pdf' });
    fireEvent.click(closeButton);

    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].id).toBe('tab-1');
    expect(state.activeTabId).toBe('tab-1');
  });

  it('closes active tab and switches to left neighbor', () => {
    const tab1 = createMockTab('tab-1', 'first.pdf');
    const tab2 = createMockTab('tab-2', 'second.pdf');
    const tab3 = createMockTab('tab-3', 'third.pdf');
    useTabStore.setState({ tabs: [tab1, tab2, tab3], activeTabId: 'tab-2' });

    render(<TabBar />);

    const closeButton = screen.getByRole('button', { name: 'Close tab: second.pdf' });
    fireEvent.click(closeButton);

    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe('tab-1');
  });

  it('cycles to next tab on Ctrl+Tab', () => {
    const tab1 = createMockTab('tab-1', 'first.pdf');
    const tab2 = createMockTab('tab-2', 'second.pdf');
    const tab3 = createMockTab('tab-3', 'third.pdf');
    useTabStore.setState({ tabs: [tab1, tab2, tab3], activeTabId: 'tab-1' });

    render(<TabBar />);

    fireEvent.keyDown(document, { key: 'Tab', ctrlKey: true });

    expect(useTabStore.getState().activeTabId).toBe('tab-2');
  });

  it('cycles to previous tab on Ctrl+Shift+Tab', () => {
    const tab1 = createMockTab('tab-1', 'first.pdf');
    const tab2 = createMockTab('tab-2', 'second.pdf');
    const tab3 = createMockTab('tab-3', 'third.pdf');
    useTabStore.setState({ tabs: [tab1, tab2, tab3], activeTabId: 'tab-1' });

    render(<TabBar />);

    fireEvent.keyDown(document, { key: 'Tab', ctrlKey: true, shiftKey: true });

    expect(useTabStore.getState().activeTabId).toBe('tab-3');
  });

  it('has proper ARIA tablist role', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    useTabStore.setState({ tabs: [tab1], activeTabId: 'tab-1' });

    render(<TabBar />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
