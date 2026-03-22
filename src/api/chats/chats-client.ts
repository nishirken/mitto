import type { Chat } from 'types/telegram';

export interface ChatsClient {
  loadChats(limit?: number): Promise<void>;
  getChat(id: number): Promise<Chat | undefined>;
}
