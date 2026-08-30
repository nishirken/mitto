import { vi, type Mock } from 'vitest';
import type { Api } from 'telegram';
import type { ITelegramClient } from '../telegram-client';

/**
 * Empty result so dialog sync completes as a no-op instead of throwing. Takes the `Api`
 * namespace as an argument rather than importing it: this module must stay free of a
 * runtime `telegram` import so it can be used from inside a `vi.mock('telegram')` factory.
 */
export function emptyDialogs(api: typeof Api): Api.messages.Dialogs {
  return new api.messages.Dialogs({ dialogs: [], messages: [], chats: [], users: [] });
}

export class MockClient implements ITelegramClient {
  invokeResult: unknown;
  connect = vi.fn(async () => true);
  disconnect = vi.fn(async () => {});
  invoke = vi.fn(async () => this.invokeResult) as unknown as ITelegramClient['invoke'] & Mock;
  downloadFile = vi.fn(async () => undefined);
  addEventHandler = vi.fn(() => {});
  removeEventHandler = vi.fn(() => {});
  checkAuthorization = vi.fn(async () => true);
  session = { save: vi.fn(() => '') };
}
