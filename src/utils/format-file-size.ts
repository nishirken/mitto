const KB = 1024;
const MB = KB * 1024;

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes < 0) return '';
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / KB)} KB`;

  return `${(bytes / MB).toFixed(1)} MB`;
}
