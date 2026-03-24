import { signal } from '@lit-labs/signals';
import type { ApiClient } from 'api/api-client';
import type { ChatsClient } from 'api/chats/chats-client';
import { mapTdChat } from 'api/chats/telegram-chats-client';
import type { Chat } from 'types/telegram';

export class ChatListStore {
  readonly chats = signal<Chat[]>([]);

  private _chatsMap = new Map<number, Chat>();

  constructor(
    private _apiClient: ApiClient,
    private _chatsClient: ChatsClient,
  ) {
    this._apiClient.addEventListener('updateNewChat', (update) => {
      const tdChat = update.chat as Record<string, unknown>;
      console.debug(tdChat);
      const chat = mapTdChat(tdChat);
      this._chatsMap.set(chat.id, chat);
      this._publish();
    });

    this._apiClient.addEventListener('updateChatLastMessage', (update) => {
      const chatId = update.chat_id as number;
      const existing = this._chatsMap.get(chatId);
      if (!existing) return;

      const lastMsg = update.last_message as Record<string, unknown> | undefined;
      if (lastMsg) {
        const content = lastMsg.content as Record<string, unknown> | undefined;
        if (content?.['@type'] === 'messageText') {
          const text = content.text as Record<string, unknown>;
          existing.lastMessage = (text.text as string) || '';
        } else if (content?.['@type']) {
          existing.lastMessage = `[${(content['@type'] as string).replace('message', '')}]`;
        }
        if (lastMsg.date) {
          const date = new Date((lastMsg.date as number) * 1000);
          existing.timestamp = formatTimestamp(date);
        }
      }
      this._chatsMap.set(chatId, existing);
      this._publish();
    });

    this._apiClient.addEventListener('updateChatReadInbox', (update) => {
      const chatId = update.chat_id as number;
      const existing = this._chatsMap.get(chatId);
      if (!existing) return;
      existing.unreadCount = (update.unread_count as number) || 0;
      this._chatsMap.set(chatId, existing);
      this._publish();
    });
  }

  async init(limit?: number) {
    await this._chatsClient.loadChats(limit);
  }

  private _publish() {
    this.chats.set([...this._chatsMap.values()]);
  }
}

function formatTimestamp(date: Date): string {
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
