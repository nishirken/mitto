// @ts-expect-error — @dibgram/tdweb has no type declarations
import TdWebModule from '@dibgram/tdweb';
const TdClient = TdWebModule.default ?? TdWebModule;
import type { ApiClient } from './api-client';

type Listener = (event: Record<string, unknown>) => void;

export class TelegramApiClient implements ApiClient {
  private readonly _client: typeof TdClient;
  private readonly _listeners = new Map<string, Set<Listener>>();

  constructor() {
    this._client = new TdClient({
      instanceName: 'mitto',
      isBackground: false,
      jsLogVerbosityLevel: 'debug',
      logVerbosityLevel: 2,
      onUpdate: (update: Record<string, unknown>) => this._handleUpdate(update),
    });
  }

  send(query: Record<string, unknown>): Promise<unknown> {
    if (!this._client) throw new Error('TDLib client not initialized');

    return this._client.send(query) as Promise<unknown>;
  }

  addEventListener(event: string, cb: Listener): void {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(cb);
  }

  removeEventListener(event: string, cb: Listener): void {
    this._listeners.get(event)?.delete(cb);
  }

  private _handleUpdate(update: Record<string, unknown>) {
    const type = update['@type'] as string;
    if (!type) return;
    const listeners = this._listeners.get(type);
    if (listeners) {
      for (const cb of listeners) {
        cb(update);
      }
    }
  }
}
