import type { ITelegramClient } from '../../api/telegram-client';
import type { Database, MediaId, StoredMedia } from '../database';
import { toInputLocation } from './input-location';

const PHOTO_MIME = 'image/jpeg';

// Downloads media files on demand and hands out object URLs, kept in memory only
export interface IMediaFileService {
  url(id: MediaId): Promise<string | null>;
  dispose(): void;
}

export class MediaFileService implements IMediaFileService {
  private readonly _urls = new Map<MediaId, string>();
  private readonly _pending = new Map<MediaId, Promise<string | null>>();

  constructor(
    private readonly _client: ITelegramClient,
    private readonly _storage: Database,
  ) {}

  async url(id: MediaId): Promise<string | null> {
    const ready = this._urls.get(id);
    if (ready) return ready;

    const pending = this._pending.get(id);
    if (pending) return pending;

    const download = this._download(id).finally(() => this._pending.delete(id));
    this._pending.set(id, download);

    return download;
  }

  dispose(): void {
    for (const url of this._urls.values()) URL.revokeObjectURL(url);
    this._urls.clear();
    this._pending.clear();
  }

  private async _download(id: MediaId): Promise<string | null> {
    const media = await this._storage.media.get(id);
    if (!media) return null;

    const location = toInputLocation(media);
    if (!location) return null;

    const bytes = await this._client.downloadFile(location, { dcId: media.dcId });
    if (!(bytes instanceof Uint8Array)) return null;

    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mimeType(media) }));
    this._urls.set(id, url);

    return url;
  }
}

function mimeType(media: StoredMedia): string {
  return media.type === 'photo' ? PHOTO_MIME : (media.mimeType ?? '');
}
