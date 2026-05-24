export interface RecentFileEntry {
  id: string;
  fileName: string;
  fileSize: number;
  lastOpenedAt: number;
  operationRoute: string;
  operationName: string;
}

export interface RecentFilesState {
  entries: RecentFileEntry[];
  maxEntries: number; // 20

  addEntry: (file: File, operationRoute: string, operationName: string) => void;
  removeEntry: (id: string) => void;
  clearAll: () => void;
  getEntries: () => RecentFileEntry[];
}
