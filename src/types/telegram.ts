export interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

export type Message = {
  id: number;
  chatId: number;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
};

export type TelegramConfig = {
  apiId: string;
  apiHash: string;
  useTestDc?: boolean;
};

