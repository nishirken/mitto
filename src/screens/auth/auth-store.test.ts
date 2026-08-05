import { describe, it, expect, beforeEach, vi } from 'vitest';
import telegram from 'telegram';
import type { TelegramClient } from 'telegram';
import type { Database } from 'services/database';
import type { TelegramConfig } from 'types/telegram';
import { TelegramAuthStore } from './auth-store';

const config: TelegramConfig = { apiId: 1, apiHash: 'hash' };

function createStore() {
  const client = {
    connect: vi.fn(async () => true),
    disconnect: vi.fn(async () => {}),
    invoke: vi.fn(async () => undefined),
    checkAuthorization: vi.fn(async () => true),
  } as unknown as TelegramClient;

  const storage = {
    getSession: vi.fn(async () => null),
    clearSession: vi.fn(async () => {}),
    clearCache: vi.fn(async () => {}),
  } as unknown as Database;

  return { client, storage, store: new TelegramAuthStore(config, client, storage) };
}

describe('TelegramAuthStore.logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes the authorization server-side', async () => {
    const { client, store } = createStore();

    await store.logout();

    expect(client.invoke).toHaveBeenCalledTimes(1);
    expect(vi.mocked(client.invoke).mock.calls[0][0]).toBeInstanceOf(telegram.Api.auth.LogOut);
  });

  it('clears the session and cache and resolves true', async () => {
    const { storage, store } = createStore();

    await expect(store.logout()).resolves.toBe(true);

    expect(storage.clearSession).toHaveBeenCalled();
    expect(storage.clearCache).toHaveBeenCalled();
    expect(store.state.get()).toBe('wait_phone');
  });

  it('keeps everything on failure and surfaces the error state', async () => {
    const { client, storage, store } = createStore();
    vi.mocked(client.invoke).mockRejectedValue(new Error('offline'));

    await expect(store.logout()).resolves.toBe(false);

    expect(store.state.get()).toBe('error');
    expect(storage.clearSession).not.toHaveBeenCalled();
    expect(storage.clearCache).not.toHaveBeenCalled();
  });

  it('retries once through the CONNECTION_NOT_INITED reconnect path', async () => {
    const { client, store } = createStore();
    vi.mocked(client.invoke)
      .mockRejectedValueOnce({ errorMessage: 'CONNECTION_NOT_INITED' })
      .mockResolvedValueOnce(undefined);

    await expect(store.logout()).resolves.toBe(true);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.invoke).toHaveBeenCalledTimes(2);
  });
});
