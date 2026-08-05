import type { Api } from 'telegram';
import { DatabaseHub } from '../../database/database-hub';
import { Database } from '../../database';
import { mapDialogsResponse } from './mappers';
import { mergeUser } from '../user/mappers';
import { MediaRepository } from '../media/media-repository';

// Writes to the database
export class DialogRepository {
  constructor(
    private readonly _storage: Database,
    private readonly _hub: DatabaseHub,
    private readonly _media: MediaRepository,
  ) {}

  async applyDialogsResponse(
    result: Api.messages.Dialogs | Api.messages.DialogsSlice,
  ): Promise<void> {
    const { users, messages, dialogs } = mapDialogsResponse(result);

    await this._media.applyMessagesMedia(result.messages);
    await this._storage.putAll(users, mergeUser, messages, dialogs);

    this._hub.notify('newDialogs', dialogs.map((d) => d.peerId));
  }
}
