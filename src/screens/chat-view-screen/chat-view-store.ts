import { signal } from '@lit-labs/signals';
import type { TelegramClient, Api, events } from 'telegram';
import telegram from 'telegram';
import type { OfflineStorage, StoredMessage } from 'services/offline-storage';
import { Timestamp } from '../../utils/flavour';
import { ChatListStore } from '../../services/chat-list-store/chat-list-store';

const { NewMessage } = telegram.events;

export type MessageEntry = {
  id: number;
  text: string;
  date: Timestamp;
  isOutgoing: boolean;
};

export class ChatViewStore {
  readonly messages = signal<MessageEntry[]>([]);
  readonly loading = signal(false);
  readonly hasMore = signal(true);

  private _chatId = 0;
  private readonly _newMessageEvent = new NewMessage({});

  constructor(
    private readonly _client: TelegramClient,
    private readonly _chatListStore: ChatListStore,
    private readonly _storage: OfflineStorage,
  ) {}

  async init(chatId: number, limit = 10) {
    this._chatId = chatId;

    const cached = await this._storage.loadMessages(chatId);

    if (cached.length > 0) {
      this.messages.set(cached.map(toEntry));
    }

    const chat = await this._chatListStore.getChatAsync(chatId);

    const result = await this._client.invoke(
      new telegram.Api.messages.GetHistory({
        peer: chat?.id,
        limit,
      }),
    );

    const res = result as Api.messages.Messages;
    if (res.messages) {
      const mapped = res.messages
        .filter((m): m is Api.Message => m instanceof telegram.Api.Message)
        .map(mapMessage)
        .sort((a, b) => a.id - b.id);
      this.messages.set(mapped);
      void this._storage.saveMessages(mapped.map((m) => toStored(chatId, m)));
    }

    this._client.addEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  async loadMore(limit = 10): Promise<void> {
    if (this.loading.get() || !this.hasMore.get()) return;

    this.loading.set(true);
    try {
      const oldestId = this.messages.get()[0]?.id ?? 0;
      const result = await this._client.invoke(
        new telegram.Api.messages.GetHistory({
          peer: this._chatId,
          limit,
          offsetId: oldestId,
          addOffset: 0,
        }),
      );

      const res = result as Api.messages.Messages;
      if (res.messages) {
        const mapped = res.messages
          .filter((m): m is Api.Message => m instanceof telegram.Api.Message)
          .map(mapMessage)
          .sort((a, b) => a.id - b.id);
        this.messages.set([...mapped, ...this.messages.get()]);
        void this._storage.saveMessages(mapped.map((m) => toStored(this._chatId, m)));
        if (mapped.length < limit) {
          this.hasMore.set(false);
        }
      } else {
        this.hasMore.set(false);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async sendMessage(text: string): Promise<void> {
    const msg = await this._client.sendMessage(this._chatId, { message: text });
    const entry = mapMessage(msg);
    this.messages.set([...this.messages.get(), entry]);
    void this._storage.upsertMessage(toStored(this._chatId, entry));
  }

  dispose(): void {
    this._client.removeEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

  private _handleNewMessage = (event: events.NewMessageEvent): void => {
    const msg = event.message;
    const chatId = msg.chatId?.toJSNumber?.() ?? Number(msg.chatId);
    if (chatId !== this._chatId) return;

    const entry = mapMessage(msg);
    this.messages.set([...this.messages.get(), entry]);
    void this._storage.upsertMessage(toStored(this._chatId, entry));
  };
}

function mapMessage(msg: Api.Message): MessageEntry {
  return {
    id: msg.id,
    text: msg.message || '',
    date: msg.date ?? 0,
    isOutgoing: msg.out ?? false,
  };
}

function toStored(chatId: number, entry: MessageEntry): StoredMessage {
  return { chatId, id: entry.id, text: entry.text, date: entry.date, isOutgoing: entry.isOutgoing };
}

function toEntry(stored: StoredMessage): MessageEntry {
  return { id: stored.id, text: stored.text, date: stored.date, isOutgoing: stored.isOutgoing };
}
