import { vi } from 'vitest';
import type {
  IDatabase,
  MediaId,
  PeerId,
  StoredDialog,
  StoredMedia,
  StoredMessage,
  StoredSettings,
  StoredUser,
  UserId,
} from '../';

export class MockDatabase implements IDatabase {
  readonly users = new Map<string, StoredUser>();
  readonly messages = new Map<string, StoredMessage>();
  readonly dialogs = new Map<string, StoredDialog>();
  readonly media = new Map<string, StoredMedia>();
  session: string | null = null;
  settings: StoredSettings | null = null;

  close = vi.fn(() => {});

  getSession = vi.fn(async (): Promise<string | null> => this.session);

  setSession = vi.fn(async (value: string): Promise<void> => {
    this.session = value;
  });

  clearSession = vi.fn(async (): Promise<void> => {
    this.session = null;
  });

  getSettings = vi.fn(async (): Promise<StoredSettings | null> => this.settings);

  setSettings = vi.fn(async (value: StoredSettings): Promise<void> => {
    this.settings = value;
  });

  putUsers = vi.fn(async (users: StoredUser[]): Promise<void> => {
    for (const u of users) this.users.set(u.id, u);
  });

  putMessages = vi.fn(async (msgs: StoredMessage[]): Promise<void> => {
    for (const m of msgs) this.messages.set(`${m.peerId}:${m.id}`, m);
  });

  putMedia = vi.fn(async (media: StoredMedia[]): Promise<void> => {
    for (const m of media) this.media.set(m.id, m);
  });

  putDialogs = vi.fn(async (dialogs: StoredDialog[]): Promise<void> => {
    for (const d of dialogs) this.dialogs.set(d.peerId, d);
  });

  putAll = vi.fn(
    async (
      users: StoredUser[],
      mergeUser: (x: StoredUser, y: StoredUser) => StoredUser,
      messages: StoredMessage[],
      dialogs: StoredDialog[],
    ): Promise<void> => {
      for (const u of users) {
        const existing = this.users.get(u.id);
        this.users.set(u.id, existing ? mergeUser(existing, u) : u);
      }
      await this.putMessages(messages);
      await this.putDialogs(dialogs);
    },
  );

  getUser = vi.fn(async (id: UserId): Promise<StoredUser | undefined> => this.users.get(id));

  getPeer = vi.fn(async (id: PeerId): Promise<StoredUser | undefined> => this.users.get(id));

  getUsers = vi.fn(
    async (ids: UserId[]): Promise<(StoredUser | undefined)[]> =>
      ids.map((id) => this.users.get(id)),
  );

  getMedia = vi.fn(async (id: MediaId): Promise<StoredMedia | undefined> => this.media.get(id));

  getMediaItems = vi.fn(
    async (ids: MediaId[]): Promise<StoredMedia[]> =>
      ids.map((id) => this.media.get(id)).filter((m) => !!m),
  );

  getMessage = vi.fn(
    async (peerId: PeerId, id: number): Promise<StoredMessage | undefined> =>
      this.messages.get(`${peerId}:${id}`),
  );

  loadDialogs = vi.fn(async (): Promise<StoredDialog[]> => [...this.dialogs.values()]);

  getDialog = vi.fn(
    async (peerId: PeerId): Promise<StoredDialog | undefined> => this.dialogs.get(peerId),
  );

  getDialogs = vi.fn(
    async (ids: PeerId[]): Promise<StoredDialog[]> =>
      ids.map((id) => this.dialogs.get(id)).filter((d) => !!d),
  );

  loadMessages = vi.fn(
    async (peerId: PeerId): Promise<StoredMessage[]> =>
      [...this.messages.values()].filter((m) => m.peerId === peerId),
  );

  clearCache = vi.fn(async (): Promise<void> => {
    this.users.clear();
    this.messages.clear();
    this.dialogs.clear();
    this.media.clear();
  });
}
