import { signal, type Signal } from '@lit-labs/signals';
import type { ITelegramClient } from '../../api/telegram-client';
import telegram, { type Api } from 'telegram';
import type { TelegramConfig } from 'types/telegram';
import type { Database } from 'services/database';

export type CodeType = 'app' | 'sms' | 'call' | 'fragment' | 'word' | 'phrase' | 'unknown';

export type NextType = 'sms' | 'call' | 'fragment';

export type WaitCodeState = {
  type: 'wait_code';
  codeType: CodeType;
  codeLength: number | null;
  nextType: NextType | null;
  beginning: string | null;
  fragmentUrl: string | null;
};

export type WaitPasswordState = {
  type: 'wait_password';
  hint: string | null;
};

export type AuthState =
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'wait_phone' }
  | WaitCodeState
  | WaitPasswordState
  | { type: 'ready' };

export interface IAuthStore {
  readonly state: Signal.State<AuthState>;
  checkAuthorization(): Promise<void>;
  sendCode(phone: string): Promise<void>;
  signIn(code: string): Promise<void>;
  checkPassword(password: string): Promise<void>;
  resendCode(): Promise<void>;
  logout(): Promise<boolean>;
}

function errorMessageOf(e: unknown): string | null {
  return e && typeof e === 'object' && 'errorMessage' in e
    ? String((e as Record<string, unknown>).errorMessage)
    : null;
}

function toCodeType(type: Api.auth.TypeSentCodeType): CodeType {
  const { auth } = telegram.Api;

  if (type instanceof auth.SentCodeTypeApp) return 'app';
  if (type instanceof auth.SentCodeTypeSms) return 'sms';
  if (type instanceof auth.SentCodeTypeCall) return 'call';
  if (type instanceof auth.SentCodeTypeFragmentSms) return 'fragment';
  if (type instanceof auth.SentCodeTypeSmsWord) return 'word';
  if (type instanceof auth.SentCodeTypeSmsPhrase) return 'phrase';

  return 'unknown';
}

function toCodeLength(type: Api.auth.TypeSentCodeType): number | null {
  return 'length' in type && typeof type.length === 'number' ? type.length : null;
}

function toBeginning(type: Api.auth.TypeSentCodeType): string | null {
  return 'beginning' in type ? (type.beginning ?? null) : null;
}

function toFragmentUrl(type: Api.auth.TypeSentCodeType): string | null {
  return type instanceof telegram.Api.auth.SentCodeTypeFragmentSms ? type.url : null;
}

function toNextType(type?: Api.auth.TypeCodeType): NextType | null {
  const { auth } = telegram.Api;

  if (type instanceof auth.CodeTypeSms) return 'sms';
  if (type instanceof auth.CodeTypeCall) return 'call';
  if (type instanceof auth.CodeTypeFragmentSms) return 'fragment';

  return null;
}

export class TelegramAuthStore implements IAuthStore {
  readonly state = signal<AuthState>({ type: 'loading' });

  private _phoneNumber = '';
  private _phoneCodeHash = '';

  constructor(
    private readonly _config: TelegramConfig,
    private readonly _client: ITelegramClient,
    private readonly _storage: Database,
    session: string | null,
  ) {
    this.state.set({ type: session === null ? 'wait_phone' : 'ready' });
  }

  /**
   * GramJS auto-reconnect doesn't re-send InitConnection, and its built-in
   * CONNECTION_NOT_INITED retry is broken (checks e.message instead of
   * e.errorMessage). This wrapper handles it by reconnecting and retrying.
   */
  private async _invoke<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e: unknown) {
      if (errorMessageOf(e) === 'CONNECTION_NOT_INITED') {
        await this._client.disconnect();
        await this._client.connect();

        return await fn();
      }
      throw e;
    }
  }

  async checkAuthorization(): Promise<void> {
    try {
      const authorized = await this._client.checkAuthorization();
      this.state.set({ type: authorized ? 'ready' : 'wait_phone' });
    } catch {
      this.state.set({ type: 'error' });
    }
  }

  async sendCode(phone: string): Promise<void> {
    this._phoneNumber = phone;

    const { apiId, apiHash } = this._config;
    const result = await this._invoke(() =>
      this._client.invoke(
        new telegram.Api.auth.SendCode({
          phoneNumber: phone,
          apiId,
          apiHash,
          settings: new telegram.Api.CodeSettings({}),
        }),
      ),
    );

    await this._applySentCode(result);
  }

  private async _applySentCode(result: Api.auth.TypeSentCode): Promise<void> {
    if (result instanceof telegram.Api.auth.SentCodeSuccess) {
      await this._saveSession();

      return;
    }

    this._phoneCodeHash = result.phoneCodeHash;
    this.state.set({
      type: 'wait_code',
      codeType: toCodeType(result.type),
      codeLength: toCodeLength(result.type),
      nextType: toNextType(result.nextType),
      beginning: toBeginning(result.type),
      fragmentUrl: toFragmentUrl(result.type),
    });
  }

  private async _saveSession(): Promise<void> {
    const sessionString = this._client.session.save();
    await this._storage.setSession(sessionString);
    this.state.set({ type: 'ready' });
  }

  async signIn(code: string): Promise<void> {
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

      await this._saveSession();
    } catch (e: unknown) {
      if (errorMessageOf(e) === 'SESSION_PASSWORD_NEEDED') {
        this.state.set({ type: 'wait_password', hint: await this._passwordHint() });
      } else {
        throw e;
      }
    }
  }

  private async _getPassword(): Promise<Api.account.Password> {
    return await this._invoke(() => this._client.invoke(new telegram.Api.account.GetPassword()));
  }

  private async _passwordHint(): Promise<string | null> {
    try {
      const password = await this._getPassword();

      return password.hint ?? null;
    } catch {
      return null;
    }
  }

  async checkPassword(password: string): Promise<void> {
    const current = await this._getPassword();
    const srp = await telegram.password.computeCheck(current, password);

    try {
      const result = await this._invoke(() =>
        this._client.invoke(new telegram.Api.auth.CheckPassword({ password: srp })),
      );

      if (result instanceof telegram.Api.auth.AuthorizationSignUpRequired) {
        throw new Error('Please create a Telegram account using an official client first');
      }
    } catch (e: unknown) {
      if (errorMessageOf(e) === 'PASSWORD_HASH_INVALID') {
        throw new Error('Incorrect password');
      }
      throw e;
    }

    await this._saveSession();
  }

  async resendCode(): Promise<void> {
    const result = await this._invoke(() =>
      this._client.invoke(
        new telegram.Api.auth.ResendCode({
          phoneNumber: this._phoneNumber,
          phoneCodeHash: this._phoneCodeHash,
        }),
      ),
    );

    await this._applySentCode(result);
  }

  /**
   * Revokes the authorization server-side, then drops everything held locally. Resolves
   * false and leaves the session untouched when the request fails, so a device that
   * can't reach Telegram stays signed in rather than keeping a live authorization the
   * user believes is gone.
   *
   * The caller is expected to reload the app on success: `auth.logOut` invalidates the
   * auth key, and gramjs ignores the resulting AUTH_KEY_UNREGISTERED on the main sender,
   * so this client instance can no longer be used to sign back in.
   */
  async logout(): Promise<boolean> {
    try {
      await this._invoke(() => this._client.invoke(new telegram.Api.auth.LogOut()));
    } catch {
      this.state.set({ type: 'error' });

      return false;
    }

    await this._storage.clearSession();
    await this._storage.clearCache();
    this.state.set({ type: 'wait_phone' });

    return true;
  }
}
