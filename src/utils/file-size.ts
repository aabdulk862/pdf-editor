export interface FileSizeDisplay {
  original: string;
  modified: string;
  percentChange: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function calculatePercentChange(original: number, modified: number): string {
  if (original === modified) return '0.0%';
  const change = ((modified - original) / original) * 100;
  const prefix = change > 0 ? '+' : '\u2212';
  return `${prefix}${Math.abs(change).toFixed(1)}%`;
}
