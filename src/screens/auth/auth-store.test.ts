import { describe, it, test, expect, beforeEach, vi } from 'vitest';
import telegram, { type Api } from 'telegram';
import { createTestDatabase } from 'services/database/__mocks__/database';
import type { TelegramConfig } from 'types/telegram';
import { TelegramAuthStore } from './auth-store';
import { MockClient } from '../../api/__mocks__/telegram-client';

const config: TelegramConfig = { apiId: 1, apiHash: 'hash' };

function createStore(session: string | null = null) {
  const client = new MockClient();
  const storage = createTestDatabase();
  vi.spyOn(storage, 'clearSession');
  vi.spyOn(storage, 'clearCache');

  return {
    client,
    storage,
    store: new TelegramAuthStore(config, client, storage, session),
  };
}

function sentCode({
  type = new telegram.Api.auth.SentCodeTypeApp({ length: 5 }),
  phoneCodeHash = 'hash',
  nextType,
}: {
  type?: Api.auth.TypeSentCodeType;
  phoneCodeHash?: string;
  nextType?: Api.auth.TypeCodeType;
} = {}) {
  return new telegram.Api.auth.SentCode({ type, phoneCodeHash, nextType });
}

describe('TelegramAuthStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session', () => {
    test('There is no session', async () => {
      const { store } = createStore(null);
      expect(store.state.get()).toEqual({ type: 'wait_phone' });
    });

    test('init confirms a stored session', async () => {
      const { store, client } = createStore('session');
      store.init();
      expect(client.checkAuthorization).toHaveBeenCalled();
    });

    test('init does not confirm without a session', async () => {
      const { store, client } = createStore(null);
      store.init();
      expect(client.checkAuthorization).not.toHaveBeenCalled();
    });

    test('Authorized', async () => {
      const { store, client } = createStore('session');
      client.checkAuthorization.mockResolvedValueOnce(true);
      await store.checkAuthorization();
      expect(store.state.get()).toEqual({ type: 'ready' });
    });

    test('Is not authorized', async () => {
      const { client, store } = createStore('session');
      client.checkAuthorization.mockResolvedValueOnce(false);
      await store.checkAuthorization();
      expect(store.state.get()).toEqual({ type: 'wait_phone' });
    });

    test('Error during checkAuthorization', async () => {
      const { client, store } = createStore();
      client.checkAuthorization.mockRejectedValueOnce(new Error('Some error'));
      await store.checkAuthorization();
      expect(store.state.get()).toEqual({ type: 'error' });
      expect(client.checkAuthorization).toHaveBeenCalledTimes(1);
    });
  });

  test('sendCode', async () => {
    const { store, client } = createStore();
    const number = '7123456789';
    client.invoke.mockResolvedValueOnce(
      sentCode({ nextType: new telegram.Api.auth.CodeTypeSms() }),
    );
    await store.sendCode(number);
    expect(client.invoke).toHaveBeenCalledWith(
      new telegram.Api.auth.SendCode({
        phoneNumber: number,
        apiId: config.apiId,
        apiHash: config.apiHash,
        settings: new telegram.Api.CodeSettings({}),
      }),
    );
    expect(store.state.get()).toEqual({
      type: 'wait_code',
      codeType: 'app',
      codeLength: 5,
      nextType: 'sms',
      beginning: null,
      fragmentUrl: null,
    });
  });

  test('sendCode without nextType offers no resend', async () => {
    const { store, client } = createStore();
    client.invoke.mockResolvedValueOnce(
      sentCode({ type: new telegram.Api.auth.SentCodeTypeSms({ length: 6 }) }),
    );
    await store.sendCode('7123456789');
    expect(store.state.get()).toEqual({
      type: 'wait_code',
      codeType: 'sms',
      codeLength: 6,
      nextType: null,
      beginning: null,
      fragmentUrl: null,
    });
  });

  test('sendCode with a word code has no length and keeps the beginning', async () => {
    const { store, client } = createStore();
    client.invoke.mockResolvedValueOnce(
      sentCode({ type: new telegram.Api.auth.SentCodeTypeSmsWord({ beginning: 'a' }) }),
    );
    await store.sendCode('7123456789');
    expect(store.state.get()).toEqual({
      type: 'wait_code',
      codeType: 'word',
      codeLength: null,
      nextType: null,
      beginning: 'a',
      fragmentUrl: null,
    });
  });

  test('sendCode with a fragment code keeps the url', async () => {
    const { store, client } = createStore();
    const url = 'https://fragment.com/number/8881234/code';
    client.invoke.mockResolvedValueOnce(
      sentCode({ type: new telegram.Api.auth.SentCodeTypeFragmentSms({ url, length: 6 }) }),
    );
    await store.sendCode('8881234');
    expect(store.state.get()).toEqual({
      type: 'wait_code',
      codeType: 'fragment',
      codeLength: 6,
      nextType: null,
      beginning: null,
      fragmentUrl: url,
    });
  });

  test('signIn', async () => {
    const { store, client, storage } = createStore();
    const number = '7123456789';
    const hash = 'hash';
    client.invoke.mockResolvedValueOnce(sentCode({ phoneCodeHash: hash }));
    const session = 'newSession';
    client.session.save.mockReturnValueOnce(session);
    await store.sendCode(number);
    const code = '123456';
    await store.signIn(code);
    expect(client.invoke).toHaveBeenCalledWith(
      new telegram.Api.auth.SignIn({
        phoneNumber: number,
        phoneCodeHash: hash,
        phoneCode: code,
      }),
    );
    const s = await storage.getSession();
    expect(s).toBe(session);
    expect(store.state.get()).toEqual({ type: 'ready' });
  });

  test('signIn throws sign up error', async () => {
    const { store, client } = createStore();
    const number = '7123456789';
    client.invoke.mockResolvedValueOnce(sentCode());
    client.invoke.mockResolvedValueOnce(
      new (telegram.Api.auth.AuthorizationSignUpRequired as any)(),
    );
    await store.sendCode(number);
    const code = '123456';
    expect(store.signIn(code)).rejects.toThrow(
      'Please create a Telegram account using an official client first',
    );
  });

  describe('two-step verification', () => {
    const passwordNeeded = { errorMessage: 'SESSION_PASSWORD_NEEDED' };

    function accountPassword(hint?: string) {
      return new telegram.Api.account.Password({
        newAlgo: new telegram.Api.PasswordKdfAlgoUnknown(),
        newSecureAlgo: new telegram.Api.SecurePasswordKdfAlgoUnknown(),
        secureRandom: new Uint8Array(0) as never,
        hint,
      });
    }

    beforeEach(() => {
      vi.spyOn(telegram.password, 'computeCheck').mockResolvedValue(
        new telegram.Api.InputCheckPasswordEmpty() as unknown as Api.InputCheckPasswordSRP,
      );
    });

    async function reachPasswordStep(hint?: string) {
      const created = createStore();
      created.client.invoke.mockResolvedValueOnce(sentCode());
      await created.store.sendCode('7123456789');
      created.client.invoke.mockRejectedValueOnce(passwordNeeded);
      created.client.invoke.mockResolvedValueOnce(accountPassword(hint));
      await created.store.signIn('123456');

      return created;
    }

    test('signIn moves to wait_password carrying the hint', async () => {
      const { store } = await reachPasswordStep('my hint');
      expect(store.state.get()).toEqual({ type: 'wait_password', hint: 'my hint' });
    });

    test('a failing hint lookup still reaches wait_password', async () => {
      const { store, client } = createStore();
      client.invoke.mockResolvedValueOnce(sentCode());
      await store.sendCode('7123456789');
      client.invoke.mockRejectedValueOnce(passwordNeeded);
      client.invoke.mockRejectedValueOnce(new Error('offline'));
      await store.signIn('123456');
      expect(store.state.get()).toEqual({ type: 'wait_password', hint: null });
    });

    test('checkPassword signs in via SRP', async () => {
      const { store, client, storage } = await reachPasswordStep();
      client.session.save.mockReturnValueOnce('passwordSession');
      client.invoke.mockResolvedValueOnce(accountPassword());
      client.invoke.mockResolvedValueOnce(new telegram.Api.auth.Authorization({} as never));

      await store.checkPassword('hunter2');

      const calls = client.invoke.mock.calls;
      expect(calls[calls.length - 1][0]).toBeInstanceOf(telegram.Api.auth.CheckPassword);
      expect(telegram.password.computeCheck).toHaveBeenCalledWith(expect.anything(), 'hunter2');
      expect(await storage.getSession()).toBe('passwordSession');
      expect(store.state.get()).toEqual({ type: 'ready' });
    });

    test('checkPassword reports a wrong password', async () => {
      const { store, client } = await reachPasswordStep();
      client.invoke.mockResolvedValueOnce(accountPassword());
      client.invoke.mockRejectedValueOnce({ errorMessage: 'PASSWORD_HASH_INVALID' });

      await expect(store.checkPassword('wrong')).rejects.toThrow('Incorrect password');
      expect(store.state.get()).toEqual({ type: 'wait_password', hint: null });
    });
  });

  test('resendCode escalates to the next type and updates phoneCodeHash', async () => {
    const { store, client } = createStore();
    const phoneNumber = '7123456789';
    const phoneCodeHash = 'hash';
    client.invoke.mockResolvedValueOnce(
      sentCode({ phoneCodeHash, nextType: new telegram.Api.auth.CodeTypeSms() }),
    );
    client.invoke.mockResolvedValueOnce(
      sentCode({
        type: new telegram.Api.auth.SentCodeTypeSms({ length: 5 }),
        phoneCodeHash: 'newHash',
        nextType: new telegram.Api.auth.CodeTypeCall(),
      }),
    );
    await store.sendCode(phoneNumber);
    await store.resendCode();
    expect(client.invoke).toHaveBeenCalledWith(
      new telegram.Api.auth.ResendCode({
        phoneNumber,
        phoneCodeHash,
      }),
    );
    expect(store.state.get()).toEqual({
      type: 'wait_code',
      codeType: 'sms',
      codeLength: 5,
      nextType: 'call',
      beginning: null,
      fragmentUrl: null,
    });
    await store.signIn('123456');
    expect(client.invoke).toHaveBeenCalledWith(
      new telegram.Api.auth.SignIn({
        phoneNumber,
        phoneCodeHash: 'newHash',
        phoneCode: '123456',
      }),
    );
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
      expect(store.state.get()).toEqual({ type: 'error' });
      expect(result).toBeFalsy();
      expect(storage.clearSession).not.toHaveBeenCalled();
      expect(storage.clearCache).not.toHaveBeenCalled();
    });

    it('clears the session and cache and resolves true', async () => {
      const { storage, store } = createStore();

      await expect(store.logout()).resolves.toBe(true);

      expect(storage.clearSession).toHaveBeenCalled();
      expect(storage.clearCache).toHaveBeenCalled();
      expect(store.state.get()).toEqual({ type: 'wait_phone' });
    });
  });
});
