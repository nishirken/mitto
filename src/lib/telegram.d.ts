declare module 'telegram' {
  export class EventBuilder {}

  export namespace sessions {
    class StringSession {
      constructor(session?: string);
      save(): string;
    }
  }

  export namespace Api {
    class Request<R> {
      readonly __phantom?: R;
    }

    type long = number;

    class InputPeerEmpty {}

    class InputPeerChat {
      constructor(params: { chatId: long });
    }

    class PeerUser {
      userId: { toJSNumber(): number };
    }

    class PeerChat {
      chatId: { toJSNumber(): number };
    }

    class PeerChannel {
      channelId: { toJSNumber(): number };
    }

    type TypePeer = PeerUser | PeerChat | PeerChannel;

    class User {
      id: { toString(): string };
      firstName?: string;
      lastName?: string;
    }

    class Chat {
      id: { toString(): string };
      title?: string;
    }

    class Channel {
      id: { toString(): string };
      title?: string;
    }

    class Dialog {
      peer: TypePeer;
      topMessage: number;
      unreadCount: number;
    }

    class Message {
      id: number;
      message: string;
      date: number;
      out?: boolean;
      chatId?: { toJSNumber(): number };
    }

    class MessageService {}

    class MessageEmpty {}

    namespace auth {
      class SentCode {
        phoneCodeHash: string;
        type: SentCodeTypeApp | unknown;
      }

      class SentCodeSuccess {
        authorization: unknown;
      }

      class SentCodeTypeApp {}

      class SignIn extends Request<Authorization> {
        constructor(params: {
          phoneNumber: string;
          phoneCodeHash: string;
          phoneCode: string;
        });
      }

      class Authorization {}

      class ResendCode extends Request<SentCode | SentCodeSuccess> {
        constructor(params: {
          phoneNumber: string;
          phoneCodeHash: string;
        });
      }

      class LogOut extends Request<unknown> {}
    }

    namespace messages {
      class GetDialogs extends Request<Dialogs | DialogsSlice | DialogsNotModified> {
        constructor(params: {
          offsetDate: number;
          offsetId: number;
          offsetPeer: InputPeerEmpty | unknown;
          limit: number;
          hash: long;
        });
      }

      class Dialogs {
        dialogs: (Dialog | unknown)[];
        messages: (Message | MessageService | MessageEmpty)[];
        chats: (Chat | Channel)[];
        users: User[];
      }

      class DialogsSlice {
        count: number;
        dialogs: (Dialog | unknown)[];
        messages: (Message | MessageService | MessageEmpty)[];
        chats: (Chat | Channel)[];
        users: User[];
      }

      class DialogsNotModified {
        count: number;
      }

      class GetHistory extends Request<Messages | MessagesSlice | ChannelMessages | MessagesNotModified> {
        constructor(params: {
          peer: InputPeerChat | unknown;
          offsetId: number;
          offsetDate: number;
          addOffset: number;
          limit: number;
          maxId: number;
          minId: number;
          hash: long;
        });
      }

      class Messages {
        messages: (Message | MessageService | MessageEmpty)[];
        chats: (Chat | Channel)[];
        users: User[];
      }

      class MessagesSlice {
        count: number;
        messages: (Message | MessageService | MessageEmpty)[];
        chats: (Chat | Channel)[];
        users: User[];
      }

      class ChannelMessages {
        messages: (Message | MessageService | MessageEmpty)[];
        chats: (Chat | Channel)[];
        users: User[];
      }

      class MessagesNotModified {
        count: number;
      }
    }
  }

  export namespace events {
    class NewMessage extends EventBuilder {
      constructor(params: Record<string, unknown>);
    }

    interface NewMessageEvent {
      message: Api.Message;
    }
  }

  export class TelegramClient {
    constructor(
      session: sessions.StringSession,
      apiId: number,
      apiHash: string,
      options?: {
        connectionRetries?: number;
        testServers?: boolean;
      },
    );

    session: { save(): string };

    connect(): Promise<void>;
    checkAuthorization(): Promise<boolean>;
    sendCode(
      apiCredentials: { apiId: number; apiHash: string },
      phoneNumber: string,
      forceSMS?: boolean,
    ): Promise<Api.auth.SentCode | Api.auth.SentCodeSuccess>;
    invoke<R>(request: Api.Request<R>): Promise<R>;
    addEventHandler(callback: CallableFunction, event: EventBuilder): void;
    removeEventHandler(callback: CallableFunction, event: EventBuilder): void;
  }
}
