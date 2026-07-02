import { signal, type Signal } from '@lit-labs/signals';
import type { Api, TelegramClient, events } from 'telegram';
import telegram from 'telegram';
import { Timestamp } from '../../utils/flavour';
import { MessageId } from '../../services/database';
import { DialogRepository } from '../../services/repositories/dialog/dialog-repository';
import { toStoredMessage } from '../../services/repositories/message/mappers';
import { MessageRepository } from '../../services/repositories/message/message-repository';

const { Api: A, events: Events, utils } = telegram;

type DialogsResult = Api.messages.Dialogs | Api.messages.DialogsSlice;

type Offset = {
  date: Timestamp;
  id: MessageId;
  peer: Api.TypeInputPeer;
};

export class DialogListSyncService {
  private readonly _loading = signal(false);
  private readonly _hasMore = signal(false);
  private readonly _newMessageEvent = new Events.NewMessage({});
  private _totalCount: number = 0;
  private _offset?: Offset;

  constructor(
    private readonly _client: TelegramClient,
    private readonly _dialogRepo: DialogRepository,
    private readonly _messageRepo: MessageRepository,
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

    try {
      const result = await this._client.invoke(
        new A.messages.GetDialogs({
          limit,
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new A.InputPeerEmpty(),
        }),
      );

      if (result instanceof A.messages.Dialogs) {
        this._hasMore.set(false);
      } else if (result instanceof A.messages.DialogsSlice) {
        this._hasMore.set(true);
      } else if (result instanceof A.messages.DialogsNotModified) {
        return;
      }

      this._totalCount += result.dialogs.length;

      await this._dialogRepo.applyDialogsResponse(result);

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
        new A.messages.GetDialogs({
          limit,
          offsetDate: this._offset.date,
          offsetId: this._offset.id,
          offsetPeer: this._offset.peer,
        }),
      );

      if (result instanceof A.messages.Dialogs) {
        this._totalCount += result.dialogs.length;
        this._hasMore.set(false);
      } else if (result instanceof A.messages.DialogsSlice) {
        this._totalCount += result.dialogs.length;
        this._hasMore.set(result.dialogs.length < limit);
      } else if (result instanceof A.messages.DialogsNotModified) {
        return;
      }

      await this._dialogRepo.applyDialogsResponse(result);

      this._advanceCursor(result);
    } finally {
      this.loading.set(false);
    }
  }

  dispose(): void {
    this._client.removeEventHandler(this._handleNewMessage, this._newMessageEvent);
  }

private _resolveOffset(result: DialogsResult): Offset | undefined {
  const { dialogs } = result;

    // find a dialog with offset we can build for, continue pagination from this dialog
  for (let i = dialogs.length - 1; i >= 0; i--) {
      const dialog = dialogs[i];
      if (dialog instanceof A.DialogFolder) continue;
      const offset = this._offsetFromDialog(result, dialog);
      if (offset) return offset;
  }
  }

private _offsetFromDialog(result: DialogsResult, dialog: Api.Dialog): Offset | undefined {
  const topMessageId: MessageId = dialog.topMessage;
  const topMessage = result.messages.find((m) => m.id === topMessageId);
  if (!topMessage || topMessage instanceof A.MessageEmpty) return undefined;

  const fullPeer = findFullPeer(result, dialog.peer);
  if (!fullPeer) return undefined;

  return { date: topMessage.date, id: topMessageId, peer: utils.getInputPeer(fullPeer) };
}

  private _advanceCursor(result: DialogsResult): void {
    const offset = this._resolveOffset(result);
    if (offset) {
      this._offset = offset;
    } else {
      this._offset = undefined;
      this._hasMore.set(false);
    }
  }

  private _handleNewMessage = (event: events.NewMessageEvent): void => {
    const stored = toStoredMessage(event.message);
    if (stored) void this._messageRepo.applyNewMessage(stored);
  };
}

function findFullPeer(
  result: DialogsResult,
  peer: Api.TypePeer,
): Api.TypeUser | Api.TypeChat | undefined {
  if (peer instanceof A.PeerUser) {
    return result.users.find((u) => u.id.toString() === peer.userId.toString());
  }
  if (peer instanceof A.PeerChat) {
    return result.chats.find((c) => c.id.toString() === peer.chatId.toString());
  }

  return result.chats.find((c) => c.id.toString() === (peer as Api.PeerChannel).channelId.toString());
}
