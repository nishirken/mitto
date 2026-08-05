import { openDB, type IDBPDatabase } from 'idb';
import {
    StoredPeer,
  type MediaId,
  type MetaKey,
  type MetaValue,
  type MittoDB,
  type PeerId,
  type StoredSettings,
  type StoredDialog,
  type StoredMedia,
  type StoredMessage,
  type StoredUser,
  type UserId,
} from './database-schema';
import { isUser } from '../peer-key';

export const DB_NAME = 'mitto';
export const DB_VERSION = 1;

export class Database {
  private constructor(private readonly _db: IDBPDatabase<MittoDB>) {}

  static async create(): Promise<Database> {
    const db = await openDB<MittoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('meta', { keyPath: 'key' });
        db.createObjectStore('users', { keyPath: 'id' });
        db.createObjectStore('messages', { keyPath: ['peerId', 'id'] });
        db.createObjectStore('dialogs', { keyPath: 'peerId' });
        db.createObjectStore('media', { keyPath: 'id' });
      },
    });

    return new Database(db);
  }

  /** Closes the underlying connection so the database can be deleted or reopened. */
  close(): void {
    this._db.close();
  }

  // --- meta ------------------------------------------------------------------

  private async _getMeta<K extends MetaKey>(key: K): Promise<MetaValue[K] | undefined> {
    const rec = await this._db.get('meta', key);

    return rec?.value as MetaValue[K] | undefined;
  }

  async getSession(): Promise<string | null> {
    return (await this._getMeta('session')) ?? null;
  }

  async setSession(value: string): Promise<void> {
    await this._db.put('meta', { key: 'session', value });
  }

  async clearSession(): Promise<void> {
    await this._db.delete('meta', 'session');
  }

  async getSettings(): Promise<StoredSettings | null> {
    return (await this._getMeta('settings')) ?? null;
  }

  async setSettings(value: StoredSettings): Promise<void> {
    await this._db.put('meta', { key: 'settings', value });
  }

  // --- normalized writes -----------------------------------------------------

  async putUsers(users: StoredUser[]): Promise<void> {
    if (users.length === 0) return;
    const tx = this._db.transaction('users', 'readwrite');
    await Promise.all(users.map((u) => tx.store.put(u)));
    await tx.done;
  }

  async putMessages(msgs: StoredMessage[]): Promise<void> {
    if (msgs.length === 0) return;
    const tx = this._db.transaction('messages', 'readwrite');
    await Promise.all(msgs.map((m) => tx.store.put(m)));
    await tx.done;
  }

  async putMedia(media: StoredMedia[]): Promise<void> {
    if (media.length === 0) return;
    const tx = this._db.transaction('media', 'readwrite');
    await Promise.all(media.map((m) => tx.store.put(m)));
    await tx.done;
  }

  async putDialogs(dialogs: StoredDialog[]): Promise<void> {
    if (dialogs.length === 0) return;
    const tx = this._db.transaction('dialogs', 'readwrite');
    await Promise.all(dialogs.map((d) => tx.store.put(d)));
    await tx.done;
  }

  async putAll(
    users: StoredUser[],
    mergeUser: (x: StoredUser, y: StoredUser) => StoredUser,
    messages: StoredMessage[],
    dialogs: StoredDialog[],
  ): Promise<void> {
    const tx = this._db.transaction(['users', 'messages', 'dialogs'], 'readwrite');
    await Promise.all([
      ...users.map(async (u) => {
      const existing = await tx.objectStore('users').get(u.id);

      return tx.objectStore('users').put(existing ? mergeUser(existing, u) : u);
    }),
      ...messages.map((m) => tx.objectStore('messages').put(m)),
      ...dialogs.map((d) => tx.objectStore('dialogs').put(d)),
    ]);
    await tx.done;
  }

  // --- normalized reads ------------------------------------------------------

  async getUser(id: UserId): Promise<StoredUser | undefined> {
    return this._db.get('users', id);
  }

  async getPeer(id: PeerId): Promise<StoredPeer | undefined> {
    if (isUser(id)) return this.getUser(id);
  }

  async getUsers(ids: UserId[]): Promise<(StoredUser | undefined)[]> {
    const tx = this._db.transaction('users', 'readonly');
    const result = await Promise.all(ids.map((id) => tx.store.get(id)));
    await tx.done;

    return result;
  }

  async getMedia(id: MediaId): Promise<StoredMedia | undefined> {
    return this._db.get('media', id);
  }

  async getMediaItems(ids: MediaId[]): Promise<StoredMedia[]> {
    if (ids.length === 0) return [];
    const tx = this._db.transaction('media', 'readonly');
    const result = await Promise.all(ids.map((id) => tx.store.get(id)));
    await tx.done;

    return result.filter(m => !!m) as StoredMedia[];
  }

  async getMessage(peerId: PeerId, id: number): Promise<StoredMessage | undefined> {
    return this._db.get('messages', [peerId, id]);
  }

  async loadDialogs(): Promise<StoredDialog[]> {
    return this._db.getAll('dialogs');
  }

  async getDialog(peerId: PeerId): Promise<StoredDialog | undefined> {
    return this._db.get('dialogs', peerId);
  }

  async getDialogs(ids: PeerId[]): Promise<StoredDialog[]> {
  if (ids.length === 0) return [];
  const tx = this._db.transaction('dialogs', 'readonly');
  const result = await Promise.all(ids.map((id) => tx.store.get(id)));
  await tx.done;

  return result.filter(d => !!d) as StoredDialog[];
  }

  async loadMessages(peerId: PeerId): Promise<StoredMessage[]> {
    return this._db.getAll('messages', IDBKeyRange.bound([peerId], [peerId, []]));
  }

  async clearCache(): Promise<void> {
    const stores = ['users', 'messages', 'dialogs', 'media'] as const;
    const tx = this._db.transaction(stores, 'readwrite');
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }
}
