import { describe, it, expect } from 'vitest';
import { parseHash } from 'router';

describe('parseHash', () => {
  it('returns null for empty hash', () => {
    expect(parseHash('')).toBeNull();
  });

  it('returns null for #/auth', () => {
    expect(parseHash('#/auth')).toBeNull();
  });

  it('returns dialogs for #/dialogs', () => {
    expect(parseHash('#/dialogs')).toEqual({ name: 'dialogs', params: {} });
  });

  it('returns dialog with id for #/dialog/1', () => {
    expect(parseHash('#/dialog/1')).toEqual({ name: 'dialog', params: { id: '1' } });
  });

  it('returns dialog with id for #/dialog/42', () => {
    expect(parseHash('#/dialog/42')).toEqual({ name: 'dialog', params: { id: '42' } });
  });

  it('returns null for unknown routes', () => {
    expect(parseHash('#/unknown')).toBeNull();
  });
});
