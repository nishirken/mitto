import { Chat, Message } from 'types/telegram';

export const mockChats: Chat[] = [
  { id: 1, name: 'Alice', lastMessage: 'Hey, are you coming to the meetup?', timestamp: '14:32', unreadCount: 3, avatarLetter: 'A' },
  { id: 2, name: 'Work chat', lastMessage: 'Bob: The deploy is done', timestamp: '13:15', unreadCount: 0, avatarLetter: 'W' },
  { id: 3, name: 'Mom', lastMessage: 'Call me when you can', timestamp: 'Tue', unreadCount: 1, avatarLetter: 'M' },
  { id: 4, name: 'David', lastMessage: '📷 Photo', timestamp: 'Mon', unreadCount: 0, avatarLetter: 'D' },
  { id: 5, name: 'Saved messages', lastMessage: 'Shopping list for Saturday', timestamp: 'Mar 8', unreadCount: 0, avatarLetter: 'S' },
];

export const mockMessages: Message[] = [
  { id: 1, chatId: 1, text: 'Hey, are you coming to the meetup tomorrow?', timestamp: '14:30', isOutgoing: false },
  { id: 2, chatId: 1, text: 'Yes! What time does it start?', timestamp: '14:31', isOutgoing: true },
  { id: 3, chatId: 1, text: '7pm at the usual place', timestamp: '14:32', isOutgoing: false },
  { id: 4, chatId: 1, text: 'Perfect, see you there', timestamp: '14:33', isOutgoing: true },
];
