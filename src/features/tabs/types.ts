export interface DocumentTab {
  id: string;
  fileName: string;
  fileData: ArrayBuffer;
  fileSize: number;
  operationRoute: string;
  operationState: Record<string, unknown>;
  createdAt: number;
}

export interface TabManagerState {
  tabs: DocumentTab[];
  activeTabId: string | null;
  clipboard: ClipboardData | null;
  maxTabs: number; // 10

  // Tab lifecycle
  openTab: (file: File, operationRoute: string) => boolean;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  cycleTab: (direction: 'next' | 'prev') => void;

  // Tab state
  updateTabState: (tabId: string, state: Record<string, unknown>) => void;
  getActiveTab: () => DocumentTab | null;

  // Clipboard
  copyPages: (pages: PageData[]) => void;
  pastePages: (targetTabId: string, afterPageIndex: number | null) => void;
}

export interface PageData {
  index: number;
  data: ArrayBuffer;
  width: number;
  height: number;
}

export interface ClipboardData {
  pages: PageData[];
  sourceTabId: string;
  copiedAt: number;
}
