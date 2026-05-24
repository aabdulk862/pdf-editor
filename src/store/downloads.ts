import { create } from 'zustand';

export interface DownloadEntry {
  id: string;
  fileName: string;
  operation: string;
  timestamp: number;
  fileData: ArrayBuffer;
  fileSize: number;
}

const MAX_DOWNLOADS = 50;

interface DownloadHistoryState {
  downloads: DownloadEntry[];
  addDownload: (entry: DownloadEntry) => void;
  clearDownloads: () => void;
  reDownload: (id: string) => void;
}

export const useDownloadStore = create<DownloadHistoryState>((set, get) => ({
  downloads: [],

  addDownload: (entry: DownloadEntry) => {
    set((state) => {
      const updated = [...state.downloads, entry];
      if (updated.length > MAX_DOWNLOADS) {
        return { downloads: updated.slice(updated.length - MAX_DOWNLOADS) };
      }
      return { downloads: updated };
    });
  },

  clearDownloads: () => {
    set({ downloads: [] });
  },

  reDownload: (id: string) => {
    const { downloads } = get();
    const entry = downloads.find((d) => d.id === id);
    if (!entry) return;

    const blob = new Blob([entry.fileData], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = entry.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
}));
