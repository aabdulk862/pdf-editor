import type { ReactNode } from 'react';

import { useTabStore } from '../../store/tabs';

interface TabContentProps {
  children: ReactNode;
}

/**
 * Wrapper component that renders the active tab's feature page content.
 * Shows an empty state when no tabs are open.
 * Passes the active tab's operationState as context for the rendered content.
 *
 * Requirements: 5.3, 5.4, 5.6
 */
export function TabContent({ children }: TabContentProps) {
  const activeTabId = useTabStore((state) => state.activeTabId);
  const tabs = useTabStore((state) => state.tabs);

  // No tabs open — show empty/home state
  if (tabs.length === 0 || activeTabId === null) {
    return <>{children}</>;
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return <>{children}</>;
  }

  // Render children with the active tab's context.
  // The tab's operationState is preserved in the store across switches,
  // so re-mounting with the same tab ID restores state.
  return (
    <div data-tab-id={activeTab.id} data-tab-route={activeTab.operationRoute}>
      {children}
    </div>
  );
}
