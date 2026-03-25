import { signal } from '@lit-labs/signals';
import type { ApiClient } from 'api/api-client';
import type { Message } from 'types/telegram';
import { ChatListStore } from '../chat-list-screen/chat-list-store';

export class ChatViewStore {
  readonly messages = signal<Message[]>([]);
  private readonly _messagesMap: Map<number, Message> = new Map();

  private _chatId = 0;

  constructor(private readonly _apiClient: ApiClient, private readonly _chatListStore: ChatListStore) {}

  async init(chatId: number, limit = 10) {
    this._chatId = chatId;
    const chat = this._chatListStore.getChat(chatId);

    if (!chat) {
      throw new Error(`No chat found for id ${chatId}`);
    }

    this._apiClient.addEventListener('updateNewMessage', this._handleNewMessage);
    this._apiClient.addEventListener('updateMessageContent', this._handleMessageContent);
    this._apiClient.addEventListener('updateDeleteMessages', this._handleDeleteMessages);

    //while (this._messagesMap.size < limit) {
    //  const result = (await this._apiClient.send({
    //    '@type': 'getChatHistory',
    //    chat_id: chatId,
    //    from_message_id: fromMessageId,
    //    offset: fromMessageId ? -1 : 0,
    //    limit: limit - this._messagesMap.size,
    //    only_local: false,
    //  })) as Record<string, unknown> | undefined;

    //  const tdMessages = ((result?.messages) as Record<string, unknown>[] | undefined) ?? [];
    //  if (tdMessages.length === 0) break;

    //  for (const msg of tdMessages) {
    //    const mapped = mapTdMessage(msg);
    //    this._messagesMap.set(mapped.id, mapped);
    //  }

    //  const oldest = tdMessages[tdMessages.length - 1];
    //  fromMessageId = oldest.id as number;
    //}
    const res = await this._apiClient.send({
      '@type': 'getChatHistory',
      chat_id: chatId,
      from_message_id: chat.lastMessage.id,
      limit,
    });
    if (typeof res === "object" && res !== null && 'messages' in res && Array.isArray(res.messages)) {
      this.messages.set(res.messages.map(mapTdMessage));
    }
  }

  dispose(): void {
    this._apiClient.removeEventListener('updateNewMessage', this._handleNewMessage);
    this._apiClient.removeEventListener('updateMessageContent', this._handleMessageContent);
    this._apiClient.removeEventListener('updateDeleteMessages', this._handleDeleteMessages);
  }

  private _publishMessages = (): void => {
    const sorted = [...this._messagesMap.values()]
      .sort((a, b) => a.id - b.id);
    this.messages.set(sorted);
  };

  private _handleNewMessage = (update: Record<string, unknown>): void => {
    const tdMsg = update.message as Record<string, unknown>;
    if ((tdMsg.chat_id as number) !== this._chatId) return;
    const msg = mapTdMessage(tdMsg);
    this._messagesMap.set(msg.id, msg);
    this._publishMessages();
  };

  private _handleMessageContent = (update: Record<string, unknown>): void => {
    if ((update.chat_id as number) !== this._chatId) return;
    const msgId = update.message_id as number;
    const existing = this._messagesMap.get(msgId);
    if (!existing) return;
    const content = update.new_content as Record<string, unknown>;
    existing.text = extractText(content);
    this._messagesMap.set(msgId, existing);
    this._publishMessages();
  };

  private _handleDeleteMessages = (update: Record<string, unknown>): void => {
    if ((update.chat_id as number) !== this._chatId) return;
    const ids = update.message_ids as number[];
    if (!ids) return;
    for (const id of ids) {
      this._messagesMap.delete(id);
    }
    this._publishMessages();
  };
}

function extractText(content: Record<string, unknown>): string {
  if (content?.['@type'] === 'messageText') {
    const text = content.text as Record<string, unknown>;

    return (text.text as string) || '';
  }
  if (content?.['@type']) {
    return `[${(content['@type'] as string).replace('message', '')}]`;
  }

  return '';
}

function mapTdMessage(td: Record<string, unknown>): Message {
  const content = td.content as Record<string, unknown> | undefined;
  const text = content ? extractText(content) : '';
  const timestamp = td.date ? formatTimestamp(td.date as number) : '';

  return {
    id: td.id as number,
    chatId: td.chat_id as number,
    text,
    timestamp,
    isOutgoing: (td.is_outgoing as boolean) || false,
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
