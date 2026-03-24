import { describe, it, expect } from 'vitest';
import { parseHash } from 'router';

describe('parseHash', () => {
  it('returns null for empty hash', () => {
    expect(parseHash('')).toBeNull();
  });

  it('returns null for #/auth', () => {
    expect(parseHash('#/auth')).toBeNull();
  });

  it('returns chats for #/chats', () => {
    expect(parseHash('#/chats')).toEqual({ name: 'chats', params: {} });
  });

  it('returns chat with id for #/chat/1', () => {
    expect(parseHash('#/chat/1')).toEqual({ name: 'chat', params: { id: '1' } });
  });

  it('returns chat with id for #/chat/42', () => {
    expect(parseHash('#/chat/42')).toEqual({ name: 'chat', params: { id: '42' } });
  });

  it('returns null for unknown routes', () => {
    expect(parseHash('#/unknown')).toBeNull();
  });
});
