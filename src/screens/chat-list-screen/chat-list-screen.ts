import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { navigate } from 'router';
import { ChatListStore } from './chat-list-store';
import styles from './chat-list-screen.css?inline';
import './chat-item';

@customElement('chat-list-screen')
export class ChatListScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;

  private _store?: ChatListStore;

  connectedCallback() {
    super.connectedCallback();
    this._store = new ChatListStore(this.services.apiClient, this.services.chatsClient);
    this._store.loadChats();
  }

  private _onChatClick(chatId: number) {
    navigate(`chat/${chatId}`);
  }

  render() {
    const chats = this._store?.chats.get() ?? [];

    return html`
      <div class="header">
        <span class="title">Telegram</span>
        <span class="count">${chats.length} chats</span>
      </div>
      ${chats.map(
        (chat) => html`
          <chat-item
            .avatarLetter=${chat.avatarLetter}
            .name=${chat.name}
            .timestamp=${chat.timestamp}
            .preview=${chat.lastMessage}
            .unreadCount=${chat.unreadCount}
            @click=${() => this._onChatClick(chat.id)}
          ></chat-item>
        `
      )}
    `;
  }
}
