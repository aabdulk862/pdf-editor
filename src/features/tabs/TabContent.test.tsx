import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';

import { useTabStore } from '../../store/tabs';
import { TabContent } from './TabContent';

function resetTabStore() {
  useTabStore.setState({
    tabs: [],
    activeTabId: null,
    clipboard: null,
    maxTabs: 10,
  });
}

function createMockTab(id: string, fileName: string, route: string = '/compress') {
  return {
    id,
    fileName,
    fileData: new ArrayBuffer(0),
    fileSize: 1024,
    operationRoute: route,
    operationState: { someKey: 'someValue' },
    createdAt: Date.now(),
  };
}

describe('TabContent', () => {
  beforeEach(() => {
    resetTabStore();
  });

  it('renders children directly when no tabs are open', () => {
    render(
      <TabContent>
        <div data-testid="home-content">Home Page</div>
      </TabContent>,
    );

    expect(screen.getByTestId('home-content')).toBeInTheDocument();
    expect(screen.getByText('Home Page')).toBeInTheDocument();
  });

  it('renders children when activeTabId is null', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    useTabStore.setState({ tabs: [tab1], activeTabId: null });

    render(
      <TabContent>
        <div data-testid="default-content">Default</div>
      </TabContent>,
    );

    expect(screen.getByTestId('default-content')).toBeInTheDocument();
  });

  it('wraps children with tab context when active tab exists', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf', '/merge');
    useTabStore.setState({ tabs: [tab1], activeTabId: 'tab-1' });

    render(
      <TabContent>
        <div data-testid="feature-page">Feature Content</div>
      </TabContent>,
    );

    expect(screen.getByTestId('feature-page')).toBeInTheDocument();
    const wrapper = screen.getByTestId('feature-page').parentElement;
    expect(wrapper).toHaveAttribute('data-tab-id', 'tab-1');
    expect(wrapper).toHaveAttribute('data-tab-route', '/merge');
  });

  it('renders children when active tab is not found in tabs array', () => {
    const tab1 = createMockTab('tab-1', 'document.pdf');
    useTabStore.setState({ tabs: [tab1], activeTabId: 'non-existent' });

    render(
      <TabContent>
        <div data-testid="fallback">Fallback</div>
      </TabContent>,
    );

    expect(screen.getByTestId('fallback')).toBeInTheDocument();
  });

  it('updates wrapper when switching active tab', () => {
    const tab1 = createMockTab('tab-1', 'first.pdf', '/compress');
    const tab2 = createMockTab('tab-2', 'second.pdf', '/merge');
    useTabStore.setState({ tabs: [tab1, tab2], activeTabId: 'tab-1' });

    const { rerender } = render(
      <TabContent>
        <div data-testid="content">Content</div>
      </TabContent>,
    );

    let wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).toHaveAttribute('data-tab-id', 'tab-1');
    expect(wrapper).toHaveAttribute('data-tab-route', '/compress');

    // Switch to tab-2
    act(() => {
      useTabStore.setState({ activeTabId: 'tab-2' });
    });

    rerender(
      <TabContent>
        <div data-testid="content">Content</div>
      </TabContent>,
    );

    wrapper = screen.getByTestId('content').parentElement;
    expect(wrapper).toHaveAttribute('data-tab-id', 'tab-2');
    expect(wrapper).toHaveAttribute('data-tab-route', '/merge');
  });
});
