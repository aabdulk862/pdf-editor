export interface Operation {
  id: string;
  type: string;
  timestamp: number;
  previousState: ArrayBuffer;
  currentState: ArrayBuffer;
  description: string;
}

export interface DownloadEntry {
  id: string;
  fileName: string;
  operation: string;
  timestamp: number;
  fileData: ArrayBuffer;
  fileSize: number;
}

export interface AppState {
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Operation History (Undo/Redo)
  undoStack: Operation[];
  redoStack: Operation[];
  pushOperation: (op: Operation) => void;
  undo: () => Operation | undefined;
  redo: () => Operation | undefined;
  canUndo: boolean;
  canRedo: boolean;

  // Download History
  downloads: DownloadEntry[];
  addDownload: (entry: DownloadEntry) => void;
  clearDownloads: () => void;
}
