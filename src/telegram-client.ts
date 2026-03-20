// @ts-expect-error — @dibgram/tdweb has no type declarations
import TdWebModule from '@dibgram/tdweb';
const TdClient = TdWebModule.default ?? TdWebModule;
import { AuthState } from './types/telegram';

type AuthChangeCallback = (state: AuthState) => void;

export class TelegramClient {
  private _client: TdClient | null = null;
  private _authState: AuthState = 'loading';
  private _onAuthChange: AuthChangeCallback | null = null;

  get authState(): AuthState {
    return this._authState;
  }

  onAuthStateChange(cb: AuthChangeCallback) {
    this._onAuthChange = cb;
  }

  async init(apiId: number, apiHash: string) {
    this._client = new TdClient({
      instanceName: 'mitto',
      isBackground: false,
      jsLogVerbosityLevel: 'warning',
      logVerbosityLevel: 1,
      onUpdate: (update: Record<string, unknown>) => this._handleUpdate(update),
    });

    await this._send({
      '@type': 'setTdlibParameters',
      api_id: apiId,
      api_hash: apiHash,
      database_directory: '/mitto_db',
      use_message_database: true,
      use_secret_chats: false,
      system_language_code: navigator.language || 'en',
      device_model: 'Mitto E-Ink',
      application_version: '0.1.0',
    });
  }

  async sendPhoneNumber(phone: string) {
    await this._send({
      '@type': 'setAuthenticationPhoneNumber',
      phone_number: phone,
    });
  }

  async sendAuthCode(code: string) {
    await this._send({
      '@type': 'checkAuthenticationCode',
      code,
    });
  }

  async sendPassword(password: string) {
    await this._send({
      '@type': 'checkAuthenticationPassword',
      password,
    });
  }

  private _setAuthState(state: AuthState) {
    this._authState = state;
    this._onAuthChange?.(state);
  }

  private _handleUpdate(update: Record<string, unknown>) {
    if (update['@type'] !== 'updateAuthorizationState') return;

    const authState = update.authorization_state as Record<string, unknown>;
    switch (authState['@type']) {
      case 'authorizationStateWaitPhoneNumber':
        this._setAuthState('wait_phone');
        break;
      case 'authorizationStateWaitCode':
        this._setAuthState('wait_code');
        break;
      case 'authorizationStateWaitPassword':
        this._setAuthState('wait_password');
        break;
      case 'authorizationStateReady':
        this._setAuthState('ready');
        break;
    }
  }

  private _send(query: Record<string, unknown>): Promise<unknown> {
    if (!this._client) throw new Error('TDLib client not initialized');
    return this._client.send(query) as Promise<unknown>;
  }
}

export const telegramClient = new TelegramClient();
