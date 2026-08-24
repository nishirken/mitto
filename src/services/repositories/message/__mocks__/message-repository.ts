import { vi } from 'vitest';
import type { IMessageRepository } from '../message-repository';

export class MockMessageRepository implements IMessageRepository {
  applyMessage = vi.fn(async () => {});
  applyNewMessage = vi.fn(async () => {});
  applyMessagesResponse = vi.fn(async () => {});
  updateNewMessage = vi.fn(async () => {});
}
