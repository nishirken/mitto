import {signal} from '@lit-labs/signals';
import type { ApiClient } from 'api/api-client';
import { TelegramConfig } from 'types/telegram';

export type AuthState = 
  | 'loading'
  | 'error'
  | 'wait_phone'
  | { type: 'wait_code'; isSmsAvailable: boolean; }
  | 'wait_password'
  | 'ready';

// https://core.telegram.org/tdlib/getting-started#user-authorization
export class TelegramAuthStore {
  readonly state = signal<AuthState>('loading');

  constructor(private readonly _config: TelegramConfig, private readonly _client: ApiClient) {
  }

  init(): void {
    this._client.addEventListener('updateAuthorizationState', this._handleUpdateAuthorizationState);
  }

  dispose(): void {
    this._client.removeEventListener('updateAuthorizationState', this._handleUpdateAuthorizationState);
  }

  private readonly _handleUpdateAuthorizationState = async (ev: Record<string, unknown>): Promise<void> => {
      if (typeof ev !== 'object' || typeof ev.authorization_state !== 'object') {
        this.state.set('error');

        return;
      }
      const authState = ev.authorization_state as Record<string, unknown>;

      if (!authState || !('@type' in authState) || typeof authState['@type'] !== 'string') {
        this.state.set('error');

        return;
      }
      const type = authState['@type'];

      switch (type) {
        case 'authorizationStateWaitTdlibParameters': {
          const { apiId, apiHash } = this._config;

          const res = await this._client.send({
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

          if (!res) {
            this.state.set('error');
          }

          break;
        }
        case 'authorizationStateWaitPhoneNumber':
          this.state.set('wait_phone');
          break;
        case 'authorizationStateWaitCode': {
          const smsAvailable = (): boolean => {
            if ('code_info' in authState && authState['next_type']) {
              return !!authState['next_type'];
            }

            return false;
          };
          this.state.set({ type: 'wait_code', isSmsAvailable: smsAvailable() });
          break;
        }
        case 'authorizationStateWaitPassword':
          this.state.set('wait_password');
          break;
        case 'authorizationStateReady':
          this.state.set('ready');
          break;
      }
    };

  async sendPhoneNumber(phone: string) {
    await this._client.send({ '@type': 'setAuthenticationPhoneNumber', phone_number: phone });
  }

  async sendAuthCode(code: string) {
    await this._client.send({ '@type': 'checkAuthenticationCode', code });
  }

  async resendCodeViaSms() {
    await this._client.send({ '@type': 'resendAuthenticationCode' });
  }
}
