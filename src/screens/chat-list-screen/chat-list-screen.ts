import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { servicesContext } from 'api/services-context';
import type { Services } from 'api/services-context';
import { navigate } from 'router';
import 'components/mk-header/mk-header';
import './chat-item';
import styles from './chat-list-screen.css?inline';

@customElement('chat-list-screen')
export class ChatListScreen extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: servicesContext, subscribe: true })
  services!: Services;

  connectedCallback() {
    super.connectedCallback();
    this.services.chatListStore.init();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.services.chatListStore.dispose();
  }

  private _onChatClick(chatId: number) {
    navigate(`chat/${chatId}`);
  }

  render() {
    const chats = this.services.chatListStore.chats.get();

    return html`
      <mk-header headline="Mitto">
        <span class="count" slot="end">${chats.length} chats</span>
      </mk-header>
      ${chats.length === 0
        ? html`<div class="empty">Loading…</div>`
        : html`
          <div class="list">
            ${chats.map(
              (chat) => html`
                <chat-item
                  .name=${chat.name}
                  .timestamp=${chat.timestamp}
                  .preview=${chat.lastMessage.text}
                  .unreadCount=${chat.unreadCount}
                  @click=${() => this._onChatClick(chat.id)}
                ></chat-item>
              `
            )}
          </div>
        `}
    `;
  }
}
