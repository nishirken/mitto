import type { ChatsClient } from './chats-client';
import type { ApiClient } from '../api-client';
import type { Chat } from 'types/telegram';

export class TelegramChatsClient implements ChatsClient {
  constructor(private _client: ApiClient) {}

  async loadChats(limit = 50) {
    await this._client.send({
      '@type': 'getChats',
      chat_list: { '@type': 'chatListMain' },
      limit,
    });
  }

  async getChat(id: number): Promise<Chat | undefined> {
    const result = await this._client.send({
      '@type': 'getChat',
      chat_id: id,
    }) as Record<string, unknown> | undefined;

    if (!result) return undefined;

    return mapTdChat(result);
  }
}

export function mapTdChat(tdChat: Record<string, unknown>): Chat {
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
    ? formatTimestamp(lastMsg.date as number)
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
