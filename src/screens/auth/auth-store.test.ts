import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import telegram, { type TelegramClient } from 'telegram';
import { createTestDatabase } from 'services/database/__mocks__/database';
import type { TelegramConfig } from 'types/telegram';
import { TelegramAuthStore } from './auth-store';
import { MockClient } from '../../api/__mocks__/telegram-client';

const config: TelegramConfig = { apiId: 1, apiHash: 'hash' };

function createStore() {
  const client = new MockClient();
  const storage = createTestDatabase();
  vi.spyOn(storage, 'clearSession');
  vi.spyOn(storage, 'clearCache');

  return {
    client,
    storage,
    store: new TelegramAuthStore(config, client as unknown as TelegramClient, storage),
  };
}

describe('TelegramAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('init', () => {
    test('Session exists', async () => {
      const { client, storage, store } = createStore();
      await storage.setSession('session');
      client.checkAuthorization.mockResolvedValueOnce(true);

      await store.init();

      expect(store.state.get()).toBe('ready');
      expect(client.checkAuthorization).not.toHaveBeenCalled();

      await vi.waitFor(() => expect(client.checkAuthorization).toHaveBeenCalledTimes(1));
      expect(store.state.get()).toBe('ready');
    });

    test("Session doesn't exist and there is no authorization", async () => {
      const { client, store } = createStore();
      client.checkAuthorization.mockResolvedValueOnce(false);

      await store.init();

      expect(store.state.get()).toBe('wait_phone');
      expect(client.checkAuthorization).toHaveBeenCalledTimes(1);
    });

    test("Session doesn't exist and there is authorization", async () => {
      const { client, store } = createStore();
      client.checkAuthorization.mockResolvedValueOnce(true);

      await store.init();

      expect(store.state.get()).toBe('ready');
      expect(client.checkAuthorization).toHaveBeenCalledTimes(1);
    });

    test('Error during checkAuthorization', async () => {
      const { client, store } = createStore();
      client.checkAuthorization.mockRejectedValueOnce(new Error('Some error'));

      await store.init();

      expect(store.state.get()).toBe('error');
      expect(client.checkAuthorization).toHaveBeenCalledTimes(1);
    });
  });

  test('sendPhoneNumber', async () => {
    const { store, client } = createStore();
    const number = '7123456789';
    client.sendCode.mockResolvedValueOnce({
      phoneCodeHash: 'hash',
      isCodeViaApp: true,
    });
    await store.sendPhoneNumber(number);
    expect(client.sendCode).toHaveBeenCalledWith(config, number);
    expect(store.state.get()).toEqual({
      type: 'wait_code',
      isSmsAvailable: false,
    });
  });

  describe('logout', () => {
    it('revokes the authorization server-side', async () => {
      const { client, store } = createStore();

      await store.logout();

      expect(client.invoke).toHaveBeenCalledTimes(1);
      expect(client.invoke).toHaveBeenCalledWith(new telegram.Api.auth.LogOut());
    });

    it('switches to error state in case of error', async () => {
      const { client, store, storage } = createStore();

      client.invoke.mockRejectedValueOnce(new Error());
      const result = await store.logout();
      expect(store.state.get()).toBe('error');
      expect(result).toBeFalsy();
      expect(storage.clearSession).not.toHaveBeenCalled();
      expect(storage.clearCache).not.toHaveBeenCalled();
    });

    it('clears the session and cache and resolves true', async () => {
      const { storage, store } = createStore();

      await expect(store.logout()).resolves.toBe(true);

      expect(storage.clearSession).toHaveBeenCalled();
      expect(storage.clearCache).toHaveBeenCalled();
      expect(store.state.get()).toBe('wait_phone');
    });
  });
});
