import type { Api, events } from 'telegram';

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
}
