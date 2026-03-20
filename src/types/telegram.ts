export interface Chat {
  id: number;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatarLetter: string;
}

export interface Message {
  id: number;
  chatId: number;
  text: string;
  timestamp: string;
  isOutgoing: boolean;
}

export type AuthState =
  | 'loading'
  | 'wait_phone'
  | 'wait_code'
  | 'wait_password'
  | 'ready';
