import { vi } from 'vitest';
import { signal } from '@lit-labs/signals';
import type { MessageEntry } from '../chat-view-store';

export const mockMessages = signal<MessageEntry[]>([]);
export const mockInit = vi.fn<(chatId: number) => Promise<void>>(async () => {});
export const mockSendMessage = vi.fn<(text: string) => Promise<void>>(async () => {});
export const mockDispose = vi.fn<() => void>();
export const mockLoadMore = vi.fn<(limit?: number) => Promise<void>>(async () => {});
export const mockLoading = signal(false);
export const mockHasMore = signal(true);

export class ChatViewStore {
  readonly messages = mockMessages;
  readonly loading = mockLoading;
  readonly hasMore = mockHasMore;
  init = mockInit;
  sendMessage = mockSendMessage;
  dispose = mockDispose;
  loadMore = mockLoadMore;
}
