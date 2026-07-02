import { MessageId, PeerId } from "./database-schema";

export type EventType = 'newDialogs' | 'newMessage' | 'newMessages';
export type EventData = {
  newDialogs: PeerId[];
  newMessage: { peerId: PeerId; id: MessageId };
  newMessages: { peerId: PeerId; id: MessageId }[];
};

// Notifies about database changes
export class DatabaseHub {
  // eslint-disable-next-line
  private readonly _listeners = new Map<EventType, ((data: any) => void)[]>();

  subscribe<T extends EventType, S extends EventData[T]>(eventType: T, cb: (data: S) => void): VoidFunction {
    const xs = this._listeners.get(eventType) ?? [];

    xs.push(cb);

    this._listeners.set(eventType, xs);

    return () => {
      const xs = this._listeners.get(eventType);
      if (xs?.length) {
        this._listeners.set(eventType, xs.filter(f => f !== cb));
      }
    };
  }

  unsubscribe<T extends EventType, S extends EventData[T]>(eventType: T, cb: (data: S) => void): void {
    if (this._listeners.has(eventType)) {
      this._listeners.set(eventType, this._listeners.get(eventType)!.filter(f => f !== cb));
    }
  }

  notify<T extends EventType, S extends EventData[T]>(event: T, data: S): void {
    const xs = this._listeners.get(event);
    if (!xs?.length) return;
    for (const cb of xs) {
       cb(data);
    }
  }
}
