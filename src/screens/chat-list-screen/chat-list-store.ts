import { signal } from '@lit-labs/signals';
import type { ApiClient } from 'api/api-client';
import type { Chat } from 'types/telegram';

export class ChatListStore {
  readonly chats = signal<Chat[]>([]);
  private readonly _chatsMap: Map<number, Chat> = new Map(); 

  constructor(private readonly _apiClient: ApiClient) {}

  async init(limit = 50) {
    this._apiClient.addEventListener('updateNewChat', this._handleNewChat);
    this._apiClient.addEventListener('updateChatLastMessage', this._handleUpdateChatLastMessage); 
    this._apiClient.addEventListener('updateChatReadInbox', this._handleChatReadInbox); 

    await this._apiClient.send({
      '@type': 'getChats',
      chat_list: { '@type': 'chatListMain' },
      limit,
    });
  }

  dispose(): void {
    this._apiClient.removeEventListener('updateNewChat', this._handleNewChat);
    this._apiClient.removeEventListener('updateChatLastMessage', this._handleUpdateChatLastMessage);
    this._apiClient.removeEventListener('updateChatReadInbox', this._handleChatReadInbox);
  }

  private _setChat = (id: number, chat: Chat): void => {
    this._chatsMap.set(id, chat);
    this.chats.set([...this._chatsMap.values()]);
  };

  private _handleNewChat = (update: Record<string, unknown>): void => {
    const tdChat = update.chat as Record<string, unknown>;
    const chat = mapTdChat(tdChat);
    this._setChat(chat.id, chat);
  };

  // https://core.telegram.org/tdlib/docs/classtd_1_1td__api_1_1update_chat_read_inbox.html
  private _handleChatReadInbox = (update: Record<string, unknown>): void => {
    const chatId = update.chat_id as number;
    const existing = this._chatsMap.get(chatId);
    if (!existing) return;
    existing.unreadCount = (update.unread_count as number) || 0;
    this._setChat(chatId, existing);
  };

  // https://core.telegram.org/tdlib/docs/classtd_1_1td__api_1_1update_chat_last_message.html
  private _handleUpdateChatLastMessage = (update: Record<string, unknown>): void => {
      const chatId = update.chat_id as number;
      const existing = this._chatsMap.get(chatId);
      if (!existing) return;

      const lastMsg = update.last_message as Record<string, unknown> | undefined;
      if (lastMsg) {
        existing.lastMessage = extractLastMessage(lastMsg);
        if (lastMsg.date) {
          existing.timestamp = formatTimestamp(lastMsg.date as number);
        }
      }
      this._setChat(chatId, existing);
    };

    getChat(id: number): Chat | null {
      return this._chatsMap.get(id) ?? null;
    }
}

function mapTdChat(tdChat: Record<string, unknown>): Chat {
  const title = (tdChat.title as string) || 'Unknown';
  const lastMsg = tdChat.last_message as Record<string, unknown> | undefined;
  const unread = (tdChat.unread_count as number) || 0;

  const timestamp = lastMsg?.date
    ? formatTimestamp(lastMsg.date as number)
    : '';

  return {
    id: tdChat.id as number,
    name: title,
    lastMessage: lastMsg ? extractLastMessage(lastMsg) : { id: 0, text: '' },
    timestamp,
    unreadCount: unread,
  };
}

function extractLastMessage(msg: Record<string, unknown>): { id: number; text: string } {
  const id = (msg.id as number) || 0;
  const content = msg.content as Record<string, unknown> | undefined;

  if (content?.['@type'] === 'messageText') {
    const text = content.text as Record<string, unknown>;

    return { id, text: (text.text as string) || '' };
  }
  if (content?.['@type']) {
    const type = (content['@type'] as string).replace('message', '');

    return { id, text: `[${type}]` };
  }

  return { id, text: '' };
}

function formatTimestamp(unix: number): string {
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
