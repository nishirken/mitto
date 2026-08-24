import { vi } from 'vitest';
import telegram from 'telegram';

const { Api } = telegram;

/** Empty result so dialog sync completes as a no-op instead of throwing. */
export const emptyDialogs = new Api.messages.Dialogs({
  dialogs: [],
  messages: [],
  chats: [],
  users: [],
});

export class MockClient {
  connect = vi.fn(async () => true);
  invoke = vi.fn(async () => emptyDialogs);
  addEventHandler = vi.fn(() => {});
  removeEventHandler = vi.fn(() => {});
  checkAuthorization = vi.fn(() => {});
  sendCode = vi.fn(() => {});
  session = { save: vi.fn(() => {}) };
}
