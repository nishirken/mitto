import { signal, type Signal } from '@lit-labs/signals';
import type { Api, TelegramClient, events } from 'telegram';
import telegram from 'telegram';
import { Timestamp } from '../../utils/flavour';
import { Database, MessageId, PeerId } from '../../services/database';
import { toInputPeer } from '../../services/peer-key';
import { MessageRepository } from '../../services/repositories/message/message-repository';

const { Api: A, events: Events } = telegram;

type MessagesResult = Api.messages.Messages | Api.messages.MessagesSlice;

type Offset = {
  date: Timestamp;
  id: MessageId;
  peer: Api.TypeInputPeer;
};

export class DialogSyncService {
  private readonly _loading = signal(false);
  private readonly _hasMore = signal(false);
  private readonly _newMessageEvent = new Events.NewMessage({});
  private _totalCount: number = 0;
  private _peer?: Api.TypeInputPeer;
  private _offset?: Offset;

  constructor(
    private readonly _client: TelegramClient,
    private readonly _repo: MessageRepository,
    private readonly _db: Database,
    private readonly _peerId: PeerId,
  ) {}

  get loading(): Signal.State<boolean> {
    return this._loading;
  }

  get hasMore(): Signal.State<boolean> {
    return this._hasMore;
  }

  async loadInitial(limit = 20): Promise<void> {
    this._client.addEventHandler(this._handleNewMessage, this._newMessageEvent);
    this._loading.set(true);

    const peer = await this._db.getPeer(this._peerId);

    if (!peer) {
      return;
    }

    this._peer = toInputPeer(peer);

    try {
      const result = await this._client.invoke(
        new A.messages.GetHistory({
          peer: this._peer,
          limit,
        }),
      );

      if (result instanceof A.messages.Messages) {
        this._hasMore.set(false);
      } else if (result instanceof A.messages.MessagesSlice) {
        this._hasMore.set(true);
      } else {
        return;
      }

      this._totalCount += result.messages.length;

      await this._repo.applyMessagesResponse(result);

      this._advanceCursor(result);
    } catch (e) {
      console.error(e);
    } finally {
      this._loading.set(false);
    }
  }

  async loadMore(limit = 20): Promise<void> {
    if (this.loading.get() || !this._offset) return;

    this.loading.set(true);

    try {
      const result = await this._client.invoke(
        new A.messages.GetHistory({
          limit,
          offsetDate: this._offset.date,
          offsetId: this._offset.id,
          peer: this._offset.peer, 
        })
      );

      if (result instanceof A.messages.Messages) {
        this._totalCount += result.messages.length;
        this._hasMore.set(false);
      } else if (result instanceof A.messages.MessagesSlice) {
        this._totalCount += result.messages.length;
        this._hasMore.set(result.messages.length < limit);
      } else {
        return;
      }

      await this._repo.applyMessagesResponse(result);

      this._advanceCursor(result);
    } finally {
      this.loading.set(false);
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this._peerId) return;

    const result = await this._client.invoke(
      new A.messages.SendMessage({ message, peer: this._peer }),
    );

    if (result instanceof A.UpdateShortMessage || result instanceof A.UpdateShortSentMessage) {
      await this._repo.applyNewMessage({
        id: result.id,
        peerId: this._peerId!,
        text: message,
        date: result.date,
        isOutgoing: true,
      });
    }

    if (result instanceof A.UpdateShort && result.update instanceof A.UpdateNewMessage) {
      await this._repo.updateNewMessage(result.update);
    }

    if (result instanceof A.Updates) {
      for (const update of result.updates) {
        if (update instanceof A.UpdateNewMessage) {
          await this._repo.updateNewMessage(update);
        }
      }
    }
  }

  dispose(): void {
    this._client.removeEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

private _resolveOffset(result: MessagesResult): Offset | undefined {
  if (!this._peer) return;
  const { messages } = result;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message instanceof A.MessageEmpty || message instanceof A.MessageService) {
        continue;
      }
      this._offset = {
        id: message.id,
        date: message.date,
        peer: this._peer,
      };
    }
  }

  private _advanceCursor(result: MessagesResult): void {
    const offset = this._resolveOffset(result);
    if (offset) {
      this._offset = offset;
    } else {
      this._offset = undefined;
      this._hasMore.set(false);
    }
  }

  private _handleNewMessage = (event: events.NewMessageEvent): void => {
    void this._repo.applyMessage(event.message);
  };
}

