// @ts-expect-error — @dibgram/tdweb has no type declarations
import TdWebModule from '@dibgram/tdweb';
const TdClient = TdWebModule.default ?? TdWebModule;
import type { AuthState, Chat } from 'types/telegram';
import type { ApiClient } from './api-client';

interface TelegramClientConfig {
  apiId: string;
  apiHash: string;
  useTestDc?: boolean;
}

export class TelegramClient implements ApiClient {
  private _config: TelegramClientConfig;
  private _client: TdClient | null = null;
  private _authState: AuthState = 'loading';
  private _onAuthChange: ((state: AuthState) => void) | null = null;
  private _chats: Map<number, Chat> = new Map();
  private _onChatsChange: ((chats: Chat[]) => void) | null = null;

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

    await this._send({
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

  getChats(): Chat[] {
    return [...this._chats.values()];
  }

  getChat(id: string): Chat | undefined {
    return this._chats.get(Number(id));
  }

  onAuthStateChange(cb: (state: AuthState) => void) {
    this._onAuthChange = cb;
  }

  onChatsChange(cb: (chats: Chat[]) => void) {
    this._onChatsChange = cb;
  }

  async loadChats(limit = 50) {
    await this._send({
      '@type': 'getChats',
      chat_list: { '@type': 'chatListMain' },
      limit,
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

  private _notifyChatsChange() {
    this._onChatsChange?.(this.getChats());
  }

  private _mapTdChat(tdChat: Record<string, unknown>): Chat {
    const title = (tdChat.title as string) || 'Unknown';
    const lastMsg = tdChat.last_message as Record<string, unknown> | undefined;
    const content = lastMsg?.content as Record<string, unknown> | undefined;
    const unread = (tdChat.unread_count as number) || 0;

    let lastMessage = '';
    if (content?.['@type'] === 'messageText') {
      const text = content.text as Record<string, unknown>;
      lastMessage = (text.text as string) || '';
    } else if (content?.['@type']) {
      const type = (content['@type'] as string).replace('message', '');
      lastMessage = `[${type}]`;
    }

    const timestamp = lastMsg?.date
      ? this._formatTimestamp(lastMsg.date as number)
      : '';

    return {
      id: tdChat.id as number,
      name: title,
      lastMessage,
      timestamp,
      unreadCount: unread,
      avatarLetter: title.charAt(0).toUpperCase(),
    };
  }

  private _formatTimestamp(unix: number): string {
    const date = new Date(unix * 1000);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private _handleUpdate(update: Record<string, unknown>) {
    switch (update['@type']) {
      case 'updateAuthorizationState': {
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
        break;
      }
      case 'updateNewChat': {
        const tdChat = update.chat as Record<string, unknown>;
        this._chats.set(tdChat.id as number, this._mapTdChat(tdChat));
        this._notifyChatsChange();
        break;
      }
      case 'updateChatLastMessage': {
        const chatId = update.chat_id as number;
        const existing = this._chats.get(chatId);
        if (existing) {
          const lastMsg = update.last_message as Record<string, unknown> | undefined;
          if (lastMsg) {
            const content = lastMsg.content as Record<string, unknown> | undefined;
            if (content?.['@type'] === 'messageText') {
              const text = content.text as Record<string, unknown>;
              existing.lastMessage = (text.text as string) || '';
            } else if (content?.['@type']) {
              existing.lastMessage = `[${(content['@type'] as string).replace('message', '')}]`;
            }
            existing.timestamp = lastMsg.date
              ? this._formatTimestamp(lastMsg.date as number)
              : existing.timestamp;
          }
          this._chats.set(chatId, existing);
          this._notifyChatsChange();
        }
        break;
      }
      case 'updateChatReadInbox': {
        const chatId = update.chat_id as number;
        const existing = this._chats.get(chatId);
        if (existing) {
          existing.unreadCount = (update.unread_count as number) || 0;
          this._chats.set(chatId, existing);
          this._notifyChatsChange();
        }
        break;
      }
    }
  }

  private _send(query: Record<string, unknown>): Promise<unknown> {
    if (!this._client) throw new Error('TDLib client not initialized');

    return this._client.send(query) as Promise<unknown>;
  }
}
