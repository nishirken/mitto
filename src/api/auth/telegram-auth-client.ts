import type { AuthClient } from './auth-client';
import type { ApiClient } from '../api-client';

export class TelegramAuthClient implements AuthClient {
  constructor(private _client: ApiClient) {}

  async sendPhoneNumber(phone: string) {
    await this._client.send({ '@type': 'setAuthenticationPhoneNumber', phone_number: phone });
  }

  async sendAuthCode(code: string) {
    await this._client.send({ '@type': 'checkAuthenticationCode', code });
  }
}
