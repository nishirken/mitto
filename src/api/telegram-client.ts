// @ts-expect-error — @dibgram/tdweb has no type declarations
import TdWebModule from '@dibgram/tdweb';
const TdClient = TdWebModule.default ?? TdWebModule;
import type { ApiClient } from './api-client';

type Listener = (event: Record<string, unknown>) => void;

interface TelegramClientConfig {
  apiId: string;
  apiHash: string;
  useTestDc?: boolean;
}

export class TelegramClient implements ApiClient {
  private _config: TelegramClientConfig;
  private _client: typeof TdClient | null = null;
  private _listeners = new Map<string, Set<Listener>>();

  constructor(config: TelegramClientConfig) {
    this._config = config;
  }

  async init() {
    const { apiId, apiHash, useTestDc = false } = this._config;
    const instanceName = useTestDc ? 'mitto_test' : 'mitto';

    this._client = new TdClient({
      instanceName,
      isBackground: false,
      jsLogVerbosityLevel: 'debug',
      logVerbosityLevel: 2,
      onUpdate: (update: Record<string, unknown>) => this._handleUpdate(update),
    });

    await this.send({
      '@type': 'setTdlibParameters',
      api_id: apiId,
      api_hash: apiHash,
      database_directory: useTestDc ? '/mitto_test_db' : '/mitto_db',
      use_message_database: true,
      use_secret_chats: false,
      use_test_dc: useTestDc,
      system_language_code: navigator.language || 'en',
      device_model: 'Mitto E-Ink',
      application_version: '0.1.0',
    });
  }

  send(query: Record<string, unknown>): Promise<unknown> {
    if (!this._client) throw new Error('TDLib client not initialized');

    return this._client.send(query) as Promise<unknown>;
  }

  addEventListener(event: string, cb: Listener): void {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(cb);
  }

  removeEventListener(event: string, cb: Listener): void {
    this._listeners.get(event)?.delete(cb);
  }

  private _handleUpdate(update: Record<string, unknown>) {
    const type = update['@type'] as string;
    if (!type) return;
    const listeners = this._listeners.get(type);
    if (listeners) {
      for (const cb of listeners) {
        cb(update);
      }
    }
  }

  // --- Domain methods commented out during refactor ---
  // getChats, getChat, onAuthStateChange, onChatsChange, loadMessages,
  // onNewMessage, loadChats, sendPhoneNumber, sendAuthCode, sendPassword,
  // _setAuthState, _notifyChatsChange, _mapTdMessage, _mapTdChat, _formatTimestamp
}
