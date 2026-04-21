import { signal } from '@lit-labs/signals';
import type { TelegramClient, Api, events } from 'telegram';
import telegram from 'telegram';
import type { ChatListStore } from '../chat-list-screen/chat-list-store';

const { NewMessage } = telegram.events;

export type MessageEntry = {
  id: number;
  text: string;
  formattedDate: string;
  isOutgoing: boolean;
};

export class ChatViewStore {
  readonly messages = signal<MessageEntry[]>([]);

  private _chatId = 0;
  private readonly _newMessageEvent = new NewMessage({});

  constructor(
    private readonly _client: TelegramClient,
    private readonly _chatListStore: ChatListStore,
  ) {}

  async init(chatId: number, limit = 10) {
    this._chatId = chatId;
    let chat = this._chatListStore.getChat(chatId);

    if (!chat) {
      const entity = await this._client.getEntity(chatId);
      chat = {
        id: chatId,
        name: entityName(entity),
        lastMessage: { id: 0, text: '' },
        timestamp: '',
        unreadCount: 0,
      };
      this._chatListStore.addChat(chat);
    }

    const result = await this._client.invoke(
      new telegram.Api.messages.GetHistory({
        peer: chat.id,
        limit,
      }),
    );

    const res = result as Api.messages.Messages;
    if (res.messages) {
      const mapped = res.messages
        .filter((m): m is Api.Message => m instanceof telegram.Api.Message)
        .map(mapMessage);
      this.messages.set(mapped.sort((a, b) => a.id - b.id));
    }

    this._client.addEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  async sendMessage(text: string): Promise<void> {
    const msg = await this._client.sendMessage(this._chatId, { message: text });
    const entry = mapMessage(msg);
    this.messages.set([...this.messages.get(), entry]);
  }

  dispose(): void {
    this._client.removeEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  private _handleNewMessage = (event: events.NewMessageEvent): void => {
    const msg = event.message;
    const chatId = msg.chatId?.toJSNumber?.() ?? Number(msg.chatId);
    if (chatId !== this._chatId) return;

    const entry = mapMessage(msg);
    const current = this.messages.get();
    this.messages.set([...current, entry]);
  };
}

function entityName(entity: Api.TypeEntityLike): string {
  if (entity instanceof telegram.Api.User) {
    return [entity.firstName, entity.lastName].filter(Boolean).join(' ') || 'Unknown';
  }
  if (entity instanceof telegram.Api.Chat || entity instanceof telegram.Api.Channel) {
    return entity.title || 'Unknown';
  }

  return 'Unknown';
}

function mapMessage(msg: Api.Message): MessageEntry {
  return {
    id: msg.id,
    text: msg.message || '',
    formattedDate: msg.date ? formatTimestamp(msg.date) : '',
    isOutgoing: msg.out ?? false,
  };
}

function formatTimestamp(unix: number): string {
  const date = new Date(unix * 1000);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
