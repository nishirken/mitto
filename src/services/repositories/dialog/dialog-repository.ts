import type { Api } from 'telegram';
import type { DatabaseHub } from '../../database/database-hub';
import type { IDatabase, MessageId, PeerId } from '../../database';
import { mapDialogsResponse } from './mappers';
import { mergeUser } from '../user/mappers';
import type { IMediaRepository } from '../media/media-repository';

export interface IDialogRepository {
  applyDialogsResponse(result: Api.messages.Dialogs | Api.messages.DialogsSlice): Promise<void>;
  applyReadInbox(peerId: PeerId, maxId: MessageId, stillUnreadCount: number): Promise<void>;
  applyReadOutbox(peerId: PeerId, maxId: MessageId): Promise<void>;
}

// Writes to the database
export class DialogRepository implements IDialogRepository {
  constructor(
    private readonly _storage: IDatabase,
    private readonly _hub: DatabaseHub,
    private readonly _media: IMediaRepository,
  ) {}

  async applyDialogsResponse(
    result: Api.messages.Dialogs | Api.messages.DialogsSlice,
  ): Promise<void> {
    const { users, messages, dialogs } = mapDialogsResponse(result);

    await this._media.applyMessagesMedia(result.messages);
    await this._storage.putAll(users, mergeUser, messages, dialogs);

    this._hub.notify(
      'newDialogs',
      dialogs.map((d) => d.peerId),
    );
  }

  async applyReadInbox(peerId: PeerId, maxId: MessageId, stillUnreadCount: number): Promise<void> {
    const dialog = await this._storage.getDialog(peerId);

    if (!dialog || maxId <= dialog.readInboxMaxId) return;

    await this._storage.putDialogs([
      { ...dialog, readInboxMaxId: maxId, unreadCount: stillUnreadCount },
    ]);

    this._hub.notify('dialogRead', peerId);
  }

  async applyReadOutbox(peerId: PeerId, maxId: MessageId): Promise<void> {
    const dialog = await this._storage.getDialog(peerId);

    if (!dialog || maxId <= dialog.readOutboxMaxId) return;

    await this._storage.putDialogs([{ ...dialog, readOutboxMaxId: maxId }]);

    this._hub.notify('dialogRead', peerId);
  }
}
