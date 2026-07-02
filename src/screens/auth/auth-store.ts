import { signal } from '@lit-labs/signals';
import type { TelegramClient } from 'telegram';
import telegram from 'telegram';
import type { TelegramConfig } from 'types/telegram';
import type { Database } from 'services/database';

export type AuthState =
  | 'loading'
  | 'error'
  | 'wait_phone'
  | { type: 'wait_code'; isSmsAvailable: boolean }
  | 'wait_password'
  | 'ready';

export class TelegramAuthStore {
  readonly state = signal<AuthState>('loading');

  private _phoneNumber = '';
  private _phoneCodeHash = '';

  constructor(
    private readonly _config: TelegramConfig,
    private readonly _client: TelegramClient,
    private readonly _storage: Database,
  ) {}

  /**
   * GramJS auto-reconnect doesn't re-send InitConnection, and its built-in
   * CONNECTION_NOT_INITED retry is broken (checks e.message instead of
   * e.errorMessage). This wrapper handles it by reconnecting and retrying.
   */
  private async _invoke<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: unknown) {
      if (
        e &&
        typeof e === 'object' &&
        'errorMessage' in e &&
        (e as Record<string, unknown>).errorMessage === 'CONNECTION_NOT_INITED'
      ) {
        await this._client.disconnect();
        await this._client.connect();

        return await fn();
      }
      throw e;
    }
  }

  async init(): Promise<void> {
    // With a saved session, render from the offline cache immediately and verify
    // connectivity in the background — otherwise a device with no internet lands on
    // 'error' and the cache is never shown, defeating its purpose.
    const hasSession = (await this._storage.getSession()) !== null;

    if (hasSession) {
      this.state.set('ready');
      void this._verifySessionInBackground();

      return;
    }

    // No session: authentication needs the network, so a failure here is terminal.
    try {
      await this._client.connect();
      const authorized = await this._client.checkAuthorization();
      this.state.set(authorized ? 'ready' : 'wait_phone');
    } catch {
      this.state.set('error');
    }
  }

  /**
   * Connects and confirms the saved session is still valid. Only a definitive
   * "not authorized" response downgrades to the phone prompt; a network failure
   * leaves us in the cached 'ready' state (offline mode).
   */
  private async _verifySessionInBackground(): Promise<void> {
    try {
      await this._client.connect();
      const authorized = await this._client.checkAuthorization();
      if (!authorized) this.state.set('wait_phone');
    } catch {
      // Offline or transient failure — keep showing cached data.
    }
  }

  dispose(): void {
    // no-op — GramJS handles cleanup via disconnect
  }

  async sendPhoneNumber(phone: string): Promise<void> {
    this._phoneNumber = phone;

    const { apiId, apiHash } = this._config;
    const { phoneCodeHash, isCodeViaApp } = await this._invoke(() =>
      this._client.sendCode({ apiId, apiHash }, phone),
    );
    this._phoneCodeHash = phoneCodeHash;
    this.state.set({ type: 'wait_code', isSmsAvailable: !isCodeViaApp });
  }

  async sendAuthCode(code: string): Promise<void> {
    try {
      const result = await this._invoke(() =>
        this._client.invoke(
          new telegram.Api.auth.SignIn({
            phoneNumber: this._phoneNumber,
            phoneCodeHash: this._phoneCodeHash,
            phoneCode: code,
          }),
        ),
      );

      if (result instanceof telegram.Api.auth.AuthorizationSignUpRequired) {
        throw new Error('Please create a Telegram account using an official client first');
      }

      const sessionString = this._client.session.save() as unknown as string;
      await this._storage.setSession(sessionString);
      this.state.set('ready');
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorMessage' in e && (e as Record<string, unknown>).errorMessage === 'SESSION_PASSWORD_NEEDED') {
        this.state.set('wait_password');
      } else {
        throw e;
      }
    }
  }

  async resendCodeViaSms(): Promise<void> {
    const result = await this._client.invoke(
      new telegram.Api.auth.ResendCode({
        phoneNumber: this._phoneNumber,
        phoneCodeHash: this._phoneCodeHash,
      }),
    );
    if (result instanceof telegram.Api.auth.SentCode) {
      this._phoneCodeHash = result.phoneCodeHash;
    }
  }

  async logout(): Promise<void> {
    await this._client.invoke(new telegram.Api.auth.LogOut());
    await this._storage.clearSession();
    await this._storage.clearCache();
    this.state.set('wait_phone');
  }
}
