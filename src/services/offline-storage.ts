import { openDB, type IDBPDatabase } from 'idb';
import {
  type ChatId,
  type MittoDB,
  type StoredChat,
  type StoredMessage,
} from './offline-storage-schema';

export const DB_NAME = 'mitto';
export const DB_VERSION = 1;

export type { StoredChat, StoredMessage } from './offline-storage-schema';

export class OfflineStorage {
  private constructor(private readonly _db: IDBPDatabase<MittoDB>) {}

  static async create(): Promise<OfflineStorage> {
    const db = await openDB<MittoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('meta', { keyPath: 'key' });
        db.createObjectStore('chats', { keyPath: 'id' });
        const messages = db.createObjectStore('messages', { keyPath: ['chatId', 'id'] });
        messages.createIndex('by_chat', 'chatId');
      },
    });

    return new OfflineStorage(db);
  }

  async getSession(): Promise<string | null> {
    const rec = await this._db.get('meta', 'session');

    return rec?.value ?? null;
  }

  async setSession(value: string): Promise<void> {
    await this._db.put('meta', { key: 'session', value });
  }

  async clearSession(): Promise<void> {
    await this._db.delete('meta', 'session');
  }

  async loadChats(): Promise<StoredChat[]> {
    return this._db.getAll('chats');
  }

  async saveChats(chats: StoredChat[]): Promise<void> {
    if (chats.length === 0) return;
    const tx = this._db.transaction('chats', 'readwrite');
    await Promise.all(chats.map((c) => tx.store.put(c)));
    await tx.done;
  }

  async upsertChat(chat: StoredChat): Promise<void> {
    await this._db.put('chats', chat);
  }

  async loadMessages(chatId: ChatId): Promise<StoredMessage[]> {
    const all = await this._db.getAllFromIndex('messages', 'by_chat', chatId);

    return all.sort((a, b) => a.id - b.id);
  }

  async saveMessages(msgs: StoredMessage[]): Promise<void> {
    if (msgs.length === 0) return;
    const tx = this._db.transaction('messages', 'readwrite');
    await Promise.all(msgs.map((m) => tx.store.put(m)));
    await tx.done;
  }

  async upsertMessage(msg: StoredMessage): Promise<void> {
    await this._db.put('messages', msg);
  }

  async clearCache(): Promise<void> {
    const tx = this._db.transaction(['chats', 'messages'], 'readwrite');
    await Promise.all([
      tx.objectStore('chats').clear(),
      tx.objectStore('messages').clear(),
    ]);
    await tx.done;
  }
}
