import type { AuthState, Chat } from 'types/telegram';

export interface ApiClient {
  init(): void;
  getChats(): Chat[];
  getChat(id: string): Chat | undefined;
  loadChats(): void;
  onAuthStateChange(cb: (state: AuthState) => void): void;
  onChatsChange(cb: (chats: Chat[]) => void): void;
  sendPhoneNumber(phone: string): Promise<void>;
  sendAuthCode(code: string): Promise<void>;
  sendPassword(password: string): Promise<void>;
}
