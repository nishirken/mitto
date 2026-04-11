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
    const chat = this._chatListStore.getChat(chatId);

    if (!chat) {
      throw new Error(`No chat found for id ${chatId}`);
    }

    const result = await this._client.invoke(
      new telegram.Api.messages.GetHistory({
        peer: new telegram.Api.InputPeerChat({ chatId: chatId as unknown as Api.long }),
        offsetId: 0,
        offsetDate: 0,
        addOffset: 0,
        limit,
        maxId: 0,
        minId: 0,
        hash: 0 as unknown as Api.long,
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
