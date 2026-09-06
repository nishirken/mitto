import telegram, { type Api, type events, type sessions } from 'telegram';
import { signal, type Signal } from '@lit-labs/signals';

const { TelegramClient, events: Events } = telegram;

const CONNECTED = 1;

type ConnectionStateUpdate = { state: number };

/**
 * gramjs routes `UpdateConnectionState` through the ordinary event pipeline, but the class is
 * absent from the vendored bundle's exports, so `instanceof` is unavailable. Every `Api.*`
 * instance carries `CONSTRUCTOR_ID`; this update carries only `state`.
 */
function isConnectionStateUpdate(update: unknown): update is ConnectionStateUpdate {
  return (
    typeof update === 'object' &&
    update !== null &&
    'state' in update &&
    !('CONSTRUCTOR_ID' in update)
  );
}

export interface ITelegramClient {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  checkAuthorization(): Promise<boolean>;
  invoke<R extends Api.AnyRequest>(request: R, dcId?: number): Promise<R['__response']>;
  downloadFile(
    inputLocation: Api.TypeInputFileLocation,
    fileParams?: { dcId?: number },
  ): Promise<string | Uint8Array | undefined>;
  addEventHandler(
    callback: (event: events.NewMessageEvent) => void,
    event: events.NewMessage,
  ): void;
  addEventHandler(callback: (event: Api.TypeUpdate) => void, event: events.Raw): void;
  removeEventHandler(callback: CallableFunction, event: events.NewMessage | events.Raw): void;
  readonly session: { save(): string };
  readonly connected: boolean | undefined;
  readonly isConnected: Signal.State<boolean>;
}

/**
 * `connected` stays gramjs's own getter. `isConnected` is layered on top: the getter reads a
 * sender that only exists once `connect()` is under way, so a caller racing startup sees
 * `undefined` and cannot tell "not yet" from "no".
 */
export class MittoTelegramClient extends TelegramClient implements ITelegramClient {
  readonly isConnected = signal(false);

  declare readonly session: sessions.StringSession;

  private _connecting?: Promise<boolean>;
  private readonly _waiting = new Set<() => void>();
  private readonly _connectionEvent = new Events.Raw({ func: isConnectionStateUpdate });

  constructor(...args: ConstructorParameters<typeof TelegramClient>) {
    super(...args);
    this.addEventHandler(this._handleConnectionState, this._connectionEvent);
  }

  /**
   * Single-flight. gramjs guards re-entry on `_userConnected`, which only flips at the end of
   * `_connect()` — after the socket opens and, on a fresh session, after the DH handshake — so
   * two concurrent callers both pass the guard, open a socket each, and leak the loser.
   */
  async connect(): Promise<boolean> {
    this._connecting ??= super
      .connect()
      .then(() => this._syncConnected())
      .finally(() => {
        this._connecting = undefined;
      });

    return this._connecting;
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    this._setConnected(false);
  }

  /**
   * gramjs already parks every request on `_connectedDeferred` until the first connect
   * finishes — but only after reading `_sender`, which `connect()` assigns behind an
   * `await this.session.load()`. A caller arriving in that window is thrown out with
   * "You need to call .connect()" instead. `connected` is `_sender && _sender.isConnected()`,
   * so `undefined` means exactly "no sender yet" and nothing wider: a `false` is a live sender
   * that dropped, and racing `connect()` against gramjs's own auto-reconnect is what opened a
   * second socket in the first place.
   *
   * Two callers landing here together share one socket — `connect()` memoizes — and both park
   * on `_whenConnected`, which the same transition drains.
   */
  async invoke<R extends Api.AnyRequest>(request: R, dcId?: number): Promise<R['__response']> {
    if (this.connected === undefined) {
      void this.connect().catch(() => {});
      await this._whenConnected();
    }

    return super.invoke(request, dcId);
  }

  /**
   * Resolves on genuine connectivity, which is not the same as `connect()` resolving: a first
   * attempt that exhausts its retries still settles, and it is gramjs's own auto-reconnect
   * that later restores the link and emits the event this waits on.
   */
  private _whenConnected(): Promise<void> {
    if (this.isConnected.get()) return Promise.resolve();

    return new Promise((resolve) => {
      this._waiting.add(resolve);
    });
  }

  /**
   * gramjs returns false both for "retries exhausted" and for "the sender was already
   * connected", so its result cannot be forwarded. Its own getter tells the two apart.
   */
  private _syncConnected(): boolean {
    const connected = this.connected === true;
    this._setConnected(connected);

    return connected;
  }

  private _setConnected(connected: boolean): void {
    this.isConnected.set(connected);

    if (!connected) return;

    const waiting = [...this._waiting];
    this._waiting.clear();
    for (const callback of waiting) callback();
  }

  private _handleConnectionState = (update: Api.TypeUpdate): void => {
    if (!isConnectionStateUpdate(update)) return;

    this._setConnected(update.state === CONNECTED);
  };
}
