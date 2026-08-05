import { describe, expect, test } from 'vitest';
import { formatFileSize } from './format-file-size';

describe('formatFileSize', () => {
  test('formats bytes', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  test('formats kilobytes', () => {
    expect(formatFileSize(240640)).toBe('235 KB');
  });

  test('formats megabytes with one decimal', () => {
    expect(formatFileSize(1468006)).toBe('1.4 MB');
  });

  test('returns an empty string without a size', () => {
    expect(formatFileSize(undefined)).toBe('');
    expect(formatFileSize(0)).toBe('');
  });
});
